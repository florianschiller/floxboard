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
            {
              "id": "node-1",
              "label": "Node Label",
              "shapeType": {allowedShapeTypes},
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
        Return ONLY the raw JSON object, without markdown code blocks.
    """)
    @UserMessage("Category: {category}\nLayout: {layoutDirection}\n{shapeCatalogGuidance}\nPrompt: {prompt}")
    fun generateGraph(
        @V("prompt") prompt: String,
        @V("category") category: String,
        @V("layoutDirection") layoutDirection: String,
        @V("allowedShapeTypes") allowedShapeTypes: String = "\"Rectangle\"|\"Capsule\"|\"Ellipse\"|\"Diamond\"|\"Cylinder\"|\"Cloud\"|\"Queue\"|\"StickyNote\"|\"UmlClass\"|\"AgileStoryCard\"|\"BpmnGateway\"|\"Custom\"",
        @V("shapeCatalogGuidance") shapeCatalogGuidance: String = ""
    ): String
}
