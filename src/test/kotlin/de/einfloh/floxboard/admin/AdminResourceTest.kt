package de.einfloh.floxboard.admin

import de.einfloh.floxboard.admin.api.AssignLicenseRequest
import de.einfloh.floxboard.license.domain.LicensePlan
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.hamcrest.CoreMatchers.`is`
import org.hamcrest.CoreMatchers.notNullValue
import org.hamcrest.Matchers.greaterThanOrEqualTo
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.temporal.ChronoUnit

@QuarkusTest
class AdminResourceTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @Test
    fun testAdminCanSearchUsersAndAssignLicense() {
        val adminToken = keycloakUserProvider.getAccessToken("admin@floxboard.io", "admin")
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        // 1. Admin searches users
        val users = given()
            .auth().oauth2(adminToken)
            .`when`().get("/api/v1/admin/users?query=alice")
            .then()
            .statusCode(200)
            .body("size()", greaterThanOrEqualTo(1))
            .body("[0].email", `is`("alice@floxboard.io"))
            .extract().jsonPath().getList<Map<String, Any>>("$")

        val aliceId = users.first { it["email"] == "alice@floxboard.io" }["id"] as String

        // 2. Admin assigns PRO license to Alice for 30 days
        val expireDate = Instant.now().plus(30, ChronoUnit.DAYS)
        val assignReq = AssignLicenseRequest(
            plan = LicensePlan.PRO,
            validUntil = expireDate
        )

        given()
            .auth().oauth2(adminToken)
            .contentType(ContentType.JSON)
            .body(assignReq)
            .`when`().post("/api/v1/admin/users/$aliceId/license")
            .then()
            .statusCode(200)
            .body("plan", `is`("PRO"))
            .body("entitlements.plan", `is`("PRO"))
            .body("entitlements.features.'whiteboard:export:pdf'", `is`(true))
            .body("entitlements.status", `is`("ACTIVE"))

        // 3. Alice verifies her license status reflects PRO
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/license/status")
            .then()
            .statusCode(200)
            .body("plan", `is`("PRO"))
            .body("features.'whiteboard:export:pdf'", `is`(true))

        // 4. Admin assigns ENTERPRISE license to Alice
        val enterpriseReq = AssignLicenseRequest(
            plan = LicensePlan.ENTERPRISE
        )

        given()
            .auth().oauth2(adminToken)
            .contentType(ContentType.JSON)
            .body(enterpriseReq)
            .`when`().post("/api/v1/admin/users/$aliceId/license")
            .then()
            .statusCode(200)
            .body("plan", `is`("ENTERPRISE"))
            .body("entitlements.plan", `is`("ENTERPRISE"))
            .body("entitlements.features.'workspace:audit_logs'", `is`(true))

        // 5. Admin revokes Alice's license (resets to FREE)
        given()
            .auth().oauth2(adminToken)
            .`when`().delete("/api/v1/admin/users/$aliceId/license")
            .then()
            .statusCode(200)
            .body("entitlements.plan", `is`("FREE"))

        // 6. Alice verifies status is back to FREE
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/license/status")
            .then()
            .statusCode(200)
            .body("plan", `is`("FREE"))
            .body("features.'whiteboard:export:pdf'", `is`(false))
    }

    @Test
    fun testNonAdminCannotAccessAdminEndpoints() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")

        // Alice (non-admin) gets 403 Forbidden
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/admin/users")
            .then()
            .statusCode(403)

        // Bob (non-admin) gets 403 Forbidden
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/admin/users")
            .then()
            .statusCode(403)

        // Unauthenticated gets 401 Unauthorized
        given()
            .`when`().get("/api/v1/admin/users")
            .then()
            .statusCode(401)
    }

    @Test
    fun testAdminGetPlans() {
        val adminToken = keycloakUserProvider.getAccessToken("admin@floxboard.io", "admin")

        given()
            .auth().oauth2(adminToken)
            .`when`().get("/api/v1/admin/plans")
            .then()
            .statusCode(200)
            .body("PRO", notNullValue())
            .body("ENTERPRISE", notNullValue())
    }
}
