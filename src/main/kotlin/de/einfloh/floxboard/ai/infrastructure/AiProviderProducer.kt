package de.einfloh.floxboard.ai.infrastructure

import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.inject.Produces
import org.eclipse.microprofile.config.inject.ConfigProperty

@ApplicationScoped
class AiProviderProducer(
    private val mockAdapter: MockAiProviderAdapter,
    private val openAiAdapter: OpenAiProviderAdapter,
    private val langChain4jAdapter: LangChain4jAiProviderAdapter,
    @param:ConfigProperty(name = "floxboard.ai.provider", defaultValue = "langchain4j")
    private val provider: String
) {

    @Produces
    @ApplicationScoped
    fun aiProvider(): AiProviderPort {
        return when (provider.lowercase().trim()) {
            "langchain4j", "ollama" -> langChain4jAdapter
            "openai" -> openAiAdapter
            "mock" -> mockAdapter
            else -> throw IllegalArgumentException("Unsupported AI provider configured: '$provider'. Supported providers are 'langchain4j', 'ollama', 'openai', and 'mock'.")
        }
    }
}
