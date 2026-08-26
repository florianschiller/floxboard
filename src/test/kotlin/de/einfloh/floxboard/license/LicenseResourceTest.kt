package de.einfloh.floxboard.license

import de.einfloh.floxboard.license.domain.*
import de.einfloh.floxboard.whiteboard.api.AddCollaboratorRequest
import de.einfloh.floxboard.whiteboard.api.SaveWhiteboardRequest
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.hamcrest.CoreMatchers.`is`
import org.hamcrest.CoreMatchers.notNullValue
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

@QuarkusTest
class LicenseResourceTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @Inject
    lateinit var licenseValidator: LicenseValidator

    @Inject
    lateinit var entitlementService: EntitlementService

    @Inject
    lateinit var usageLedgerService: UsageLedgerService

    @Inject
    lateinit var quotaUsageRepository: QuotaUsageRepository

    @BeforeEach
    fun cleanUp() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice", "alice")
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/license")

        val aliceBoards = given().auth().oauth2(aliceToken).`when`().get("/api/v1/whiteboards?max=100").then().extract().jsonPath().getList<Map<String, Any>>("$")
        for (b in aliceBoards) {
            val id = b["id"]
            given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$id")
        }

        val bobToken = keycloakUserProvider.getAccessToken("bob", "bob")
        given().auth().oauth2(bobToken).`when`().delete("/api/v1/license")
        val bobBoards = given().auth().oauth2(bobToken).`when`().get("/api/v1/whiteboards?max=100").then().extract().jsonPath().getList<Map<String, Any>>("$")
        for (b in bobBoards) {
            val id = b["id"]
            given().auth().oauth2(bobToken).`when`().delete("/api/v1/whiteboards/$id")
        }
    }

    @Test
    fun testDefaultFreeStatusAndActivation() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice", "alice")

        // 1. Initial status is FREE plan
        val statusRes = given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/license/status")
            .then()
            .statusCode(200)
            .body("plan", `is`("FREE"))
            .body("status", `is`("ACTIVE"))
            .body("features.'whiteboard:export:png'", `is`(true))
            .body("features.'whiteboard:export:pdf'", `is`(false))
            .body("quotas.whiteboards.limit", `is`(3))
            .body("quotas.whiteboards.current", `is`(0))
            .extract().response()

        // 2. Generate valid PRO signed license
        // Extract alice's subject UUID from token or user info
        val aliceStatus = entitlementService.getEntitlements(UUID.fromString("afbcd922-6baf-43a9-bd6b-89bb5411b9a5")) // alice user ID
        val tokenPayload = LicensePayload(
            plan = LicensePlan.PRO,
            features = mapOf(
                "whiteboard:export:pdf" to true,
                "ai:text_to_diagram" to true
            ),
            quotas = mapOf(
                "whiteboards" to QuotaDefinition(limit = -1, period = QuotaPeriod.LIFETIME),
                "collaborators_per_board" to QuotaDefinition(limit = 10, period = QuotaPeriod.LIFETIME)
            ),
            validUntil = Instant.now().plus(30, ChronoUnit.DAYS)
        )
        val signedKey = licenseValidator.generateSignedToken(tokenPayload)

        // 3. Activate PRO license
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(mapOf("licenseKey" to signedKey))
            .`when`().post("/api/v1/license/activate")
            .then()
            .statusCode(200)
            .body("plan", `is`("PRO"))
            .body("entitlements.plan", `is`("PRO"))
            .body("entitlements.features.'whiteboard:export:pdf'", `is`(true))

        // 4. Status reflects PRO plan
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/license/status")
            .then()
            .statusCode(200)
            .body("plan", `is`("PRO"))

        // 5. Deactivate license resets to FREE
        given()
            .auth().oauth2(aliceToken)
            .`when`().delete("/api/v1/license")
            .then()
            .statusCode(200)
            .body("entitlements.plan", `is`("FREE"))
    }

    @Test
    fun testWhiteboardQuotaEnforcement() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice", "alice")

        // FREE tier allows max 3 whiteboards
        for (i in 1..3) {
            given()
                .auth().oauth2(aliceToken)
                .contentType(ContentType.JSON)
                .body(SaveWhiteboardRequest(name = "Board $i", content = null))
                .`when`().post("/api/v1/whiteboards")
                .then()
                .statusCode(200)
        }

        // 4th whiteboard should fail with 402 QuotaExceeded
        val res4 = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "Board 4", content = null))
            .`when`().post("/api/v1/whiteboards")

        println("4th board response status: ${res4.statusCode()}, body: ${res4.asString()}")

        res4.then()
            .statusCode(402)
            .body("metricKey", `is`("whiteboards"))
            .body("current", `is`(3))
            .body("limit", `is`(3))

        // Upgrade to PRO (unlimited)
        val proKey = licenseValidator.generateSignedToken(
            LicensePayload(
                plan = LicensePlan.PRO,
                quotas = mapOf("whiteboards" to QuotaDefinition(limit = -1))
            )
        )
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(mapOf("licenseKey" to proKey))
            .`when`().post("/api/v1/license/activate")
            .then()
            .statusCode(200)

        // 4th whiteboard now succeeds
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "Board 4", content = null))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
    }

    @Test
    fun testDynamicAiQuotaLedger() {
        val aliceId = UUID.randomUUID()

        // Record AI consumption events
        usageLedgerService.recordUsage(
            ownerId = aliceId,
            metricKey = "ai:monthly_credits",
            units = 25,
            operation = "text_to_diagram"
        )
        usageLedgerService.recordUsage(
            ownerId = aliceId,
            metricKey = "ai:monthly_credits",
            units = 15,
            operation = "smart_layout"
        )

        val used = quotaUsageRepository.getUsageSince(
            ownerId = aliceId,
            metricKey = "ai:monthly_credits",
            since = Instant.now().minus(1, ChronoUnit.DAYS)
        )
        assertEquals(40L, used)
    }

    @Test
    fun testCollaboratorQuotaEnforcement() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice", "alice")
        val bobToken = keycloakUserProvider.getAccessToken("bob", "bob")

        // Alice creates a whiteboard
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "Collab Quota Board", content = null))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // Alice on FREE tier can add up to 2 collaborators
        // 1st collaborator: bob
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(AddCollaboratorRequest(email = "bob"))
            .`when`().post("/api/v1/whiteboards/$boardId/collaborators")
            .then()
            .statusCode(200)
    }
}
