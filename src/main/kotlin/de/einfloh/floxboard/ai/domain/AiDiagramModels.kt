package de.einfloh.floxboard.ai.domain

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.annotation.JsonProperty
import de.einfloh.floxboard.whiteboard.domain.dgm.Doc
import java.util.UUID

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AiDiagramRequest(
    val prompt: String,
    val category: String? = null,
    val layoutDirection: String? = null,
    val whiteboardId: UUID? = null,
    val theme: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AiDiagramResponse(
    val success: Boolean,
    val doc: Doc,
    val shapeCount: Int,
    val connectorCount: Int,
    val creditsConsumed: Long,
    val remainingCredits: Long,
    val summary: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AiCreditEstimateRequest(
    val prompt: String,
    val category: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AiCreditEstimateResponse(
    val estimatedCredits: Long,
    val remainingCredits: Long,
    @JsonProperty("isAllowed")
    val isAllowed: Boolean
)

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AiQuotaBalanceResponse(
    val currentUsage: Long,
    val limit: Long?,
    val remaining: Long?,
    @JsonProperty("isUnlimited")
    val isUnlimited: Boolean
)

// Semantic Graph Representation for Layout Engine
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AiDiagramGraph(
    val title: String? = null,
    val nodes: List<AiNode> = emptyList(),
    val edges: List<AiEdge> = emptyList(),
    val containers: List<AiContainer> = emptyList()
)

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AiNode(
    val id: String,
    val label: String,
    val shapeType: String = "Rectangle", // Rectangle, Ellipse, Box
    val strokeColor: String? = null,
    val fillColor: String? = null,
    val fontColor: String? = null,
    val containerId: String? = null,
    val width: Double? = null,
    val height: Double? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AiEdge(
    val id: String,
    val fromNodeId: String,
    val toNodeId: String,
    val label: String? = null,
    val lineType: String = "straight",
    val arrowHead: String = "arrow",
    val strokeColor: String? = null
)

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class AiContainer(
    val id: String,
    val label: String,
    val nodeIds: List<String> = emptyList(),
    val strokeColor: String? = null,
    val fillColor: String? = null
)
