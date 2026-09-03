package de.einfloh.floxboard.whiteboard

import de.einfloh.floxboard.whiteboard.api.dto.CreateAccessRequestDto
import de.einfloh.floxboard.whiteboard.api.dto.ResolveAccessRequestDto
import de.einfloh.floxboard.whiteboard.api.dto.SaveWhiteboardRequest
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
class WhiteboardAccessRequestResourceTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @Inject
    lateinit var mailbox: MockMailbox

    @Test
    fun testAccessRequestLifecycleAndNotifications() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")

        // 1. Alice creates a whiteboard
        val saveRequest = SaveWhiteboardRequest(name = "Access Request Board", content = null)
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(saveRequest)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

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
        assertTrue(accessReqMail.html.contains("Access Request Board"))
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

        // Clean up
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$boardId").then().statusCode(204)
    }
}
