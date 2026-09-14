package de.einfloh.floxboard.ai.infrastructure

import com.fasterxml.jackson.databind.ObjectMapper
import de.einfloh.floxboard.ai.domain.AiDiagramGraph
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.inject.Typed
import org.jboss.logging.Logger

@ApplicationScoped
@Typed(LangChain4jAiProviderAdapter::class)
class LangChain4jAiProviderAdapter(
    private val diagramAiService: DiagramAiService,
    private val objectMapper: ObjectMapper
) : AiProviderPort {

    private val log = Logger.getLogger(LangChain4jAiProviderAdapter::class.java)

    override fun generateGraph(prompt: String, category: String?, layoutDirection: String?): AiDiagramGraph {
        return try {
            val raw = diagramAiService.generateGraph(
                prompt = prompt,
                category = category ?: "GENERAL",
                layoutDirection = layoutDirection ?: "HORIZONTAL"
            )
            val json = cleanJson(raw)
            if (json.isBlank()) {
                throw RuntimeException("LangChain4j AI provider returned empty response content")
            }
            objectMapper.readValue(json, AiDiagramGraph::class.java)
        } catch (e: Exception) {
            log.error("Failed to generate AI diagram graph using LangChain4j/Ollama provider: ${e.message}", e)
            if (e is IllegalStateException || e is RuntimeException) {
                throw e
            }
            throw RuntimeException("Error calling LangChain4j AI provider: ${e.message}", e)
        }
    }

    private fun cleanJson(raw: String?): String {
        if (raw == null) return ""
        var trimmed = raw.trim()
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.removePrefix("```json")
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.removePrefix("```")
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.removeSuffix("```")
        }
        return trimmed.trim()
    }
}
