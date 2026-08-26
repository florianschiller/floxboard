package de.einfloh.floxboard.user

import de.einfloh.floxboard.user.api.UpdateProfileRequest
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.hamcrest.CoreMatchers.`is`
import org.hamcrest.CoreMatchers.notNullValue
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

@QuarkusTest
class UserResourceTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @Test
    fun testGetProfile() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice", "alice")

        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/user/me")
            .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("username", `is`("alice"))
            .body("email", `is`("alice@floxboard.io"))
            .body("emailVerified", `is`(true))
            .body("roles", notNullValue())
    }

    @Test
    fun testUpdateProfile() {
        val bobToken = keycloakUserProvider.getAccessToken("bob", "bob")

        // Update Bob's first and last name
        given()
            .auth().oauth2(bobToken)
            .contentType(ContentType.JSON)
            .body(UpdateProfileRequest(firstName = "Robert", lastName = "Builder"))
            .`when`().put("/api/v1/user/me")
            .then()
            .statusCode(200)
            .body("firstName", `is`("Robert"))
            .body("lastName", `is`("Builder"))
            .body("username", `is`("bob"))

        // Verify fetching profile reflects the change
        val profile = given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/user/me")
            .then()
            .statusCode(200)
            .extract().jsonPath()

        assertEquals("Robert", profile.getString("firstName"))
        assertEquals("Builder", profile.getString("lastName"))

        // Reset Bob's name back
        given()
            .auth().oauth2(bobToken)
            .contentType(ContentType.JSON)
            .body(UpdateProfileRequest(firstName = "Bob", lastName = "User"))
            .`when`().put("/api/v1/user/me")
            .then()
            .statusCode(200)
    }

    @Test
    fun testUnauthorizedAccess() {
        given()
            .`when`().get("/api/v1/user/me")
            .then()
            .statusCode(401)

        given()
            .contentType(ContentType.JSON)
            .body(UpdateProfileRequest(firstName = "Hacker", lastName = "Man"))
            .`when`().put("/api/v1/user/me")
            .then()
            .statusCode(401)
    }
}
