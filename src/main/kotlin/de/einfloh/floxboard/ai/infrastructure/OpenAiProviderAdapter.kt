package de.einfloh.floxboard.ai.infrastructure

import com.fasterxml.jackson.databind.ObjectMapper
import de.einfloh.floxboard.ai.domain.AiDiagramGraph
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
    @param:ConfigProperty(name = "floxboard.ai.openai.api-key")
    private val apiKey: Optional<String>,
    @param:ConfigProperty(name = "floxboard.ai.openai.base-url", defaultValue = "https://api.openai.com/v1")
    private val baseUrl: String,
    @param:ConfigProperty(name = "floxboard.ai.openai.model", defaultValue = "gpt-4o-mini")
    private val model: String
) : AiProviderPort {

    private val log = Logger.getLogger(OpenAiProviderAdapter::class.java)
    private val httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build()

    override fun generateGraph(prompt: String, category: String?, layoutDirection: String?): AiDiagramGraph {
        val configuredKey = apiKey.orElse("").trim()

        if (configuredKey.isBlank()) {
            throw IllegalStateException("OpenAI API key is missing or blank")
        }

        return try {
            val systemPrompt = """
                You are an expert software and system diagram generator.
                Analyze the user prompt and generate a structured diagram graph in strictly valid JSON conforming to this schema:
                {
                  "title": "Diagram Title",
                  "nodes": [
                    { "id": "node-1", "label": "Node Label", "shapeType": "Rectangle"|"Ellipse", "fillColor": "#ffffff", "strokeColor": "#334155", "containerId": "container-1" }
                  ],
                  "edges": [
                    { "id": "edge-1", "fromNodeId": "node-1", "toNodeId": "node-2", "label": "Relationship", "lineType": "straight", "arrowHead": "arrow" }
                  ],
                  "containers": [
                    { "id": "container-1", "label": "Container Title", "nodeIds": ["node-1"] }
                  ]
                }
                Return ONLY the raw JSON object, without markdown code blocks.
            """.trimIndent()

            val requestBody = mapOf(
                "model" to model,
                "messages" to listOf(
                    mapOf("role" to "system", "content" to systemPrompt),
                    mapOf("role" to "user", "content" to "Category: ${category ?: "GENERAL"}\nLayout: ${layoutDirection ?: "HORIZONTAL"}\nPrompt: $prompt")
                ),
                "temperature" to 0.2,
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
}
