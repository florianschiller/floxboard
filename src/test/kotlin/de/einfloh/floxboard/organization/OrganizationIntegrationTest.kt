package de.einfloh.floxboard.organization

import de.einfloh.floxboard.license.domain.LicensePlan
import de.einfloh.floxboard.organization.domain.*
import de.einfloh.floxboard.payment.domain.BillingInterval
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.hamcrest.CoreMatchers.`is`
import org.hamcrest.CoreMatchers.notNullValue
import org.hamcrest.Matchers.greaterThanOrEqualTo
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import java.util.UUID

@QuarkusTest
class OrganizationIntegrationTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @Inject
    lateinit var orgLicenseAssignmentRepository: OrganizationLicenseAssignmentRepository

    @Inject
    lateinit var orgLicensePoolRepository: OrganizationLicensePoolRepository

    @Inject
    lateinit var orgMemberRoleRepository: OrganizationMemberRoleRepository

    @Inject
    lateinit var licenseRepository: de.einfloh.floxboard.license.domain.LicenseRepository

    @jakarta.transaction.Transactional
    @org.junit.jupiter.api.BeforeEach
    fun cleanUpOrgs() {
        orgLicenseAssignmentRepository.deleteAll()
        orgLicensePoolRepository.deleteAll()
        orgMemberRoleRepository.deleteAll()
        licenseRepository.deleteAll()

        val adminToken = keycloakUserProvider.getAccessToken("admin@floxboard.io", "admin")
        val orgs = given()
            .auth().oauth2(adminToken)
            .`when`().get("/api/v1/admin/organizations")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        for (org in orgs) {
            val orgName = org["name"] as? String ?: ""
            if (orgName != "Acme Corp" && orgName != "Stark Industries") {
                val orgId = org["id"] as String
                given()
                    .auth().oauth2(adminToken)
                    .`when`().delete("/api/v1/admin/organizations/$orgId")
            }
        }
    }

    private fun getUserIdByEmail(adminToken: String, email: String): String {
        val users = given()
            .auth().oauth2(adminToken)
            .`when`().get("/api/v1/admin/users?query=$email")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        return users.first { it["email"] == email }["id"] as String
    }

    @Test
    fun testRealmAdminOrganizationLifecycle() {
        val adminToken = keycloakUserProvider.getAccessToken("admin@floxboard.io", "admin")
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val aliceId = getUserIdByEmail(adminToken, "alice@floxboard.io")
        val charlieId = getUserIdByEmail(adminToken, "charlie@floxboard.io")

        val orgName = "Lifecycle-Org-" + UUID.randomUUID().toString().take(6)
        val orgDomain = "lifecycle-${UUID.randomUUID().toString().take(6)}.com"

        // 1. Admin creates organization
        val createReq = CreateOrganizationRequest(
            name = orgName,
            domains = listOf(orgDomain),
            initialOrgAdminUserId = UUID.fromString(aliceId)
        )

        val orgId = given()
            .auth().oauth2(adminToken)
            .contentType(ContentType.JSON)
            .body(createReq)
            .`when`().post("/api/v1/admin/organizations")
            .then()
            .statusCode(200)
            .body("name", `is`(orgName))
            .body("domains", hasSize<Int>(1))
            .body("adminCount", `is`(1))
            .body("memberCount", `is`(1))
            .extract().path<String>("id")

        // 2. Admin gets organization details
        given()
            .auth().oauth2(adminToken)
            .`when`().get("/api/v1/admin/organizations/$orgId")
            .then()
            .statusCode(200)
            .body("id", `is`(orgId))
            .body("name", `is`(orgName))

        // 3. Alice verifies organization profile
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/organizations/my")
            .then()
            .statusCode(200)
            .body("organizationId", `is`(orgId))
            .body("role", `is`("ORG_ADMIN"))

        // 4. Admin adds Charlie as MEMBER
        given()
            .auth().oauth2(adminToken)
            .`when`().post("/api/v1/admin/organizations/$orgId/members?userId=$charlieId&role=MEMBER")
            .then()
            .statusCode(200)

        // 5. Admin promotes Charlie to ORG_ADMIN
        given()
            .auth().oauth2(adminToken)
            .`when`().post("/api/v1/admin/organizations/$orgId/admins/$charlieId")
            .then()
            .statusCode(200)

        // 6. Admin demotes Charlie back to MEMBER
        given()
            .auth().oauth2(adminToken)
            .`when`().delete("/api/v1/admin/organizations/$orgId/admins/$charlieId")
            .then()
            .statusCode(200)

        // 7. Admin deletes organization
        given()
            .auth().oauth2(adminToken)
            .`when`().delete("/api/v1/admin/organizations/$orgId")
            .then()
            .statusCode(204)

        // 8. Getting deleted organization returns 404
        given()
            .auth().oauth2(adminToken)
            .`when`().get("/api/v1/admin/organizations/$orgId")
            .then()
            .statusCode(404)
    }

    @Test
    fun testOrgAdminRoleDelegationAndGuards() {
        val adminToken = keycloakUserProvider.getAccessToken("admin@floxboard.io", "admin")
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val charlieToken = keycloakUserProvider.getAccessToken("charlie@floxboard.io", "charlie")
        val aliceId = getUserIdByEmail(adminToken, "alice@floxboard.io")
        val charlieId = getUserIdByEmail(adminToken, "charlie@floxboard.io")

        val orgName = "Delegation-Org-" + UUID.randomUUID().toString().take(6)
        val orgId = given()
            .auth().oauth2(adminToken)
            .contentType(ContentType.JSON)
            .body(CreateOrganizationRequest(name = orgName, initialOrgAdminEmail = "alice@floxboard.io"))
            .`when`().post("/api/v1/admin/organizations")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        try {
            // Add Charlie as MEMBER
            given()
                .auth().oauth2(adminToken)
                .`when`().post("/api/v1/admin/organizations/$orgId/members?userId=$charlieId&role=MEMBER")
                .then()
                .statusCode(200)

            // Charlie (MEMBER) cannot view pending join requests
            given()
                .auth().oauth2(charlieToken)
                .`when`().get("/api/v1/organizations/pending-members")
                .then()
                .statusCode(403)

            // Alice (ORG_ADMIN) promotes Charlie to ORG_ADMIN
            given()
                .auth().oauth2(aliceToken)
                .contentType(ContentType.JSON)
                .body(UpdateMemberRoleRequest(role = OrgMemberRole.ORG_ADMIN))
                .`when`().post("/api/v1/organizations/members/$charlieId/role")
                .then()
                .statusCode(200)

            // Charlie now has ORG_ADMIN privileges
            given()
                .auth().oauth2(charlieToken)
                .`when`().get("/api/v1/organizations/pending-members")
                .then()
                .statusCode(200)

            // Charlie demotes Alice to MEMBER (succeeds because Charlie is still ORG_ADMIN)
            given()
                .auth().oauth2(charlieToken)
                .contentType(ContentType.JSON)
                .body(UpdateMemberRoleRequest(role = OrgMemberRole.MEMBER))
                .`when`().post("/api/v1/organizations/members/$aliceId/role")
                .then()
                .statusCode(200)

            // Attempting to demote Charlie (now the only remaining ORG_ADMIN) returns 400 Bad Request
            given()
                .auth().oauth2(charlieToken)
                .contentType(ContentType.JSON)
                .body(UpdateMemberRoleRequest(role = OrgMemberRole.MEMBER))
                .`when`().post("/api/v1/organizations/members/$charlieId/role")
                .then()
                .statusCode(400)

            // Attempting to remove Charlie (the only remaining ORG_ADMIN) returns 400 Bad Request
            given()
                .auth().oauth2(charlieToken)
                .`when`().delete("/api/v1/organizations/members/$charlieId")
                .then()
                .statusCode(400)
        } finally {
            try {
                given().auth().oauth2(adminToken).delete("/api/v1/admin/organizations/$orgId/admins/$charlieId")
            } catch (e: Exception) {}
            given().auth().oauth2(adminToken).delete("/api/v1/admin/organizations/$orgId")
        }
    }

    @Test
    fun testDomainMatchingAndApprovalWorkflow() {
        val adminToken = keycloakUserProvider.getAccessToken("admin@floxboard.io", "admin")
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val charlieToken = keycloakUserProvider.getAccessToken("charlie@floxboard.io", "charlie")
        val charlieId = getUserIdByEmail(adminToken, "charlie@floxboard.io")

        val orgName = "Domain-Org-" + UUID.randomUUID().toString().take(6)
        // Set domain matching charlie's email domain (@floxboard.io)
        val orgId = given()
            .auth().oauth2(adminToken)
            .contentType(ContentType.JSON)
            .body(CreateOrganizationRequest(
                name = orgName,
                domains = listOf("floxboard.io"),
                initialOrgAdminEmail = "alice@floxboard.io"
            ))
            .`when`().post("/api/v1/admin/organizations")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        try {
            // Charlie submits a domain join request
            val joinReq = given()
                .auth().oauth2(charlieToken)
                .`when`().post("/api/v1/organizations/join-domain")
                .then()
                .statusCode(200)
                .body("organizationId", `is`(orgId))
                .body("status", `is`("PENDING"))
                .extract().path<String>("id")

            // Alice (ORG_ADMIN) views pending members
            given()
                .auth().oauth2(aliceToken)
                .`when`().get("/api/v1/organizations/pending-members")
                .then()
                .statusCode(200)
                .body("size()", greaterThanOrEqualTo(1))
                .body("[0].email", `is`("charlie@floxboard.io"))

            // Alice approves Charlie's join request
            given()
                .auth().oauth2(aliceToken)
                .`when`().post("/api/v1/organizations/pending-members/$joinReq/approve")
                .then()
                .statusCode(200)
                .body("status", `is`("APPROVED"))

            // Charlie verifies he is now a member of the organization
            given()
                .auth().oauth2(charlieToken)
                .`when`().get("/api/v1/organizations/my")
                .then()
                .statusCode(200)
                .body("organizationId", `is`(orgId))
                .body("role", `is`("MEMBER"))
        } finally {
            given().auth().oauth2(adminToken).delete("/api/v1/admin/organizations/$orgId")
        }
    }

    @Test
    fun testScopedUserSearch() {
        val adminToken = keycloakUserProvider.getAccessToken("admin@floxboard.io", "admin")
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")
        val charlieId = getUserIdByEmail(adminToken, "charlie@floxboard.io")

        val orgName = "ScopedSearch-Org-" + UUID.randomUUID().toString().take(6)
        val orgId = given()
            .auth().oauth2(adminToken)
            .contentType(ContentType.JSON)
            .body(CreateOrganizationRequest(name = orgName, initialOrgAdminEmail = "alice@floxboard.io"))
            .`when`().post("/api/v1/admin/organizations")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        try {
            // Add Charlie to Alice's organization
            given()
                .auth().oauth2(adminToken)
                .`when`().post("/api/v1/admin/organizations/$orgId/members?userId=$charlieId&role=MEMBER")
                .then()
                .statusCode(200)

            // Alice (in Org with Charlie) searches for "charlie" -> finds Charlie
            given()
                .auth().oauth2(aliceToken)
                .`when`().get("/api/v1/user/search?query=charlie")
                .then()
                .statusCode(200)
                .body("size()", `is`(1))
                .body("[0].username", `is`("charlie@floxboard.io"))

            // Alice searches for "bob" (who is not in her org) -> returns empty list
            given()
                .auth().oauth2(aliceToken)
                .`when`().get("/api/v1/user/search?query=bob")
                .then()
                .statusCode(200)
                .body("size()", `is`(0))

            // Bob (standalone, not in any organization) searches for "alice" -> returns empty list
            given()
                .auth().oauth2(bobToken)
                .`when`().get("/api/v1/user/search?query=alice")
                .then()
                .statusCode(200)
                .body("size()", `is`(0))
        } finally {
            given().auth().oauth2(adminToken).delete("/api/v1/admin/organizations/$orgId")
        }
    }

    @Test
    fun testBulkLicenseCheckoutAndSeatAllocation() {
        val adminToken = keycloakUserProvider.getAccessToken("admin@floxboard.io", "admin")
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val charlieToken = keycloakUserProvider.getAccessToken("charlie@floxboard.io", "charlie")
        val charlieId = getUserIdByEmail(adminToken, "charlie@floxboard.io")

        val orgName = "Licensing-Org-" + UUID.randomUUID().toString().take(6)
        val orgId = given()
            .auth().oauth2(adminToken)
            .contentType(ContentType.JSON)
            .body(CreateOrganizationRequest(name = orgName, initialOrgAdminEmail = "alice@floxboard.io"))
            .`when`().post("/api/v1/admin/organizations")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        try {
            // Add Charlie to Org
            given()
                .auth().oauth2(adminToken)
                .`when`().post("/api/v1/admin/organizations/$orgId/members?userId=$charlieId&role=MEMBER")
                .then()
                .statusCode(200)

            // 1. Charlie has FREE tier initially
            given()
                .auth().oauth2(charlieToken)
                .`when`().get("/api/v1/license/status")
                .then()
                .statusCode(200)
                .body("plan", `is`("FREE"))

            // 2. Alice (Org Admin) buys 1 PRO seat in bulk
            val checkoutReq = OrgBulkCheckoutRequest(
                plan = LicensePlan.PRO,
                seatCount = 1,
                billingInterval = BillingInterval.MONTHLY
            )

            given()
                .auth().oauth2(aliceToken)
                .contentType(ContentType.JSON)
                .body(checkoutReq)
                .`when`().post("/api/v1/organizations/license-pool/checkout")
                .then()
                .statusCode(200)
                .body("status", `is`("SUCCEEDED"))
                .body("amountCents", `is`(1200))

            // 3. Alice views license pool
            val pools = given()
                .auth().oauth2(aliceToken)
                .`when`().get("/api/v1/organizations/license-pool")
                .then()
                .statusCode(200)
                .body("size()", `is`(1))
                .body("[0].planType", `is`("PRO"))
                .body("[0].totalSeats", `is`(1))
                .body("[0].allocatedSeats", `is`(0))
                .body("[0].remainingSeats", `is`(1))
                .extract().jsonPath().getList<Map<String, Any>>("$")

            val poolId = pools.first()["id"] as String

            // 4. Alice assigns the 1 PRO seat to Charlie
            given()
                .auth().oauth2(aliceToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(charlieId)))
                .`when`().post("/api/v1/organizations/license-pool/$poolId/assign")
                .then()
                .statusCode(200)
                .body("userId", `is`(charlieId))
                .body("poolId", `is`(poolId))

            // 5. Charlie's entitlements now resolve to PRO
            given()
                .auth().oauth2(charlieToken)
                .`when`().get("/api/v1/license/status")
                .then()
                .statusCode(200)
                .body("plan", `is`("PRO"))
                .body("features.'whiteboard:export:pdf'", `is`(true))

            // 6. Over-allocation guard: Attempting to assign Alice when pool is full (1/1) fails
            val aliceId = getUserIdByEmail(adminToken, "alice@floxboard.io")
            given()
                .auth().oauth2(aliceToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(aliceId)))
                .`when`().post("/api/v1/organizations/license-pool/$poolId/assign")
                .then()
                .statusCode(402)

            // 7. Alice unassigns seat from Charlie
            given()
                .auth().oauth2(aliceToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(charlieId)))
                .`when`().post("/api/v1/organizations/license-pool/$poolId/unassign")
                .then()
                .statusCode(200)
                .body("unassigned", `is`(true))

            // 8. Charlie's entitlements fall back to FREE
            given()
                .auth().oauth2(charlieToken)
                .`when`().get("/api/v1/license/status")
                .then()
                .statusCode(200)
                .body("plan", `is`("FREE"))
                .body("features.'whiteboard:export:pdf'", `is`(false))
        } finally {
            given().auth().oauth2(adminToken).delete("/api/v1/admin/organizations/$orgId")
        }
    }

    @Test
    fun testKeycloakAdminRoleAllowsFullOrganizationManagement() {
        val adminToken = keycloakUserProvider.getAccessToken("admin@floxboard.io", "admin")
        val aliceId = getUserIdByEmail(adminToken, "alice@floxboard.io")

        val orgName = "AdminRole-Org-" + UUID.randomUUID().toString().take(6)
        val orgDomain = "adminrole-${UUID.randomUUID().toString().take(6)}.com"

        // 1. Keycloak admin creates organization
        val createReq = CreateOrganizationRequest(
            name = orgName,
            domains = listOf(orgDomain),
            initialOrgAdminUserId = UUID.fromString(aliceId)
        )

        val orgId = given()
            .auth().oauth2(adminToken)
            .contentType(ContentType.JSON)
            .body(createReq)
            .`when`().post("/api/v1/admin/organizations")
            .then()
            .statusCode(200)
            .body("name", `is`(orgName))
            .extract().path<String>("id")

        try {
            // 2. Keycloak admin can list pending members on admin endpoint
            given()
                .auth().oauth2(adminToken)
                .`when`().get("/api/v1/admin/organizations/$orgId/pending-members")
                .then()
                .statusCode(200)
                .body("size()", `is`(0))

            // 3. Keycloak admin can purchase bulk license seats for the organization
            val checkoutReq = OrgBulkCheckoutRequest(
                plan = LicensePlan.ENTERPRISE,
                seatCount = 5,
                billingInterval = BillingInterval.YEARLY
            )

            given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .body(checkoutReq)
                .`when`().post("/api/v1/admin/organizations/$orgId/license-pools/checkout")
                .then()
                .statusCode(200)
                .body("status", `is`("SUCCEEDED"))

            // 4. Keycloak admin views license pools
            val pools = given()
                .auth().oauth2(adminToken)
                .`when`().get("/api/v1/admin/organizations/$orgId/license-pools")
                .then()
                .statusCode(200)
                .body("size()", `is`(1))
                .body("[0].planType", `is`("ENTERPRISE"))
                .body("[0].totalSeats", `is`(5))
                .extract().jsonPath().getList<Map<String, Any>>("$")

            val poolId = pools.first()["id"] as String

            // 5. Keycloak admin assigns seat to Alice
            given()
                .auth().oauth2(adminToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(aliceId)))
                .`when`().post("/api/v1/admin/organizations/$orgId/license-pools/$poolId/assign")
                .then()
                .statusCode(200)
                .body("userId", `is`(aliceId))
        } finally {
            given().auth().oauth2(adminToken).delete("/api/v1/admin/organizations/$orgId")
        }
    }
}
