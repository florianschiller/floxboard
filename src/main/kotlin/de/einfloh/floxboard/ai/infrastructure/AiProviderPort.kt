package de.einfloh.floxboard.ai.infrastructure

import de.einfloh.floxboard.ai.domain.AiDiagramGraph

interface AiProviderPort {
    fun generateGraph(prompt: String, category: String? = null, layoutDirection: String? = null): AiDiagramGraph
}
