package de.einfloh.floxboard.whiteboard

import de.einfloh.floxboard.whiteboard.api.dto.CreateShapeLibraryRequest
import de.einfloh.floxboard.whiteboard.api.dto.CreateShapeStencilRequest
import de.einfloh.floxboard.whiteboard.api.dto.UpdateShapeLibraryRequest
import de.einfloh.floxboard.whiteboard.domain.StencilCategory
import de.einfloh.floxboard.whiteboard.domain.StencilPermission
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
class ShapeLibraryResourceTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @BeforeEach
    fun cleanUp() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val aliceLibs = given().auth().oauth2(aliceToken).`when`().get("/api/v1/shape-libraries").then().extract().jsonPath().getList<Map<String, Any>>("$")
        for (lib in aliceLibs) {
            val id = lib["id"]
            given().auth().oauth2(aliceToken).`when`().delete("/api/v1/shape-libraries/$id")
        }

        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")
        val bobLibs = given().auth().oauth2(bobToken).`when`().get("/api/v1/shape-libraries").then().extract().jsonPath().getList<Map<String, Any>>("$")
        for (lib in bobLibs) {
            val id = lib["id"]
            given().auth().oauth2(bobToken).`when`().delete("/api/v1/shape-libraries/$id")
        }
    }

    @Test
    fun testShapeLibraryLifecycle() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        // 1. Initially empty
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/shape-libraries")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(0))

        // 2. Create personal library
        val createRequest = CreateShapeLibraryRequest(
            name = "Sprint Engineering Assets",
            description = "Custom agile stencils and architecture blocks",
            categories = listOf(StencilCategory.AGILE_SPRINT, StencilCategory.SOFTWARE_DESIGN_UML),
            defaultRole = StencilPermission.READ
        )

        val libId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(createRequest)
            .`when`().post("/api/v1/shape-libraries")
            .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("name", `is`("Sprint Engineering Assets"))
            .body("description", `is`("Custom agile stencils and architecture blocks"))
            .extract().path<String>("id")

        // 3. List contains 1 library
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/shape-libraries")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(1))
            .body("[0].id", `is`(libId))
            .body("[0].name", `is`("Sprint Engineering Assets"))

        // 4. Add a stencil
        val stencilRequest = CreateShapeStencilRequest(
            name = "User Story Estimation Card",
            category = StencilCategory.AGILE_SPRINT,
            description = "Card with story points badge",
            shapesJson = "[{\"type\":\"Rectangle\",\"left\":0,\"top\":0,\"width\":200,\"height\":100}]",
            thumbnailSvg = "<svg><rect width=\"100\" height=\"50\" /></svg>"
        )

        val stencilId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(stencilRequest)
            .`when`().post("/api/v1/shape-libraries/$libId/stencils")
            .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("name", `is`("User Story Estimation Card"))
            .body("category", `is`("AGILE_SPRINT"))
            .extract().path<String>("id")

        // 5. Get library details including stencils
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/shape-libraries/$libId")
            .then()
            .statusCode(200)
            .body("id", `is`(libId))
            .body("stencils", hasSize<Int>(1))
            .body("stencils[0].id", `is`(stencilId))
            .body("stencils[0].name", `is`("User Story Estimation Card"))

        // 6. Update library metadata
        val updateRequest = UpdateShapeLibraryRequest(
            name = "Updated Agile Stencils",
            description = "New description"
        )
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(updateRequest)
            .`when`().put("/api/v1/shape-libraries/$libId")
            .then()
            .statusCode(200)
            .body("name", `is`("Updated Agile Stencils"))
            .body("description", `is`("New description"))

        // 7. Delete stencil
        given()
            .auth().oauth2(aliceToken)
            .`when`().delete("/api/v1/shape-libraries/$libId/stencils/$stencilId")
            .then()
            .statusCode(204)

        // 8. Verify stencil deleted
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/shape-libraries/$libId")
            .then()
            .statusCode(200)
            .body("stencils", hasSize<Int>(0))

        // 9. Delete library
        given()
            .auth().oauth2(aliceToken)
            .`when`().delete("/api/v1/shape-libraries/$libId")
            .then()
            .statusCode(204)

        // 10. List empty again
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/shape-libraries")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(0))
    }

    @Test
    fun testShapeLibraryDataIsolation() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")

        // Alice creates a personal library
        val createRequest = CreateShapeLibraryRequest(
            name = "Alice Private Library",
            description = "Secret designs",
            categories = listOf(StencilCategory.CLOUD_ARCHITECTURE)
        )

        val aliceLibId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(createRequest)
            .`when`().post("/api/v1/shape-libraries")
            .then()
            .statusCode(201)
            .extract().path<String>("id")

        // Bob lists libraries - should not see Alice's private library
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/shape-libraries")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(0))

        // Bob tries to GET Alice's library directly - should get 403 or 404
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/shape-libraries/$aliceLibId")
            .then()
            .statusCode(anyOf(`is`(403), `is`(404)))

        // Bob tries to add a stencil to Alice's library - should get 403 or 404
        val bobStencil = CreateShapeStencilRequest(
            name = "Bob Injected Stencil",
            shapesJson = "[]"
        )
        given()
            .auth().oauth2(bobToken)
            .contentType(ContentType.JSON)
            .body(bobStencil)
            .`when`().post("/api/v1/shape-libraries/$aliceLibId/stencils")
            .then()
            .statusCode(anyOf(`is`(403), `is`(404)))

        // Bob tries to DELETE Alice's library - should get 403 or 404
        given()
            .auth().oauth2(bobToken)
            .`when`().delete("/api/v1/shape-libraries/$aliceLibId")
            .then()
            .statusCode(anyOf(`is`(403), `is`(404)))
    }

    @Test
    fun testValidationErrors() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        // Blank name should return 400
        val invalidCreate = CreateShapeLibraryRequest(name = "   ")
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(invalidCreate)
            .`when`().post("/api/v1/shape-libraries")
            .then()
            .statusCode(400)
    }
}
