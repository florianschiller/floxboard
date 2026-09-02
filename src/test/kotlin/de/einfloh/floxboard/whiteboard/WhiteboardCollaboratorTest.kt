package de.einfloh.floxboard.whiteboard

import de.einfloh.floxboard.whiteboard.api.*
import de.einfloh.floxboard.whiteboard.domain.CollaboratorRole
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.mailer.MockMailbox
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.hamcrest.CoreMatchers.`is`
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.*

@QuarkusTest
class WhiteboardCollaboratorTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @Inject
    lateinit var mailbox: MockMailbox

    @Test
    fun testCollaboratorPermissionsAndAccessRequests() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")

        // 1. Alice creates a whiteboard
        val saveRequest = SaveWhiteboardRequest(name = "Collab Board 1", content = null)
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(saveRequest)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // Alice is OWNER
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/role")
            .then()
            .statusCode(200)
            .body("role", `is`("OWNER"))

        // Bob has no access yet
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/$boardId")
            .then()
            .statusCode(403)

        // Non-existent board returns 404
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/${UUID.randomUUID()}")
            .then()
            .statusCode(404)

        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/$boardId/role")
            .then()
            .statusCode(403)

        // 2. Bob requests access to the whiteboard as EDITOR
        mailbox.clear()
        given()
            .auth().oauth2(bobToken)
            .contentType(ContentType.JSON)
            .body(CreateAccessRequestDto(requestedRole = CollaboratorRole.EDITOR, message = "Please give me access"))
            .`when`().post("/api/v1/whiteboards/$boardId/access-requests")
            .then()
            .statusCode(200)
            .body("status", `is`("PENDING"))
            .body("requestedRole", `is`("EDITOR"))

        // Verify Alice received the access request notification
        var aliceMails = mailbox.getMailsSentTo("alice@floxboard.io")
        var attempts = 0
        while (aliceMails.isEmpty() && attempts < 50) {
            Thread.sleep(50)
            aliceMails = mailbox.getMailsSentTo("alice@floxboard.io")
            attempts++
        }
        assertTrue(aliceMails.isNotEmpty())
        val accessReqMail = aliceMails[0]
        assertTrue(accessReqMail.subject.contains("Access Request"))
        assertTrue(accessReqMail.html.contains("Collab Board 1"))
        assertTrue(accessReqMail.html.contains("bob@floxboard.io"))
        assertTrue(accessReqMail.html.contains("Please give me access"))

        // Bob checks his request status
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/$boardId/access-requests/my")
            .then()
            .statusCode(200)
            .body("status", `is`("PENDING"))

        // Alice views pending access requests
        val requestId = given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/access-requests")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(1))
            .body("[0].username", `is`("bob@floxboard.io"))
            .extract().path<String>("[0].id")

        // 3. Alice approves Bob's request as ADMIN
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(ResolveAccessRequestDto(role = CollaboratorRole.ADMIN))
            .`when`().post("/api/v1/whiteboards/$boardId/access-requests/$requestId/approve")
            .then()
            .statusCode(200)
            .body("status", `is`("APPROVED"))

        // Bob now has access with ADMIN role
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/$boardId/role")
            .then()
            .statusCode(200)
            .body("role", `is`("ADMIN"))

        // Bob sees the board in shared boards list
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/shared")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(1))
            .body("[0].id", `is`(boardId))
            .body("[0].role", `is`("ADMIN"))

        // 4. Bob (as ADMIN) invites third user as VIEWER using UUID
        val thirdUserId = UUID.randomUUID()
        val thirdCollab = given()
            .auth().oauth2(bobToken)
            .contentType(ContentType.JSON)
            .body(AddCollaboratorRequest(query = thirdUserId.toString(), role = CollaboratorRole.VIEWER))
            .`when`().post("/api/v1/whiteboards/$boardId/collaborators")
            .then()
            .statusCode(200)
            .body("role", `is`("VIEWER"))
            .extract().path<String>("userId")

        // 5. Alice updates third user's role to EDITOR
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(UpdateCollaboratorRoleRequest(role = CollaboratorRole.EDITOR))
            .`when`().patch("/api/v1/whiteboards/$boardId/collaborators/$thirdCollab")
            .then()
            .statusCode(200)
            .body("role", `is`("EDITOR"))

        // 6. Bob (ADMIN) removes third user access
        given()
            .auth().oauth2(bobToken)
            .`when`().delete("/api/v1/whiteboards/$boardId/collaborators/$thirdCollab")
            .then()
            .statusCode(204)

        // 7. Bob (ADMIN) cannot remove Alice (OWNER)
        val aliceUserId = given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/collaborators")
            .then()
            .statusCode(200)
            .body("[0].username", `is`("alice@floxboard.io"))
            .extract().path<String>("[0].userId")

        given()
            .auth().oauth2(bobToken)
            .`when`().delete("/api/v1/whiteboards/$boardId/collaborators/$aliceUserId")
            .then()
            .statusCode(403)

        // 8. Bob (ADMIN) cannot delete the board (only OWNER can)
        given()
            .auth().oauth2(bobToken)
            .`when`().delete("/api/v1/whiteboards/$boardId")
            .then()
            .statusCode(404)

        // 9. Alice removes Bob from collaborators; Bob's access request is also cleaned up
        val collabs = given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/collaborators")
            .then()
            .statusCode(200)
            .extract().body().jsonPath().getList<Map<String, Any>>("$")
        val bobCollab = collabs.find { it["userEmail"] == "bob@floxboard.io" || it["username"] == "bob@floxboard.io" }
        val bobUserId = bobCollab?.get("userId") as String

        given()
            .auth().oauth2(aliceToken)
            .`when`().delete("/api/v1/whiteboards/$boardId/collaborators/$bobUserId")
            .then()
            .statusCode(204)

        // Bob now gets 403 on board and 404 on access-requests/my (no stale approved request)
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/$boardId")
            .then()
            .statusCode(403)

        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/$boardId/access-requests/my")
            .then()
            .statusCode(404)

        // Alice (OWNER) deletes the board
        given()
            .auth().oauth2(aliceToken)
            .`when`().delete("/api/v1/whiteboards/$boardId")
            .then()
            .statusCode(204)
    }
}
