package de.einfloh.floxboard.ai.infrastructure

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.util.Optional

class AiProviderProducerTest {

    private val objectMapper = ObjectMapper().findAndRegisterModules()
    private val mockAdapter = MockAiProviderAdapter()
    private val openAiAdapter = OpenAiProviderAdapter(
        objectMapper = objectMapper,
        apiKey = Optional.empty(),
        baseUrl = "https://api.openai.com/v1",
        model = "gpt-4o-mini"
    )
    private val fakeAiService = object : DiagramAiService {
        override fun generateGraph(prompt: String, category: String, layoutDirection: String): String {
            return """
                {
                  "title": "Test Diagram",
                  "nodes": [
                    { "id": "node-1", "label": "Service A", "shapeType": "Rectangle", "fillColor": "#ffffff", "strokeColor": "#334155" }
                  ],
                  "edges": [],
                  "containers": []
                }
            """.trimIndent()
        }
    }
    private val langChain4jAdapter = LangChain4jAiProviderAdapter(
        diagramAiService = fakeAiService,
        objectMapper = objectMapper
    )

    @Test
    fun testResolvesLangChain4jProvider() {
        val producer = AiProviderProducer(mockAdapter, openAiAdapter, langChain4jAdapter, "langchain4j")
        val provider = producer.aiProvider()
        assertSame(langChain4jAdapter, provider)
    }

    @Test
    fun testResolvesOllamaProvider() {
        val producer = AiProviderProducer(mockAdapter, openAiAdapter, langChain4jAdapter, "ollama")
        val provider = producer.aiProvider()
        assertSame(langChain4jAdapter, provider)
    }

    @Test
    fun testResolvesMockProvider() {
        val producer = AiProviderProducer(mockAdapter, openAiAdapter, langChain4jAdapter, "mock")
        val provider = producer.aiProvider()
        assertSame(mockAdapter, provider)
    }

    @Test
    fun testResolvesOpenAiProvider() {
        val producer = AiProviderProducer(mockAdapter, openAiAdapter, langChain4jAdapter, "openai")
        val provider = producer.aiProvider()
        assertSame(openAiAdapter, provider)
    }

    @Test
    fun testThrowsOnUnsupportedProvider() {
        val producer = AiProviderProducer(mockAdapter, openAiAdapter, langChain4jAdapter, "anthropic")
        val exception = assertThrows(IllegalArgumentException::class.java) {
            producer.aiProvider()
        }
        assertTrue(exception.message!!.contains("Unsupported AI provider"))
    }

    @Test
    fun testOpenAiThrowsWhenApiKeyMissing() {
        val exception = assertThrows(IllegalStateException::class.java) {
            openAiAdapter.generateGraph("Architecture diagram")
        }
        assertTrue(exception.message!!.contains("API key is missing or blank"))
    }

    @Test
    fun testLangChain4jAdapterParsesValidGraph() {
        val graph = langChain4jAdapter.generateGraph("Architecture diagram")
        assertNotNull(graph)
        assertEquals("Test Diagram", graph.title)
        assertEquals(1, graph.nodes.size)
        assertEquals("Service A", graph.nodes[0].label)
    }

    @Test
    fun testLangChain4jAdapterParsesMarkdownWrappedJson() {
        val markdownWrappedAiService = object : DiagramAiService {
            override fun generateGraph(prompt: String, category: String, layoutDirection: String): String {
                return "```json\n{\"title\": \"Markdown Diagram\", \"nodes\": [], \"edges\": [], \"containers\": []}\n```"
            }
        }
        val adapter = LangChain4jAiProviderAdapter(markdownWrappedAiService, objectMapper)
        val graph = adapter.generateGraph("Architecture diagram")
        assertNotNull(graph)
        assertEquals("Markdown Diagram", graph.title)
    }

    @Test
    fun testLangChain4jAdapterThrowsOnEmptyResponse() {
        val emptyAiService = object : DiagramAiService {
            override fun generateGraph(prompt: String, category: String, layoutDirection: String): String {
                return ""
            }
        }
        val adapter = LangChain4jAiProviderAdapter(emptyAiService, objectMapper)
        val exception = assertThrows(RuntimeException::class.java) {
            adapter.generateGraph("Architecture diagram")
        }
        assertTrue(exception.message!!.contains("empty response content"))
    }
}
