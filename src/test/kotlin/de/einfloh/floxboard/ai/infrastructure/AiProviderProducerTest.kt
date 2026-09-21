package de.einfloh.floxboard.ai.infrastructure

import com.fasterxml.jackson.databind.ObjectMapper
import de.einfloh.floxboard.ai.domain.ShapeCatalogIndex
import de.einfloh.floxboard.ai.domain.ShapeRetriever
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.util.Optional

class AiProviderProducerTest {

    private val objectMapper = ObjectMapper().findAndRegisterModules()
    private val shapeCatalogIndex = ShapeCatalogIndex(objectMapper)
    private val shapeRetriever = ShapeRetriever(shapeCatalogIndex, 15)
    private val mockAdapter = MockAiProviderAdapter()
    private val openAiAdapter = OpenAiProviderAdapter(
        objectMapper = objectMapper,
        shapeRetriever = shapeRetriever,
        apiKey = Optional.empty(),
        baseUrl = "https://api.openai.com/v1",
        model = "gpt-4o-mini",
        temperature = 0.65,
        topP = 0.95
    )
    private val fakeAiService = object : DiagramAiService {
        override fun generateGraph(
            prompt: String,
            category: String,
            layoutDirection: String,
            allowedShapeTypes: String,
            shapeCatalogGuidance: String
        ): String {
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
        shapeRetriever = shapeRetriever,
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
            override fun generateGraph(
                prompt: String,
                category: String,
                layoutDirection: String,
                allowedShapeTypes: String,
                shapeCatalogGuidance: String
            ): String {
                return "```json\n{\"title\": \"Markdown Diagram\", \"nodes\": [], \"edges\": [], \"containers\": []}\n```"
            }
        }
        val adapter = LangChain4jAiProviderAdapter(markdownWrappedAiService, shapeRetriever, objectMapper)
        val graph = adapter.generateGraph("Architecture diagram")
        assertNotNull(graph)
        assertEquals("Markdown Diagram", graph.title)
    }

    @Test
    fun testLangChain4jAdapterThrowsOnEmptyResponse() {
        val emptyAiService = object : DiagramAiService {
            override fun generateGraph(
                prompt: String,
                category: String,
                layoutDirection: String,
                allowedShapeTypes: String,
                shapeCatalogGuidance: String
            ): String {
                return ""
            }
        }
        val adapter = LangChain4jAiProviderAdapter(emptyAiService, shapeRetriever, objectMapper)
        val exception = assertThrows(RuntimeException::class.java) {
            adapter.generateGraph("Architecture diagram")
        }
        assertTrue(exception.message!!.contains("empty response content"))
    }

    @Test
    fun testOpenAiAdapterCategoryTemperatureTuning() {
        assertEquals(0.70, openAiAdapter.resolveTemperature("MIND_MAP"), 0.001)
        assertEquals(0.70, openAiAdapter.resolveTemperature("BRAINSTORM"), 0.001)
        assertEquals(0.70, openAiAdapter.resolveTemperature("AGILE_SPRINT"), 0.001)
        assertEquals(0.40, openAiAdapter.resolveTemperature("SEQUENCE"), 0.001)
        assertEquals(0.40, openAiAdapter.resolveTemperature("SEQUENCE_FLOW"), 0.001)
        assertEquals(0.65, openAiAdapter.resolveTemperature("CLOUD_ARCHITECTURE"), 0.001)
        assertEquals(0.65, openAiAdapter.resolveTemperature("GENERAL"), 0.001)
    }
}
