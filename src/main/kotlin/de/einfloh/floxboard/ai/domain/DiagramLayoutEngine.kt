package de.einfloh.floxboard.ai.domain

import de.einfloh.floxboard.whiteboard.domain.dgm.*
import jakarta.enterprise.context.ApplicationScoped
import java.util.UUID

data class LayoutResult(
    val doc: Doc,
    val shapeCount: Int,
    val connectorCount: Int
)

data class NodeBox(
    val node: AiNode,
    var left: Double,
    var top: Double,
    val width: Double,
    val height: Double
) {
    val right: Double get() = left + width
    val bottom: Double get() = top + height
    val centerX: Double get() = left + width / 2.0
    val centerY: Double get() = top + height / 2.0
}

@ApplicationScoped
class DiagramLayoutEngine {

    fun layout(
        graph: AiDiagramGraph,
        layoutDirection: String? = "HORIZONTAL",
        theme: String? = null
    ): LayoutResult {
        val isHorizontal = layoutDirection == null || layoutDirection.equals("HORIZONTAL", ignoreCase = true)

        val nodeBoxes = mutableMapOf<String, NodeBox>()
        val nodes = graph.nodes
        val edges = graph.edges
        val containers = graph.containers

        // 1. Determine dimensions for each node
        for (node in nodes) {
            val labelLen = node.label.length
            val baseWidth = when {
                node.width != null -> node.width
                node.shapeType.equals("Ellipse", ignoreCase = true) -> maxOf(140.0, labelLen * 9.0 + 40.0)
                labelLen > 25 -> 220.0
                labelLen > 15 -> 180.0
                else -> 160.0
            }
            val baseHeight = when {
                node.height != null -> node.height
                node.shapeType.equals("Ellipse", ignoreCase = true) -> 70.0
                labelLen > 30 -> 80.0
                else -> 60.0
            }

            nodeBoxes[node.id] = NodeBox(
                node = node,
                left = 0.0,
                top = 0.0,
                width = baseWidth,
                height = baseHeight
            )
        }

        // 2. Layering via DAG Topological Level Ordering
        val inDegree = mutableMapOf<String, Int>()
        val adj = mutableMapOf<String, MutableList<String>>()
        for (node in nodes) {
            inDegree[node.id] = 0
            adj[node.id] = mutableListOf()
        }
        for (edge in edges) {
            if (inDegree.containsKey(edge.toNodeId) && adj.containsKey(edge.fromNodeId)) {
                inDegree[edge.toNodeId] = inDegree[edge.toNodeId]!! + 1
                adj[edge.fromNodeId]!!.add(edge.toNodeId)
            }
        }

        val levels = mutableMapOf<String, Int>()
        val queue = ArrayDeque<String>()
        for (node in nodes) {
            if (inDegree[node.id] == 0) {
                queue.add(node.id)
                levels[node.id] = 0
            }
        }

        while (queue.isNotEmpty()) {
            val curr = queue.removeFirst()
            val currLevel = levels[curr] ?: 0
            for (neighbor in adj[curr] ?: emptyList()) {
                val nextLevel = maxOf(levels[neighbor] ?: 0, currLevel + 1)
                levels[neighbor] = nextLevel
                queue.add(neighbor)
            }
        }

        // Assign levels for any remaining unvisited nodes (e.g. cycles)
        var fallbackLevel = (levels.values.maxOrNull() ?: -1) + 1
        for (node in nodes) {
            if (!levels.containsKey(node.id)) {
                levels[node.id] = fallbackLevel++
            }
        }

        // Group nodes by level
        val nodesByLevel = mutableMapOf<Int, MutableList<String>>()
        for ((nodeId, level) in levels) {
            nodesByLevel.computeIfAbsent(level) { mutableListOf() }.add(nodeId)
        }

        val sortedLevels = nodesByLevel.keys.sorted()

        // 3. Coordinate calculation
        val startX = 100.0
        val startY = 100.0
        val gapX = if (isHorizontal) 90.0 else 60.0
        val gapY = if (isHorizontal) 50.0 else 90.0

        if (isHorizontal) {
            var currentX = startX
            // Compute max column height to center shorter columns
            val columnHeights = sortedLevels.map { level ->
                val nodeIds = nodesByLevel[level] ?: emptyList()
                nodeIds.sumOf { nodeBoxes[it]?.height ?: 60.0 } + (nodeIds.size - 1).coerceAtLeast(0) * gapY
            }
            val maxColHeight = columnHeights.maxOrNull() ?: 300.0

            for (level in sortedLevels) {
                val nodeIds = nodesByLevel[level] ?: emptyList()
                val colWidth = nodeIds.maxOfOrNull { nodeBoxes[it]?.width ?: 160.0 } ?: 160.0
                val totalColHeight = nodeIds.sumOf { nodeBoxes[it]?.height ?: 60.0 } + (nodeIds.size - 1).coerceAtLeast(0) * gapY
                var currentY = startY + (maxColHeight - totalColHeight) / 2.0

                for (nodeId in nodeIds) {
                    val box = nodeBoxes[nodeId]!!
                    box.left = currentX + (colWidth - box.width) / 2.0
                    box.top = currentY
                    currentY += box.height + gapY
                }
                currentX += colWidth + gapX
            }
        } else {
            // Vertical Layout
            var currentY = startY
            val rowWidths = sortedLevels.map { level ->
                val nodeIds = nodesByLevel[level] ?: emptyList()
                nodeIds.sumOf { nodeBoxes[it]?.width ?: 160.0 } + (nodeIds.size - 1).coerceAtLeast(0) * gapX
            }
            val maxRowWidth = rowWidths.maxOrNull() ?: 400.0

            for (level in sortedLevels) {
                val nodeIds = nodesByLevel[level] ?: emptyList()
                val rowHeight = nodeIds.maxOfOrNull { nodeBoxes[it]?.height ?: 60.0 } ?: 60.0
                val totalRowWidth = nodeIds.sumOf { nodeBoxes[it]?.width ?: 160.0 } + (nodeIds.size - 1).coerceAtLeast(0) * gapX
                var currentX = startX + (maxRowWidth - totalRowWidth) / 2.0

                for (nodeId in nodeIds) {
                    val box = nodeBoxes[nodeId]!!
                    box.left = currentX
                    box.top = currentY + (rowHeight - box.height) / 2.0
                    currentX += box.width + gapX
                }
                currentY += rowHeight + gapY
            }
        }

        // 4. Build DGM Shapes
        val dgmElements = mutableListOf<Obj>()
        var shapeCount = 0
        var connectorCount = 0

        // Build Frames for Containers
        for (container in containers) {
            val memberBoxes = container.nodeIds.mapNotNull { nodeBoxes[it] }
            if (memberBoxes.isNotEmpty()) {
                val minX = memberBoxes.minOf { it.left }
                val minY = memberBoxes.minOf { it.top }
                val maxX = memberBoxes.maxOf { it.right }
                val maxY = memberBoxes.maxOf { it.bottom }

                val frame = Frame().apply {
                    id = container.id.ifBlank { UUID.randomUUID().toString() }
                    name = container.label
                    left = minX - 30.0
                    top = minY - 45.0
                    width = (maxX - minX) + 60.0
                    height = (maxY - minY) + 75.0
                    strokeColor = container.strokeColor ?: "#94a3b8"
                    strokeWidth = 1.5
                    fillColor = container.fillColor ?: "rgba(241, 245, 249, 0.4)"
                    fillStyle = "solid"
                    movable = "free"
                    sizable = "free"
                }
                dgmElements.add(frame)
                shapeCount++
            }
        }

        // Build Node Shapes
        for (node in nodes) {
            val box = nodeBoxes[node.id] ?: continue
            val isEllipse = node.shapeType.equals("Ellipse", ignoreCase = true)

            val shape: Box = if (isEllipse) {
                Ellipse().apply { type = "Ellipse" }
            } else {
                Rectangle().apply {
                    type = "Rectangle"
                    corners = mutableListOf(8.0, 8.0, 8.0, 8.0)
                }
            }

            shape.apply {
                id = node.id.ifBlank { UUID.randomUUID().toString() }
                left = box.left
                top = box.top
                width = box.width
                height = box.height
                text = node.label
                fontFamily = "Inter, sans-serif"
                fontSize = 14.0
                fontWeight = 500
                fontColor = node.fontColor ?: "#0f172a"
                strokeColor = node.strokeColor ?: "#334155"
                strokeWidth = 2.0
                fillColor = node.fillColor ?: "#ffffff"
                fillStyle = "solid"
                horzAlign = "center"
                vertAlign = "middle"
                movable = "free"
                sizable = "free"
            }

            dgmElements.add(shape)
            shapeCount++
        }

        // Build Connectors
        for (edge in edges) {
            val fromBox = nodeBoxes[edge.fromNodeId]
            val toBox = nodeBoxes[edge.toNodeId]

            val connector = Connector().apply {
                id = edge.id.ifBlank { UUID.randomUUID().toString() }
                tail = edge.fromNodeId
                head = edge.toNodeId
                strokeColor = edge.strokeColor ?: "#64748b"
                strokeWidth = 2.0
                lineType = if (edge.lineType.equals("curve", ignoreCase = true)) "curve" else "straight"
                headEndType = "arrow"

                if (fromBox != null && toBox != null) {
                    if (isHorizontal) {
                        tailAnchor = mutableListOf(1.0, 0.5)
                        headAnchor = mutableListOf(0.0, 0.5)
                        path = mutableListOf(
                            mutableListOf(fromBox.right, fromBox.centerY),
                            mutableListOf(toBox.left, toBox.centerY)
                        )
                    } else {
                        tailAnchor = mutableListOf(0.5, 1.0)
                        headAnchor = mutableListOf(0.5, 0.0)
                        path = mutableListOf(
                            mutableListOf(fromBox.centerX, fromBox.bottom),
                            mutableListOf(toBox.centerX, toBox.top)
                        )
                    }
                }

                if (!edge.label.isNullOrBlank()) {
                    name = edge.label
                    fontSize = 12.0
                    fontColor = "#475569"
                }
            }

            dgmElements.add(connector)
            connectorCount++
        }

        // Construct Root Doc and Page
        val page = Page().apply {
            id = UUID.randomUUID().toString()
            children = dgmElements.toMutableList()
        }

        val doc = Doc().apply {
            id = UUID.randomUUID().toString()
            version = 1
            children = mutableListOf(page)
        }

        return LayoutResult(
            doc = doc,
            shapeCount = shapeCount,
            connectorCount = connectorCount
        )
    }
}
