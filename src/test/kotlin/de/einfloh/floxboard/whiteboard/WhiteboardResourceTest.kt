package de.einfloh.floxboard.whiteboard

import de.einfloh.floxboard.whiteboard.api.dto.SaveWhiteboardRequest
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.hamcrest.CoreMatchers.*
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.util.*

@QuarkusTest
class WhiteboardResourceTest {

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
    fun testWhiteboardLifecycle() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        // 1. List - should be empty
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(0))

        // 2. Save
        val saveRequest = SaveWhiteboardRequest(name = "My Whiteboard", content = null)
        val id = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(saveRequest)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("name", `is`("My Whiteboard"))
            .body("createdAt", notNullValue())
            .body("updatedAt", notNullValue())
            .extract().path<String>("id")

        // 3. List - should have 1 item
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(1))
            .body("[0].id", `is`(id))
            .body("[0].name", `is`("My Whiteboard"))
            .body("[0].createdAt", notNullValue())
            .body("[0].updatedAt", notNullValue())

        // 4. Get Single
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$id")
            .then()
            .statusCode(200)
            .body("id", `is`(id))
            .body("content", nullValue())
            .body("createdAt", notNullValue())
            .body("updatedAt", notNullValue())

        // 5. Delete
        given()
            .auth().oauth2(aliceToken)
            .`when`().delete("/api/v1/whiteboards/$id")
            .then()
            .statusCode(204)

        // 6. List - should be empty again
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(0))
    }

    @Test
    fun testDataIsolation() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        // Alice saves a whiteboard
        val aliceRequest = SaveWhiteboardRequest(name = "Alice Board", content = null)
        given()
            .contentType(ContentType.JSON)
            .auth().oauth2(aliceToken)
            .body(aliceRequest)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")
        // Assuming Alice already ran or we isolation by default
        // In QuarkusTest, data might persist between methods if not careful,
        // but ownerId check should handle it anyway.
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(0))
    }

    @Test
    fun testDuplicateWhiteboardName() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")

        // 1. Alice creates "DuplicateTest"
        val req1 = SaveWhiteboardRequest(name = "DuplicateTest", content = null)
        val aliceId1 = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(req1)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 2. Alice tries to create another whiteboard with the same name "DuplicateTest" -> 409 Conflict
        val req2 = SaveWhiteboardRequest(name = "DuplicateTest", content = null)
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(req2)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(409)

        // 3. Bob creates whiteboard with same name "DuplicateTest" -> 200 OK (different user)
        val bobReq = SaveWhiteboardRequest(name = "DuplicateTest", content = null)
        val bobId = given()
            .auth().oauth2(bobToken)
            .contentType(ContentType.JSON)
            .body(bobReq)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 4. Alice updates her board keeping the same name -> 200 OK
        val aliceUpdateSameName = SaveWhiteboardRequest(id = UUID.fromString(aliceId1), name = "DuplicateTest", content = null)
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(aliceUpdateSameName)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)

        // 5. Alice creates a second board "SecondBoard"
        val req3 = SaveWhiteboardRequest(name = "SecondBoard", content = null)
        val aliceId2 = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(req3)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 6. Alice tries to rename "SecondBoard" to "DuplicateTest" -> 409 Conflict
        val aliceRenameToDuplicate = SaveWhiteboardRequest(id = UUID.fromString(aliceId2), name = "DuplicateTest", content = null)
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(aliceRenameToDuplicate)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(409)

        // Clean up
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$aliceId1").then().statusCode(204)
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$aliceId2").then().statusCode(204)
        given().auth().oauth2(bobToken).`when`().delete("/api/v1/whiteboards/$bobId").then().statusCode(204)
    }

    @Test
    fun testTimestampOrdering() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        // 1. Create Board 1
        val id1 = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "Order Board 1", content = null))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // Slight sleep to guarantee different timestamp if necessary
        Thread.sleep(50)

        // 2. Create Board 2
        val id2 = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "Order Board 2", content = null))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        Thread.sleep(50)

        // 3. Create Board 3
        val id3 = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "Order Board 3", content = null))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // List should return Board 3, Board 2, Board 1
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .body("[0].id", `is`(id3))
            .body("[0].name", `is`("Order Board 3"))
            .body("[1].id", `is`(id2))
            .body("[1].name", `is`("Order Board 2"))
            .body("[2].id", `is`(id1))
            .body("[2].name", `is`("Order Board 1"))

        Thread.sleep(50)

        // 4. Update Board 1 -> it should become the latest
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(id = UUID.fromString(id1), name = "Order Board 1", content = null))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)

        // List should return Board 1, Board 3, Board 2
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .body("[0].id", `is`(id1))
            .body("[0].name", `is`("Order Board 1"))
            .body("[1].id", `is`(id3))
            .body("[1].name", `is`("Order Board 3"))
            .body("[2].id", `is`(id2))
            .body("[2].name", `is`("Order Board 2"))

        // Clean up
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$id1").then().statusCode(204)
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$id2").then().statusCode(204)
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$id3").then().statusCode(204)
    }

    @Test
    fun testPagination() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        val ids = mutableListOf<String>()
        for (i in 1..7) {
            val id = given()
                .auth().oauth2(aliceToken)
                .contentType(ContentType.JSON)
                .body(SaveWhiteboardRequest(name = "Paginated Board $i", content = null))
                .`when`().post("/api/v1/whiteboards")
                .then()
                .statusCode(200)
                .extract().path<String>("id")
            ids.add(id)
            Thread.sleep(20)
        }

        // Boards in descending update order: 7, 6, 5, 4, 3, 2, 1

        // Default query without parameters should return default max = 5 items
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(5))
            .body("[0].name", `is`("Paginated Board 7"))
            .body("[4].name", `is`("Paginated Board 3"))

        // start=0, max=3 -> Boards 7, 6, 5
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards?start=0&max=3")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(3))
            .body("[0].name", `is`("Paginated Board 7"))
            .body("[1].name", `is`("Paginated Board 6"))
            .body("[2].name", `is`("Paginated Board 5"))

        // start=3, max=3 -> Boards 4, 3, 2
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards?start=3&max=3")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(3))
            .body("[0].name", `is`("Paginated Board 4"))
            .body("[1].name", `is`("Paginated Board 3"))
            .body("[2].name", `is`("Paginated Board 2"))

        // start=6, max=3 -> Board 1
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards?start=6&max=3")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(1))
            .body("[0].name", `is`("Paginated Board 1"))

        // start=7, max=3 -> empty
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards?start=7&max=3")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(0))

        // Cleanup
        for (id in ids) {
            given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$id").then().statusCode(204)
        }
    }

    @Test
    fun testSearchUsers() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        // Search for "bob"
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/users?q=bob")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(1))
            .body("[0].username", `is`("bob@floxboard.io"))

        // Search empty
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/users?q=")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(0))
    }

    @Test
    fun testWhiteboardWithConcreteDgmContent() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        val doc = de.einfloh.floxboard.whiteboard.domain.dgm.Doc().apply {
            id = "test-doc-1"
            version = 1
            children = mutableListOf(
                de.einfloh.floxboard.whiteboard.domain.dgm.Page().apply {
                    id = "page-1"
                    size = mutableListOf(1920.0, 1080.0)
                    children = mutableListOf(
                        de.einfloh.floxboard.whiteboard.domain.dgm.Rectangle().apply {
                            id = "rect-1"
                            left = 50.0
                            top = 100.0
                            width = 200.0
                            height = 80.0
                            fillColor = "#3b82f6"
                            text = "DGM Test Rect"
                        },
                        de.einfloh.floxboard.whiteboard.domain.dgm.Connector().apply {
                            id = "conn-1"
                            head = "rect-1"
                            headMargin = 10.0
                        }
                    )
                }
            )
        }

        val saveRequest = SaveWhiteboardRequest(name = "DGM Board", content = doc)
        val id = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(saveRequest)
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("content.id", `is`("test-doc-1"))
            .body("content.type", `is`("Doc"))
            .body("content.version", `is`(1))
            .body("content.children[0].type", `is`("Page"))
            .body("content.children[0].children[0].type", `is`("Rectangle"))
            .body("content.children[0].children[0].text", `is`("DGM Test Rect"))
            .body("content.children[0].children[1].type", `is`("Connector"))
            .body("content.children[0].children[1].head", `is`("rect-1"))
            .extract().path<String>("id")

        // Retrieve board
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$id")
            .then()
            .statusCode(200)
            .body("id", `is`(id))
            .body("name", `is`("DGM Board"))
            .body("content.id", `is`("test-doc-1"))
            .body("content.type", `is`("Doc"))
            .body("content.children[0].type", `is`("Page"))
            .body("content.children[0].children[0].type", `is`("Rectangle"))
            .body("content.children[0].children[0].text", `is`("DGM Test Rect"))
            .body("content.children[0].children[1].type", `is`("Connector"))

        // Clean up
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$id").then().statusCode(204)
    }
}
