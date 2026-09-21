package de.einfloh.floxboard.ai.infrastructure

import de.einfloh.floxboard.ai.domain.AiDiagramGraph
import de.einfloh.floxboard.ai.domain.ShapeDescriptor

interface AiProviderPort {
    fun generateGraph(
        prompt: String,
        category: String? = null,
        layoutDirection: String? = null,
        candidateShapes: List<ShapeDescriptor> = emptyList()
    ): AiDiagramGraph
}
