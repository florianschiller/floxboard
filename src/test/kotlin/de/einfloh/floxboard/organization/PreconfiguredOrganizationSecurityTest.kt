package de.einfloh.floxboard.organization

import de.einfloh.floxboard.license.domain.LicensePlan
import de.einfloh.floxboard.organization.domain.*
import de.einfloh.floxboard.payment.domain.BillingInterval
import de.einfloh.floxboard.whiteboard.api.SaveWhiteboardRequest
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.hamcrest.CoreMatchers.`is`
import org.hamcrest.CoreMatchers.notNullValue
import org.hamcrest.Matchers.hasItem
import org.hamcrest.Matchers.not
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.UUID

@QuarkusTest
class PreconfiguredOrganizationSecurityTest {

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
    }

    private fun getAdminToken(): String =
        keycloakUserProvider.getAccessToken("admin@floxboard.io", "admin")

    private fun getUserIdByEmail(adminToken: String, email: String): String {
        val users = given()
            .auth().oauth2(adminToken)
            .`when`().get("/api/v1/admin/users?query=$email")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        return users.first { it["email"] == email }["id"] as String
    }

    private fun getOrganizations(adminToken: String): List<Map<String, Any>> {
        return given()
            .auth().oauth2(adminToken)
            .`when`().get("/api/v1/admin/organizations")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")
    }

    @Test
    fun testPreconfiguredOrganizationsAndMembersExist() {
        val adminToken = getAdminToken()
        val orgs = getOrganizations(adminToken)

        val acmeOrg = orgs.firstOrNull { it["name"] == "Acme Corp" }
        val starkOrg = orgs.firstOrNull { it["name"] == "Stark Industries" }

        assertTrue(acmeOrg != null, "Acme Corp should exist from realm import")
        assertTrue(starkOrg != null, "Stark Industries should exist from realm import")

        val acmeId = acmeOrg!!["id"] as String
        val starkId = starkOrg!!["id"] as String

        // Verify Acme Corp members: Dave, Frank, Bob
        val acmeMembers = given()
            .auth().oauth2(adminToken)
            .`when`().get("/api/v1/admin/organizations/$acmeId/members")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        val acmeEmails = acmeMembers.map { it["email"] as String }
        assertTrue(acmeEmails.contains("dave@floxboard.io"), "Dave should be member of Acme Corp")
        assertTrue(acmeEmails.contains("frank@floxboard.io"), "Frank should be member of Acme Corp")
        assertTrue(acmeEmails.contains("bob@floxboard.io"), "Bob should be member of Acme Corp")
        assertFalse(acmeEmails.contains("charlie@floxboard.io"), "Charlie should NOT be member of Acme Corp")
        assertFalse(acmeEmails.contains("eve@floxboard.io"), "Eve should NOT be member of Acme Corp")

        // Verify Stark Industries members: Eve, Frank, Charlie
        val starkMembers = given()
            .auth().oauth2(adminToken)
            .`when`().get("/api/v1/admin/organizations/$starkId/members")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        val starkEmails = starkMembers.map { it["email"] as String }
        assertTrue(starkEmails.contains("eve@floxboard.io"), "Eve should be member of Stark Industries")
        assertTrue(starkEmails.contains("frank@floxboard.io"), "Frank should be member of Stark Industries")
        assertTrue(starkEmails.contains("charlie@floxboard.io"), "Charlie should be member of Stark Industries")
        assertFalse(starkEmails.contains("bob@floxboard.io"), "Bob should NOT be member of Stark Industries")
        assertFalse(starkEmails.contains("dave@floxboard.io"), "Dave should NOT be member of Stark Industries")
    }

    @Test
    fun testOrgAdminCanOnlyManageTheirOwnOrganization() {
        val adminToken = getAdminToken()
        val orgs = getOrganizations(adminToken)
        val acmeId = orgs.first { it["name"] == "Acme Corp" }["id"] as String
        val starkId = orgs.first { it["name"] == "Stark Industries" }["id"] as String

        val daveToken = keycloakUserProvider.getAccessToken("dave@floxboard.io", "dave")
        val eveToken = keycloakUserProvider.getAccessToken("eve@floxboard.io", "eve")
        val frankToken = keycloakUserProvider.getAccessToken("frank@floxboard.io", "frank")
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")
        val charlieToken = keycloakUserProvider.getAccessToken("charlie@floxboard.io", "charlie")

        val bobId = getUserIdByEmail(adminToken, "bob@floxboard.io")
        val charlieId = getUserIdByEmail(adminToken, "charlie@floxboard.io")

        // 1. Dave (Acme Admin) verifies own profile
        given()
            .auth().oauth2(daveToken)
            .`when`().get("/api/v1/organizations/my")
            .then()
            .statusCode(200)
            .body("organizationId", `is`(acmeId))
            .body("role", `is`("ORG_ADMIN"))

        // 2. Dave (Acme Admin) can list Acme members
        given()
            .auth().oauth2(daveToken)
            .`when`().get("/api/v1/organizations/members")
            .then()
            .statusCode(200)
            .body("find { it.email == 'bob@floxboard.io' }.email", `is`("bob@floxboard.io"))

        // 3. Dave (Acme Admin) purchases bulk license seats for Acme Corp
        val acmeCheckout = OrgBulkCheckoutRequest(
            plan = LicensePlan.PRO,
            seatCount = 5,
            billingInterval = BillingInterval.MONTHLY
        )
        given()
            .auth().oauth2(daveToken)
            .contentType(ContentType.JSON)
            .body(acmeCheckout)
            .`when`().post("/api/v1/organizations/license-pool/checkout")
            .then()
            .statusCode(200)
            .body("status", `is`("SUCCEEDED"))

        val acmePools = given()
            .auth().oauth2(daveToken)
            .`when`().get("/api/v1/organizations/license-pool")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        val acmePoolId = acmePools.first()["id"] as String

        try {
            // 4. Dave assigns a seat to Bob (Acme member)
            given()
                .auth().oauth2(daveToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(bobId)))
                .`when`().post("/api/v1/organizations/license-pool/$acmePoolId/assign")
                .then()
                .statusCode(200)
                .body("userId", `is`(bobId))

            // Bob verifies PRO entitlements
            given()
                .auth().oauth2(bobToken)
                .`when`().get("/api/v1/license/status")
                .then()
                .statusCode(200)
                .body("plan", `is`("PRO"))

            // 5. Eve (Stark Admin) purchases bulk license seats for Stark Industries
            val starkCheckout = OrgBulkCheckoutRequest(
                plan = LicensePlan.ENTERPRISE,
                seatCount = 3,
                billingInterval = BillingInterval.YEARLY
            )
            given()
                .auth().oauth2(eveToken)
                .contentType(ContentType.JSON)
                .body(starkCheckout)
                .`when`().post("/api/v1/organizations/license-pool/checkout")
                .then()
                .statusCode(200)
                .body("status", `is`("SUCCEEDED"))

            val starkPools = given()
                .auth().oauth2(eveToken)
                .`when`().get("/api/v1/organizations/license-pool")
                .then()
                .statusCode(200)
                .extract().jsonPath().getList<Map<String, Any>>("$")

            val starkPoolId = starkPools.first()["id"] as String

            // 6. Eve assigns a seat to Charlie (Stark member)
            given()
                .auth().oauth2(eveToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(charlieId)))
                .`when`().post("/api/v1/organizations/license-pool/$starkPoolId/assign")
                .then()
                .statusCode(200)
                .body("userId", `is`(charlieId))

            // Charlie verifies ENTERPRISE entitlements
            given()
                .auth().oauth2(charlieToken)
                .`when`().get("/api/v1/license/status")
                .then()
                .statusCode(200)
                .body("plan", `is`("ENTERPRISE"))

            // --- ISOLATION TESTS ---

            // 7. Dave (Acme Admin) CANNOT assign seats from Stark's license pool
            given()
                .auth().oauth2(daveToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(bobId)))
                .`when`().post("/api/v1/organizations/license-pool/$starkPoolId/assign")
                .then()
                .statusCode(403)

            // 8. Dave (Acme Admin) CANNOT unassign seats from Stark's license pool
            given()
                .auth().oauth2(daveToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(charlieId)))
                .`when`().post("/api/v1/organizations/license-pool/$starkPoolId/unassign")
                .then()
                .statusCode(403)

            // 9. Eve (Stark Admin) CANNOT assign seats from Acme's license pool
            given()
                .auth().oauth2(eveToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(charlieId)))
                .`when`().post("/api/v1/organizations/license-pool/$acmePoolId/assign")
                .then()
                .statusCode(403)

            // 10. Eve (Stark Admin) CANNOT unassign seats from Acme's license pool
            given()
                .auth().oauth2(eveToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(bobId)))
                .`when`().post("/api/v1/organizations/license-pool/$acmePoolId/unassign")
                .then()
                .statusCode(403)

            // 11. Frank (Dual Org Admin) CAN manage both Acme and Stark pools
            // Frank unassigns and reassigns Bob on Acme pool
            given()
                .auth().oauth2(frankToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(bobId)))
                .`when`().post("/api/v1/organizations/license-pool/$acmePoolId/unassign")
                .then()
                .statusCode(200)
                .body("unassigned", `is`(true))

            given()
                .auth().oauth2(frankToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(bobId)))
                .`when`().post("/api/v1/organizations/license-pool/$acmePoolId/assign")
                .then()
                .statusCode(200)

            // Frank unassigns and reassigns Charlie on Stark pool
            given()
                .auth().oauth2(frankToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(charlieId)))
                .`when`().post("/api/v1/organizations/license-pool/$starkPoolId/unassign")
                .then()
                .statusCode(200)
                .body("unassigned", `is`(true))

            given()
                .auth().oauth2(frankToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(charlieId)))
                .`when`().post("/api/v1/organizations/license-pool/$starkPoolId/assign")
                .then()
                .statusCode(200)

            // 12. Non-admin members (Bob and Charlie) CANNOT perform admin actions
            given()
                .auth().oauth2(bobToken)
                .contentType(ContentType.JSON)
                .body(acmeCheckout)
                .`when`().post("/api/v1/organizations/license-pool/checkout")
                .then()
                .statusCode(403)

            given()
                .auth().oauth2(charlieToken)
                .contentType(ContentType.JSON)
                .body(starkCheckout)
                .`when`().post("/api/v1/organizations/license-pool/checkout")
                .then()
                .statusCode(403)
        } finally {
            try {
                given().auth().oauth2(daveToken).contentType(ContentType.JSON).body(AssignSeatRequest(userId = UUID.fromString(bobId))).post("/api/v1/organizations/license-pool/$acmePoolId/unassign")
            } catch (e: Exception) {}
            try {
                val starkPools = given().auth().oauth2(adminToken).`when`().get("/api/v1/admin/organizations/$starkId/license-pools").then().extract().jsonPath().getList<Map<String, Any>>("$")
                if (starkPools.isNotEmpty()) {
                    val sPoolId = starkPools.first()["id"] as String
                    given().auth().oauth2(eveToken).contentType(ContentType.JSON).body(AssignSeatRequest(userId = UUID.fromString(charlieId))).post("/api/v1/organizations/license-pool/$sPoolId/unassign")
                }
            } catch (e: Exception) {}
        }
    }

    @Test
    fun testScopedUserSearchWithinOrganization() {
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")
        val charlieToken = keycloakUserProvider.getAccessToken("charlie@floxboard.io", "charlie")
        val frankToken = keycloakUserProvider.getAccessToken("frank@floxboard.io", "frank")
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        // 1. Bob (Acme member) searches users:
        // Bob can find Acme members: Dave, Frank, Bob
        val bobSearchResults = given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/users?q=floxboard")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        val bobFoundEmails = bobSearchResults.map { it["email"] as String }
        assertTrue(bobFoundEmails.contains("dave@floxboard.io"), "Bob should find Dave (Acme Org)")
        assertTrue(bobFoundEmails.contains("frank@floxboard.io"), "Bob should find Frank (Acme Org)")
        assertTrue(bobFoundEmails.contains("bob@floxboard.io"), "Bob should find Bob (Acme Org)")
        assertFalse(bobFoundEmails.contains("eve@floxboard.io"), "Bob should NOT find Eve (Stark Org)")
        assertFalse(bobFoundEmails.contains("charlie@floxboard.io"), "Bob should NOT find Charlie (Stark Org)")

        // Bob searching specifically for Charlie returns empty
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/users?q=charlie")
            .then()
            .statusCode(200)
            .body("size()", `is`(0))

        // 2. Charlie (Stark member) searches users:
        // Charlie can find Stark members: Eve, Frank, Charlie
        val charlieSearchResults = given()
            .auth().oauth2(charlieToken)
            .`when`().get("/api/v1/whiteboards/users?q=floxboard")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        val charlieFoundEmails = charlieSearchResults.map { it["email"] as String }
        assertTrue(charlieFoundEmails.contains("eve@floxboard.io"), "Charlie should find Eve (Stark Org)")
        assertTrue(charlieFoundEmails.contains("frank@floxboard.io"), "Charlie should find Frank (Stark Org)")
        assertTrue(charlieFoundEmails.contains("charlie@floxboard.io"), "Charlie should find Charlie (Stark Org)")
        assertFalse(charlieFoundEmails.contains("dave@floxboard.io"), "Charlie should NOT find Dave (Acme Org)")
        assertFalse(charlieFoundEmails.contains("bob@floxboard.io"), "Charlie should NOT find Bob (Acme Org)")

        // Charlie searching specifically for Bob returns empty
        given()
            .auth().oauth2(charlieToken)
            .`when`().get("/api/v1/whiteboards/users?q=bob")
            .then()
            .statusCode(200)
            .body("size()", `is`(0))

        // 3. Frank (Dual Org member) searches users:
        // Frank can discover members from both organizations
        val frankSearchResults = given()
            .auth().oauth2(frankToken)
            .`when`().get("/api/v1/whiteboards/users?q=floxboard")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        val frankFoundEmails = frankSearchResults.map { it["email"] as String }
        assertTrue(frankFoundEmails.contains("dave@floxboard.io"), "Frank should find Dave (Acme Org)")
        assertTrue(frankFoundEmails.contains("eve@floxboard.io"), "Frank should find Eve (Stark Org)")
        assertTrue(frankFoundEmails.contains("frank@floxboard.io"), "Frank should find Frank")
        assertTrue(frankFoundEmails.contains("bob@floxboard.io"), "Frank should find Bob (Acme Org)")
        assertTrue(frankFoundEmails.contains("charlie@floxboard.io"), "Frank should find Charlie (Stark Org)")

        // 4. Alice (No organization) searching users can discover individual users
        val aliceSearchResults = given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/users?q=bob")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        assertTrue(aliceSearchResults.any { it["email"] == "bob@floxboard.io" })

        // 5. User Resource scoped search endpoint (/api/v1/user/search)
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/user/search?query=dave")
            .then()
            .statusCode(200)
            .body("[0].email", `is`("dave@floxboard.io"))

        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/user/search?query=eve")
            .then()
            .statusCode(200)
            .body("size()", `is`(0))
    }

    @Test
    fun testUserMyOrganizationsRetrieval() {
        val frankToken = keycloakUserProvider.getAccessToken("frank@floxboard.io", "frank")
        val daveToken = keycloakUserProvider.getAccessToken("dave@floxboard.io", "dave")
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")

        // 1. Frank belongs to both Acme Corp and Stark Industries as ORG_ADMIN
        val frankOrgs = given()
            .auth().oauth2(frankToken)
            .`when`().get("/api/v1/organizations/my-organizations")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        assertEquals(2, frankOrgs.size, "Frank should belong to 2 organizations")
        val frankOrgNames = frankOrgs.map { it["organizationName"] as String }
        assertTrue(frankOrgNames.contains("Acme Corp"))
        assertTrue(frankOrgNames.contains("Stark Industries"))
        for (org in frankOrgs) {
            assertEquals("ORG_ADMIN", org["role"], "Frank should be ORG_ADMIN in ${org["organizationName"]}")
        }

        // 2. Dave belongs to Acme Corp only as ORG_ADMIN
        val daveOrgs = given()
            .auth().oauth2(daveToken)
            .`when`().get("/api/v1/organizations/my-organizations")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        assertEquals(1, daveOrgs.size, "Dave should belong to 1 organization")
        assertEquals("Acme Corp", daveOrgs[0]["organizationName"])
        assertEquals("ORG_ADMIN", daveOrgs[0]["role"])

        // 3. Bob belongs to Acme Corp only as MEMBER
        val bobOrgs = given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/organizations/my-organizations")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        assertEquals(1, bobOrgs.size, "Bob should belong to 1 organization")
        assertEquals("Acme Corp", bobOrgs[0]["organizationName"])
        assertEquals("MEMBER", bobOrgs[0]["role"])
    }

    @Test
    fun testWhiteboardCollaborationDirectInviteAcrossOrganizations() {
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")
        val charlieToken = keycloakUserProvider.getAccessToken("charlie@floxboard.io", "charlie")

        // Bob creates a whiteboard
        val saveRequest = SaveWhiteboardRequest(name = "Acme Board", content = null)
        val boardId = given()
            .auth().oauth2(bobToken)
            .contentType(ContentType.JSON)
            .body(saveRequest)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        try {
            // Bob directly invites Charlie using exact email (direct external collaboration)
            val addCollabReq = de.einfloh.floxboard.whiteboard.api.AddCollaboratorRequest(
                email = "charlie@floxboard.io",
                role = de.einfloh.floxboard.whiteboard.domain.CollaboratorRole.EDITOR
            )
            given()
                .auth().oauth2(bobToken)
                .contentType(ContentType.JSON)
                .body(addCollabReq)
                .`when`().post("/api/v1/whiteboards/$boardId/collaborators")
                .then()
                .statusCode(200)
                .body("userEmail", `is`("charlie@floxboard.io"))
                .body("role", `is`("EDITOR"))

            // Charlie can access the shared whiteboard
            given()
                .auth().oauth2(charlieToken)
                .`when`().get("/api/v1/whiteboards/$boardId")
                .then()
                .statusCode(200)
                .body("id", `is`(boardId))
                .body("name", `is`("Acme Board"))
        } finally {
            given().auth().oauth2(bobToken).delete("/api/v1/whiteboards/$boardId")
        }
    }

    @Test
    fun testSingleLicenseSourceEnforcementAcrossOrganizations() {
        val daveToken = keycloakUserProvider.getAccessToken("dave@floxboard.io", "dave")
        val eveToken = keycloakUserProvider.getAccessToken("eve@floxboard.io", "eve")
        val frankToken = keycloakUserProvider.getAccessToken("frank@floxboard.io", "frank")
        val adminToken = keycloakUserProvider.getAccessToken("admin@floxboard.io", "admin")

        val frankId = getUserIdByEmail(adminToken, "frank@floxboard.io")

        // 1. Eve purchases ENTERPRISE license seats for Stark Industries
        val starkCheckout = OrgBulkCheckoutRequest(
            plan = LicensePlan.ENTERPRISE,
            seatCount = 2,
            billingInterval = BillingInterval.MONTHLY
        )
        given()
            .auth().oauth2(eveToken)
            .contentType(ContentType.JSON)
            .body(starkCheckout)
            .`when`().post("/api/v1/organizations/license-pool/checkout")
            .then()
            .statusCode(200)
            .body("status", `is`("SUCCEEDED"))

        val starkPools = given()
            .auth().oauth2(eveToken)
            .`when`().get("/api/v1/organizations/license-pool")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")
        val starkPoolId = starkPools.first()["id"] as String

        // 2. Dave purchases PRO license seats for Acme Corp
        val acmeCheckout = OrgBulkCheckoutRequest(
            plan = LicensePlan.PRO,
            seatCount = 2,
            billingInterval = BillingInterval.MONTHLY
        )
        given()
            .auth().oauth2(daveToken)
            .contentType(ContentType.JSON)
            .body(acmeCheckout)
            .`when`().post("/api/v1/organizations/license-pool/checkout")
            .then()
            .statusCode(200)
            .body("status", `is`("SUCCEEDED"))

        val acmePools = given()
            .auth().oauth2(daveToken)
            .`when`().get("/api/v1/organizations/license-pool")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")
        val acmePoolId = acmePools.first()["id"] as String

        try {
            // 3. Eve assigns a seat in Stark Industries to Frank
            given()
                .auth().oauth2(eveToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(frankId)))
                .`when`().post("/api/v1/organizations/license-pool/$starkPoolId/assign")
                .then()
                .statusCode(200)
                .body("userId", `is`<String>(frankId))

            // Frank verifies ENTERPRISE license status
            given()
                .auth().oauth2(frankToken)
                .`when`().get("/api/v1/license/status")
                .then()
                .statusCode(200)
                .body("plan", `is`("ENTERPRISE"))

            // In Stark Industries members list: Frank has assignedPlan = ENTERPRISE and hasLicense = true
            val starkMembers = given()
                .auth().oauth2(eveToken)
                .`when`().get("/api/v1/organizations/members")
                .then()
                .statusCode(200)
                .extract().jsonPath().getList<Map<String, Any>>("$")
            val starkFrank = starkMembers.first { it["email"] == "frank@floxboard.io" }
            assertEquals("ENTERPRISE", starkFrank["assignedPlan"])
            assertEquals(true, starkFrank["hasLicense"])
            assertEquals("ORGANIZATION", starkFrank["licenseSource"])

            // In Acme Corp members list: Frank has assignedPlan = null and hasLicense = true (from other org)
            val acmeMembers = given()
                .auth().oauth2(daveToken)
                .`when`().get("/api/v1/organizations/members")
                .then()
                .statusCode(200)
                .extract().jsonPath().getList<Map<String, Any>>("$")
            val acmeFrank = acmeMembers.first { it["email"] == "frank@floxboard.io" }
            assertNull(acmeFrank["assignedPlan"])
            assertEquals(true, acmeFrank["hasLicense"])
            assertEquals("OTHER_ORGANIZATION", acmeFrank["licenseSource"])

            // 4. Dave attempts to assign a seat in Acme Corp to Frank -> FAILS with 400
            given()
                .auth().oauth2(daveToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(frankId)))
                .`when`().post("/api/v1/organizations/license-pool/$acmePoolId/assign")
                .then()
                .statusCode(400)

            // Frank also cannot buy an individual private license while having an org license
            given()
                .auth().oauth2(frankToken)
                .contentType(ContentType.JSON)
                .body(de.einfloh.floxboard.payment.domain.MockCheckoutRequest(
                    plan = LicensePlan.PRO,
                    billingInterval = BillingInterval.MONTHLY
                ))
                .`when`().post("/api/v1/payment/checkout")
                .then()
                .statusCode(400)

            // 5. Eve unassigns Frank from Stark Industries
            given()
                .auth().oauth2(eveToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(frankId)))
                .`when`().post("/api/v1/organizations/license-pool/$starkPoolId/unassign")
                .then()
                .statusCode(200)
                .body("unassigned", `is`(true))

            // Now in Acme Corp member list: Frank has hasLicense = false
            val acmeMembersAfter = given()
                .auth().oauth2(daveToken)
                .`when`().get("/api/v1/organizations/members")
                .then()
                .statusCode(200)
                .extract().jsonPath().getList<Map<String, Any>>("$")
            val acmeFrankAfter = acmeMembersAfter.first { it["email"] == "frank@floxboard.io" }
            assertNull(acmeFrankAfter["assignedPlan"])
            assertEquals(false, acmeFrankAfter["hasLicense"])

            // 6. Dave can now assign Frank a seat in Acme Corp
            given()
                .auth().oauth2(daveToken)
                .contentType(ContentType.JSON)
                .body(AssignSeatRequest(userId = UUID.fromString(frankId)))
                .`when`().post("/api/v1/organizations/license-pool/$acmePoolId/assign")
                .then()
                .statusCode(200)
                .body("userId", `is`<String>(frankId))

            // Frank verifies PRO status from Acme Corp
            given()
                .auth().oauth2(frankToken)
                .`when`().get("/api/v1/license/status")
                .then()
                .statusCode(200)
                .body("plan", `is`("PRO"))

        } finally {
            try {
                given().auth().oauth2(eveToken).contentType(ContentType.JSON).body(AssignSeatRequest(userId = UUID.fromString(frankId))).post("/api/v1/organizations/license-pool/$starkPoolId/unassign")
            } catch (e: Exception) {}
            try {
                given().auth().oauth2(daveToken).contentType(ContentType.JSON).body(AssignSeatRequest(userId = UUID.fromString(frankId))).post("/api/v1/organizations/license-pool/$acmePoolId/unassign")
            } catch (e: Exception) {}
        }
    }
}
