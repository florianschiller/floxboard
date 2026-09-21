package de.einfloh.floxboard.ai.infrastructure

import com.fasterxml.jackson.databind.ObjectMapper
import de.einfloh.floxboard.ai.domain.AiDiagramGraph
import de.einfloh.floxboard.ai.domain.ShapeDescriptor
import de.einfloh.floxboard.ai.domain.ShapeRetriever
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.inject.Typed
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.jboss.logging.Logger
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.*

@ApplicationScoped
@Typed(OpenAiProviderAdapter::class)
class OpenAiProviderAdapter(
    private val objectMapper: ObjectMapper,
    private val shapeRetriever: ShapeRetriever,
    @param:ConfigProperty(name = "floxboard.ai.openai.api-key")
    private val apiKey: Optional<String>,
    @param:ConfigProperty(name = "floxboard.ai.openai.base-url", defaultValue = "https://api.openai.com/v1")
    private val baseUrl: String,
    @param:ConfigProperty(name = "floxboard.ai.openai.model", defaultValue = "gpt-4o-mini")
    private val model: String,
    @param:ConfigProperty(name = "floxboard.ai.temperature", defaultValue = "0.65")
    private val temperature: Double,
    @param:ConfigProperty(name = "floxboard.ai.top-p", defaultValue = "0.95")
    private val topP: Double
) : AiProviderPort {

    private val log = Logger.getLogger(OpenAiProviderAdapter::class.java)
    private val httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build()

    override fun generateGraph(
        prompt: String,
        category: String?,
        layoutDirection: String?,
        candidateShapes: List<ShapeDescriptor>
    ): AiDiagramGraph {
        val configuredKey = apiKey.orElse("").trim()

        if (configuredKey.isBlank()) {
            throw IllegalStateException("OpenAI API key is missing or blank")
        }

        return try {
            val shapes = if (candidateShapes.isNotEmpty()) {
                candidateShapes
            } else {
                shapeRetriever.retrieveShapes(prompt, category)
            }

            val allowedTypes = if (shapes.isNotEmpty()) {
                shapes.map { it.shapeType }.distinct().joinToString("|") { "\"$it\"" }
            } else {
                "\"Rectangle\"|\"Capsule\"|\"Ellipse\"|\"Diamond\"|\"Cylinder\"|\"Cloud\"|\"Queue\"|\"StickyNote\"|\"UmlClass\"|\"AgileStoryCard\"|\"BpmnGateway\"|\"Custom\""
            }

            val shapeCatalogGuidance = if (shapes.isNotEmpty()) {
                shapeRetriever.formatCandidateShapesPrompt(shapes)
            } else {
                """
                Guidelines:
                - For UML/class modeling, use shapeType "UmlClass" with className, stereotype, attributes list, and methods list in properties.
                - For Agile/Sprint boards, use shapeType "AgileStoryCard" with code, title, persona, goal, value, and points in properties, or "StickyNote" for retrospectives.
                - For Cloud/Architecture, use "Cylinder" for databases, "Queue" for message brokers, "Cloud" for external APIs, and containers for VPCs/clusters.
                - For Flowcharts/BPMN, use "Diamond" or "BpmnGateway" for decision points and "Ellipse" for start/end.
                """.trimIndent()
            }

            val systemPrompt = """
                You are an expert software and system diagram generator.
                Analyze the user prompt and generate a structured diagram graph in strictly valid JSON conforming to this schema:
                {
                  "title": "Diagram Title",
                  "nodes": [
                    {
                      "id": "node-1",
                      "label": "Node Label",
                      "shapeType": $allowedTypes,
                      "stencilCategory": "CLOUD_ARCHITECTURE"|"SOFTWARE_DESIGN_UML"|"AGILE_SPRINT"|"FLOWCHART_BPMN"|"GENERAL",
                      "properties": {
                        "className": "User", "stereotype": "<<Entity>>", "attributes": ["- id: UUID", "- email: String"], "methods": ["+ save(): void"],
                        "code": "US-101", "title": "Story Title", "persona": "User", "goal": "Action", "value": "Benefit", "points": 5, "status": "IN_PROGRESS",
                        "title": "MainDB", "subtitle": "PostgreSQL",
                        "gatewayType": "EXCLUSIVE"
                      },
                      "fillColor": "#ffffff",
                      "strokeColor": "#334155",
                      "fillStyle": "solid"|"hachure"|"zigzag"|"dots"|"transparent",
                      "roughness": 0.0,
                      "shadow": false,
                      "containerId": "container-1"
                    }
                  ],
                  "edges": [
                    {
                      "id": "edge-1",
                      "fromNodeId": "node-1",
                      "toNodeId": "node-2",
                      "label": "Relationship / Call",
                      "lineType": "straight"|"curve"|"step",
                      "arrowHead": "arrow"|"solid-arrow"|"diamond"|"crowfoot-many"|"circle"|"none",
                      "strokeColor": "#334155",
                      "strokePattern": "solid"|"dashed"|"dotted"
                    }
                  ],
                  "containers": [
                    { "id": "container-1", "label": "Container Title", "nodeIds": ["node-1"], "fillColor": "rgba(241, 245, 249, 0.5)", "strokeColor": "#94a3b8" }
                  ]
                }
                $shapeCatalogGuidance
                Return ONLY the raw JSON object, without markdown code blocks.
            """.trimIndent()

            val resolvedTemperature = resolveTemperature(category)
            val requestBody = mapOf(
                "model" to model,
                "messages" to listOf(
                    mapOf("role" to "system", "content" to systemPrompt),
                    mapOf("role" to "user", "content" to "Category: ${category ?: "GENERAL"}\nLayout: ${layoutDirection ?: "HORIZONTAL"}\nPrompt: $prompt")
                ),
                "temperature" to resolvedTemperature,
                "top_p" to topP,
                "response_format" to mapOf("type" to "json_object")
            )

            val request = HttpRequest.newBuilder()
                .uri(URI.create("$baseUrl/chat/completions"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer $configuredKey")
                .timeout(Duration.ofSeconds(20))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                .build()

            val response = httpClient.send(request, HttpResponse.BodyHandlers.ofString())
            if (response.statusCode() in 200..299) {
                val jsonNode = objectMapper.readTree(response.body())
                val content = jsonNode.path("choices").get(0)?.path("message")?.path("content")?.asText()
                if (!content.isNullOrBlank()) {
                    objectMapper.readValue(content, AiDiagramGraph::class.java)
                } else {
                    throw RuntimeException("OpenAI API returned empty response content")
                }
            } else {
                throw RuntimeException("OpenAI API call failed with status ${response.statusCode()}: ${response.body()}")
            }
        } catch (e: Exception) {
            if (e is IllegalStateException || e is RuntimeException) {
                throw e
            }
            throw RuntimeException("Error calling OpenAI provider: ${e.message}", e)
        }
    }

    internal fun resolveTemperature(category: String?): Double {
        val base = temperature
        return when (category?.uppercase()) {
            "MIND_MAP", "BRAINSTORM", "AGILE_SPRINT" -> minOf(1.0, base + 0.05)
            "SEQUENCE", "SEQUENCE_FLOW", "DATA_FLOW" -> maxOf(0.1, base - 0.25)
            else -> base
        }
    }
}
