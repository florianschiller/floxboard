package de.einfloh.floxboard.ai.infrastructure

import dev.langchain4j.service.SystemMessage
import dev.langchain4j.service.UserMessage
import dev.langchain4j.service.V
import io.quarkiverse.langchain4j.RegisterAiService

@RegisterAiService
interface DiagramAiService {

    @SystemMessage("""
        You are an expert software and system diagram generator.
        Analyze the user prompt and generate a structured diagram graph in strictly valid JSON conforming to this schema:
        {
          "title": "Diagram Title",
          "nodes": [
            { "id": "node-1", "label": "Node Label", "shapeType": "Rectangle", "fillColor": "#ffffff", "strokeColor": "#334155", "containerId": "container-1" }
          ],
          "edges": [
            { "id": "edge-1", "fromNodeId": "node-1", "toNodeId": "node-2", "label": "Relationship", "lineType": "straight", "arrowHead": "arrow" }
          ],
          "containers": [
            { "id": "container-1", "label": "Container Title", "nodeIds": ["node-1"] }
          ]
        }
        Return ONLY the raw JSON object, without markdown code blocks.
    """)
    @UserMessage("Category: {category}\nLayout: {layoutDirection}\nPrompt: {prompt}")
    fun generateGraph(
        @V("prompt") prompt: String,
        @V("category") category: String,
        @V("layoutDirection") layoutDirection: String
    ): String
}
