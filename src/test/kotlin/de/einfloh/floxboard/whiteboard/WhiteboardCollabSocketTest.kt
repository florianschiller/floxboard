package de.einfloh.floxboard.whiteboard

import de.einfloh.floxboard.whiteboard.api.AddCollaboratorRequest
import de.einfloh.floxboard.whiteboard.api.SaveWhiteboardRequest
import de.einfloh.floxboard.whiteboard.domain.CollaboratorRole
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.common.http.TestHTTPResource
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.net.URI
import java.net.http.HttpClient
import java.net.http.WebSocket
import java.nio.ByteBuffer
import java.util.*
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CompletionStage
import java.util.concurrent.TimeUnit

@QuarkusTest
class WhiteboardCollabSocketTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @TestHTTPResource("/ws/whiteboards")
    lateinit var wsUri: URI

    @Test
    fun testWebSocketAuthenticationAndRelay() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice", "alice")
        val bobToken = keycloakUserProvider.getAccessToken("bob", "bob")

        val bobParts = bobToken.split(".")
        val bobPayload = com.fasterxml.jackson.databind.ObjectMapper().readTree(Base64.getUrlDecoder().decode(bobParts[1]))
        val bobUserId = bobPayload.get("sub").asText()

        // 1. Alice creates a whiteboard
        val saveRequest = SaveWhiteboardRequest(name = "Socket Test Board", content = null)
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(saveRequest)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // Alice invites Bob as EDITOR
        val bobCollabUserId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(AddCollaboratorRequest(query = bobUserId, role = CollaboratorRole.EDITOR))
            .`when`().post("/api/v1/whiteboards/$boardId/collaborators")
            .then()
            .statusCode(200)
            .extract().path<String>("userId")

        val client = HttpClient.newHttpClient()
        val wsBaseUri = wsUri.toString().replace("http://", "ws://").replace("https://", "wss://")

        // 2. Unauthenticated connection fails
        val unauthCloseFuture = CompletableFuture<Int>()
        client.newWebSocketBuilder()
            .buildAsync(URI.create("$wsBaseUri/$boardId"), object : WebSocket.Listener {
                override fun onClose(webSocket: WebSocket?, statusCode: Int, reason: String?): CompletionStage<*> {
                    unauthCloseFuture.complete(statusCode)
                    return CompletableFuture.completedFuture(null)
                }
                override fun onError(webSocket: WebSocket?, error: Throwable?) {
                    unauthCloseFuture.complete(4401)
                }
            })
        val unauthStatus = unauthCloseFuture.get(5, TimeUnit.SECONDS)
        assertTrue(unauthStatus == 4401 || unauthStatus == 1008 || unauthStatus == 1002 || unauthStatus == 4403)

        // 3. Alice and Bob connect successfully
        val aliceReceivedMessages = CompletableFuture<String>()
        val bobCloseFuture = CompletableFuture<Int>()

        val aliceWs = client.newWebSocketBuilder()
            .buildAsync(URI.create("$wsBaseUri/$boardId?token=$aliceToken"), object : WebSocket.Listener {
                override fun onText(webSocket: WebSocket?, data: CharSequence?, last: Boolean): CompletionStage<*> {
                    aliceReceivedMessages.complete(data.toString())
                    return CompletableFuture.completedFuture(null)
                }
            }).get(5, TimeUnit.SECONDS)

        val bobWs = client.newWebSocketBuilder()
            .buildAsync(URI.create("$wsBaseUri/$boardId?token=$bobToken"), object : WebSocket.Listener {
                override fun onClose(webSocket: WebSocket?, statusCode: Int, reason: String?): CompletionStage<*> {
                    bobCloseFuture.complete(statusCode)
                    return CompletableFuture.completedFuture(null)
                }
            }).get(5, TimeUnit.SECONDS)

        // 4. Bob sends a text message -> Alice receives it
        bobWs.sendText("""{"type":"test","data":"hello alice"}""", true).get(5, TimeUnit.SECONDS)
        val msg = aliceReceivedMessages.get(5, TimeUnit.SECONDS)
        assertEquals("""{"type":"test","data":"hello alice"}""", msg)

        // 5. Alice removes Bob's access -> Bob is evicted with close code 4403
        given()
            .auth().oauth2(aliceToken)
            .`when`().delete("/api/v1/whiteboards/$boardId/collaborators/$bobCollabUserId")
            .then()
            .statusCode(204)

        val bobEvictCode = bobCloseFuture.get(5, TimeUnit.SECONDS)
        assertEquals(4403, bobEvictCode)

        aliceWs.sendClose(WebSocket.NORMAL_CLOSURE, "Done").get(5, TimeUnit.SECONDS)
    }
}
