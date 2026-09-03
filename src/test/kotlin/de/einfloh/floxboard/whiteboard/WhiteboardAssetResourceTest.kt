package de.einfloh.floxboard.whiteboard

import de.einfloh.floxboard.whiteboard.api.dto.SaveWhiteboardRequest
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.hamcrest.CoreMatchers.`is`
import org.hamcrest.CoreMatchers.notNullValue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@QuarkusTest
class WhiteboardAssetResourceTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @BeforeEach
    fun cleanUp() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val aliceBoards = given().auth().oauth2(aliceToken).`when`().get("/api/v1/whiteboards?max=100").then().extract().jsonPath().getList<Map<String, Any>>("$")
        for (b in aliceBoards) {
            val id = b["id"]
            given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$id")
        }

        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")
        val bobBoards = given().auth().oauth2(bobToken).`when`().get("/api/v1/whiteboards?max=100").then().extract().jsonPath().getList<Map<String, Any>>("$")
        for (b in bobBoards) {
            val id = b["id"]
            given().auth().oauth2(bobToken).`when`().delete("/api/v1/whiteboards/$id")
        }
    }

    @Test
    fun testAssetUploadAndRetrievalLifecycle() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")

        // 1. Alice creates a whiteboard
        val saveRequest = SaveWhiteboardRequest(name = "Image Board", content = null)
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(saveRequest)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 2. Alice uploads a valid PNG image
        val imageBytes = "fake png image content bytes 123456789".toByteArray()
        val uploadResponse = given()
            .auth().oauth2(aliceToken)
            .multiPart("file", "test-image.png", imageBytes, "image/png")
            .`when`().post("/api/v1/whiteboards/$boardId/assets")
            .then()
            .statusCode(201)
            .body("assetId", notNullValue())
            .body("url", notNullValue())
            .body("contentType", `is`("image/png"))
            .body("size", `is`(imageBytes.size))
            .extract().response()

        val assetId = uploadResponse.path<String>("assetId")
        val url = uploadResponse.path<String>("url")

        // 3. Alice downloads the asset with auth
        val downloadedBytes = given()
            .auth().oauth2(aliceToken)
            .`when`().get(url)
            .then()
            .statusCode(200)
            .header("Content-Type", `is`("image/png"))
            .header("Cache-Control", `is`("public, max-age=31536000, immutable"))
            .header("ETag", `is`("\"$assetId\""))
            .extract().asByteArray()

        org.junit.jupiter.api.Assertions.assertArrayEquals(imageBytes, downloadedBytes)

        // 4. Anonymous/Browser request without Authorization header can load the image
        val anonDownloadedBytes = given()
            .`when`().get(url)
            .then()
            .statusCode(200)
            .header("Content-Type", `is`("image/png"))
            .extract().asByteArray()

        org.junit.jupiter.api.Assertions.assertArrayEquals(imageBytes, anonDownloadedBytes)

        // 5. Bob (or any user loading the board) can also view/download the asset
        given()
            .auth().oauth2(bobToken)
            .`when`().get(url)
            .then()
            .statusCode(200)
            .header("Content-Type", `is`("image/png"))

        // 6. Anonymous cannot upload assets (must be authenticated)
        given()
            .multiPart("file", "anon-image.png", imageBytes, "image/png")
            .`when`().post("/api/v1/whiteboards/$boardId/assets")
            .then()
            .statusCode(401)

        // 7. Bob as non-collaborator cannot upload assets
        given()
            .auth().oauth2(bobToken)
            .multiPart("file", "bob-image.png", imageBytes, "image/png")
            .`when`().post("/api/v1/whiteboards/$boardId/assets")
            .then()
            .statusCode(403)

        // 8. Alice invites Bob as VIEWER
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(mapOf("query" to "bob@floxboard.io", "role" to "VIEWER"))
            .`when`().post("/api/v1/whiteboards/$boardId/collaborators")
            .then()
            .statusCode(200)

        // 9. Bob as VIEWER still cannot upload or delete assets
        given()
            .auth().oauth2(bobToken)
            .multiPart("file", "bob-image.png", imageBytes, "image/png")
            .`when`().post("/api/v1/whiteboards/$boardId/assets")
            .then()
            .statusCode(403)

        given()
            .auth().oauth2(bobToken)
            .`when`().delete("/api/v1/whiteboards/$boardId/assets/$assetId")
            .then()
            .statusCode(403)

        // 10. Alice deletes the asset
        given()
            .auth().oauth2(aliceToken)
            .`when`().delete("/api/v1/whiteboards/$boardId/assets/$assetId")
            .then()
            .statusCode(204)

        // 11. Asset is now 404
        given()
            .auth().oauth2(aliceToken)
            .`when`().get(url)
            .then()
            .statusCode(404)

        // Cleanup board
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$boardId").then().statusCode(204)
    }

    @Test
    fun testAssetUploadValidation() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        val saveRequest = SaveWhiteboardRequest(name = "Validation Board", content = null)
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(saveRequest)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // Upload invalid file type
        val textBytes = "hello world plain text".toByteArray()
        given()
            .auth().oauth2(aliceToken)
            .multiPart("file", "document.txt", textBytes, "text/plain")
            .`when`().post("/api/v1/whiteboards/$boardId/assets")
            .then()
            .statusCode(400)

        // Clean up
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$boardId").then().statusCode(204)
    }
}
