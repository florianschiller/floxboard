package de.einfloh.floxboard.ai

import de.einfloh.floxboard.license.domain.*
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.hamcrest.CoreMatchers.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@QuarkusTest
class AiDiagramResourceTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @Inject
    lateinit var licenseValidator: LicenseValidator

    @Inject
    lateinit var quotaUsageRepository: QuotaUsageRepository

    @Inject
    lateinit var usageLedgerService: UsageLedgerService

    @Inject
    lateinit var snapshotRepository: de.einfloh.floxboard.whiteboard.domain.WhiteboardSnapshotRepository

    @Inject
    lateinit var userTransaction: jakarta.transaction.UserTransaction

    @BeforeEach
    fun cleanUp() {
        try {
            userTransaction.begin()
            quotaUsageRepository.deleteAll()
            userTransaction.commit()
        } catch (e: Exception) {
            try { userTransaction.rollback() } catch (_: Exception) {}
        }
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/license")
    }

    @Test
    fun testFreePlanUserCannotGenerateDiagram() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(
                mapOf(
                    "prompt" to "Microservices architecture with API Gateway and Auth Service",
                    "category" to "ARCHITECTURE"
                )
            )
            .`when`()
            .post("/api/v1/ai/text-to-diagram")
            .then()
            .statusCode(403)
    }

    @Test
    fun testProPlanUserDiagramGenerationAndCreditDeduction() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        // 1. Activate PRO license
        val proPayload = LicensePayload(
            plan = LicensePlan.PRO,
            features = mapOf("ai:text_to_diagram" to true),
            quotas = mapOf("ai:monthly_credits" to QuotaDefinition(limit = 1000, period = QuotaPeriod.MONTHLY)),
            validUntil = Instant.now().plus(30, ChronoUnit.DAYS)
        )
        val signedKey = licenseValidator.generateSignedToken(proPayload)

        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(mapOf("licenseKey" to signedKey))
            .`when`()
            .post("/api/v1/license/activate")
            .then()
            .statusCode(200)

        // 2. Check Credit Estimate
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(mapOf("prompt" to "Simple login flowchart", "category" to "FLOWCHART"))
            .`when`()
            .post("/api/v1/ai/credits/estimate")
            .then()
            .statusCode(200)
            .body("estimatedCredits", notNullValue())
            .body("isAllowed", `is`(true))

        // 3. Check Initial Balance
        given()
            .auth().oauth2(aliceToken)
            .`when`()
            .get("/api/v1/ai/credits/balance")
            .then()
            .statusCode(200)
            .body("limit", `is`(1000))
            .body("currentUsage", notNullValue())

        // 4. Generate Diagram
        val response = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(
                mapOf(
                    "prompt" to "Microservices architecture with API Gateway, Auth Service, and PostgreSQL",
                    "category" to "ARCHITECTURE",
                    "layoutDirection" to "HORIZONTAL"
                )
            )
            .`when`()
            .post("/api/v1/ai/text-to-diagram")
            .then()
            .statusCode(200)
            .body("success", `is`(true))
            .body("shapeCount", notNullValue())
            .body("connectorCount", notNullValue())
            .body("creditsConsumed", notNullValue())
            .body("remainingCredits", notNullValue())
            .body("doc.type", `is`("Doc"))
            .extract()
            .response()

        val creditsConsumed = response.jsonPath().getLong("creditsConsumed")
        val remainingCredits = response.jsonPath().getLong("remainingCredits")
        assertTrue(creditsConsumed >= 10L)
        assertEquals(1000L - creditsConsumed, remainingCredits)
    }

    @Test
    fun testEmptyPromptReturnsBadRequest() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        // Activate PRO license
        val proPayload = LicensePayload(
            plan = LicensePlan.PRO,
            features = mapOf("ai:text_to_diagram" to true),
            quotas = mapOf("ai:monthly_credits" to QuotaDefinition(limit = 1000, period = QuotaPeriod.MONTHLY)),
            validUntil = Instant.now().plus(30, ChronoUnit.DAYS)
        )
        val signedKey = licenseValidator.generateSignedToken(proPayload)
        given().auth().oauth2(aliceToken).contentType(ContentType.JSON).body(mapOf("licenseKey" to signedKey)).post("/api/v1/license/activate")

        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(mapOf("prompt" to "   "))
            .`when`()
            .post("/api/v1/ai/text-to-diagram")
            .then()
            .statusCode(400)
    }

    @Test
    fun testProPlanUserDiagramGenerationWithWhiteboardSnapshot() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        // 1. Activate PRO license
        val proPayload = LicensePayload(
            plan = LicensePlan.PRO,
            features = mapOf("ai:text_to_diagram" to true),
            quotas = mapOf("ai:monthly_credits" to QuotaDefinition(limit = 1000, period = QuotaPeriod.MONTHLY)),
            validUntil = Instant.now().plus(30, ChronoUnit.DAYS)
        )
        val signedKey = licenseValidator.generateSignedToken(proPayload)
        given().auth().oauth2(aliceToken).contentType(ContentType.JSON).body(mapOf("licenseKey" to signedKey)).post("/api/v1/license/activate")

        // 2. Create a whiteboard
        val whiteboardIdStr = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(mapOf("name" to "AI Test Board"))
            .`when`()
            .post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract()
            .path<String>("id")

        val whiteboardId = UUID.fromString(whiteboardIdStr)

        // 3. Generate AI Diagram with whiteboardId
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(
                mapOf(
                    "prompt" to "Customer order processing workflow",
                    "category" to "FLOWCHART",
                    "whiteboardId" to whiteboardIdStr
                )
            )
            .`when`()
            .post("/api/v1/ai/text-to-diagram")
            .then()
            .statusCode(200)
            .body("success", `is`(true))

        // 4. Verify snapshot was persisted
        val snapshots = snapshotRepository.findByWhiteboard(whiteboardId)
        assertTrue(snapshots.isNotEmpty())
        val aiSnapshot = snapshots.first()
        assertTrue(aiSnapshot.isAutomatic)
        assertTrue(aiSnapshot.isGeneratedByAI)
        assertNotNull(aiSnapshot.content)

        // Clean up whiteboard
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$whiteboardIdStr")
    }
}
