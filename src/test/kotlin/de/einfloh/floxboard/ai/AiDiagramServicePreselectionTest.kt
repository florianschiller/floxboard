package de.einfloh.floxboard.ai

import de.einfloh.floxboard.ai.domain.AiCreditEstimateRequest
import de.einfloh.floxboard.ai.domain.AiDiagramRequest
import de.einfloh.floxboard.ai.domain.AiDiagramService
import de.einfloh.floxboard.ai.domain.ShapeRetriever
import de.einfloh.floxboard.license.domain.LicensePayload
import de.einfloh.floxboard.license.domain.LicensePlan
import de.einfloh.floxboard.license.domain.LicenseValidator
import de.einfloh.floxboard.license.domain.QuotaDefinition
import de.einfloh.floxboard.license.domain.QuotaPeriod
import de.einfloh.floxboard.license.domain.QuotaUsageRepository
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import jakarta.transaction.UserTransaction
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@QuarkusTest
class AiDiagramServicePreselectionTest {

    @Inject
    lateinit var aiDiagramService: AiDiagramService

    @Inject
    lateinit var shapeRetriever: ShapeRetriever

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @Inject
    lateinit var licenseValidator: LicenseValidator

    @Inject
    lateinit var quotaUsageRepository: QuotaUsageRepository

    @Inject
    lateinit var userTransaction: UserTransaction

    private var aliceId: UUID = UUID.fromString("00000000-0000-0000-0000-000000000001")

    @BeforeEach
    fun setUp() {
        try {
            userTransaction.begin()
            quotaUsageRepository.deleteAll()
            userTransaction.commit()
        } catch (e: Exception) {
            try { userTransaction.rollback() } catch (_: Exception) {}
        }

        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/license")

        val payloadBase64 = aliceToken.split(".")[1]
        val payloadJson = String(java.util.Base64.getUrlDecoder().decode(payloadBase64))
        aliceId = UUID.fromString(com.fasterxml.jackson.databind.ObjectMapper().readTree(payloadJson).get("sub").asText())

        // Activate PRO license for Alice
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
    }

    @Test
    fun `test shape retriever preselects relevant cloud shapes before generation`() {
        val prompt = "Serverless event pipeline with lambda, sqs queue and s3 bucket"
        val candidateShapes = shapeRetriever.retrieveShapes(prompt, "CLOUD_ARCHITECTURE", topK = 6)

        assertTrue(candidateShapes.isNotEmpty())
        val shapeTypes = candidateShapes.map { it.shapeType }.toSet()
        assertTrue(shapeTypes.contains("Cylinder") || shapeTypes.contains("Queue") || shapeTypes.contains("Capsule"))

        val request = AiDiagramRequest(
            prompt = prompt,
            category = "CLOUD_ARCHITECTURE",
            layoutDirection = "HORIZONTAL"
        )

        val result = aiDiagramService.generateDiagram(aliceId, request)
        assertTrue(result.success)
        assertTrue(result.shapeCount > 0)
        assertTrue(result.creditsConsumed > 0)
        assertTrue(result.remainingCredits < 1000L)
    }

    @Test
    fun `test shape retriever preselects uml class shapes for domain model`() {
        val prompt = "User account entity with methods and attributes"
        val candidateShapes = shapeRetriever.retrieveShapes(prompt, "SOFTWARE_DESIGN_UML", topK = 5)

        assertTrue(candidateShapes.any { it.shapeType == "UmlClass" })

        val request = AiDiagramRequest(
            prompt = prompt,
            category = "SOFTWARE_DESIGN_UML",
            layoutDirection = "HORIZONTAL"
        )

        val result = aiDiagramService.generateDiagram(aliceId, request)
        assertTrue(result.success)
        assertTrue(result.shapeCount > 0)
        assertTrue(result.creditsConsumed > 0)
    }

    @Test
    fun `test credit estimate remains deterministic and non-transactional`() {
        val estimate = aiDiagramService.estimateCredits(
            aliceId,
            AiCreditEstimateRequest(prompt = "Simple agile retro board", category = "AGILE_SPRINT")
        )

        assertTrue(estimate.isAllowed)
        assertTrue(estimate.estimatedCredits >= 30L)
        assertTrue(estimate.remainingCredits >= 0L)
    }
}
