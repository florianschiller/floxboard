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

object StencilDrawScripts {
    val UML_CLASS_BOX = """
        function draw(ctx, shape) {
          const w = shape.width || 240;
          const h = shape.height || 180;
          const r = 6;
          const props = shape.properties || {};
          const className = props.className || shape.text || 'UserAccount';
          const stereotype = props.stereotype || '<<Entity>>';
          const attributes = Array.isArray(props.attributes) ? props.attributes : ['- id: UUID', '- name: String'];
          const methods = Array.isArray(props.methods) ? props.methods : ['+ getId(): UUID', '+ save(): void'];

          ctx.save();
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(0, 0, w, h, r);
          } else {
            ctx.rect(0, 0, w, h);
          }
          ctx.fillStyle = shape.fillColor || '#ffffff';
          ctx.fill();
          ctx.strokeStyle = shape.strokeColor || '#334155';
          ctx.lineWidth = shape.strokeWidth || 2;
          ctx.stroke();

          const headerHeight = 44;
          ctx.save();
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(0, 0, w, headerHeight, [r, r, 0, 0]);
          } else {
            ctx.rect(0, 0, w, headerHeight);
          }
          ctx.fillStyle = '#f1f5f9';
          ctx.fill();
          ctx.restore();

          ctx.beginPath();
          ctx.moveTo(0, headerHeight);
          ctx.lineTo(w, headerHeight);
          ctx.strokeStyle = shape.strokeColor || '#334155';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#64748b';
          ctx.font = 'italic 11px Roboto, sans-serif';
          ctx.fillText(stereotype, w / 2, 14);

          ctx.fillStyle = shape.fontColor || '#0f172a';
          ctx.font = 'bold 13px Roboto, sans-serif';
          ctx.fillText(className, w / 2, 30);

          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.font = '11px Roboto, sans-serif';
          ctx.fillStyle = '#334155';
          let attrY = headerHeight + 8;
          for (let i = 0; i < attributes.length; i++) {
            if (attrY + 14 < h - 40) {
              ctx.fillText(String(attributes[i]), 12, attrY);
              attrY += 16;
            }
          }

          const methodsDividerY = Math.max(headerHeight + 56, attrY + 4);
          ctx.beginPath();
          ctx.moveTo(0, methodsDividerY);
          ctx.lineTo(w, methodsDividerY);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.stroke();

          let methodY = methodsDividerY + 8;
          for (let i = 0; i < methods.length; i++) {
            if (methodY + 14 < h) {
              ctx.fillText(String(methods[i]), 12, methodY);
              methodY += 16;
            }
          }
          ctx.restore();
        }
    """.trimIndent()

    val DATABASE_CYLINDER = """
        function draw(ctx, shape) {
          const w = shape.width || 150;
          const h = shape.height || 100;
          const ry = Math.min(20, h * 0.18);
          const props = shape.properties || {};
          const title = props.title || shape.text || 'Database';
          const sub = props.subtitle || 'Data Store';

          ctx.save();
          // Bottom Ellipse & Cylinder Body
          ctx.beginPath();
          ctx.moveTo(0, ry);
          ctx.lineTo(0, h - ry);
          ctx.ellipse(w / 2, h - ry, w / 2, ry, 0, Math.PI, 0, true);
          ctx.lineTo(w, ry);
          ctx.ellipse(w / 2, ry, w / 2, ry, 0, 0, Math.PI, true);
          ctx.closePath();
          ctx.fillStyle = shape.fillColor || '#eff6ff';
          ctx.fill();
          ctx.strokeStyle = shape.strokeColor || '#2563eb';
          ctx.lineWidth = shape.strokeWidth || 2;
          ctx.stroke();

          // Top Rim Ellipse
          ctx.beginPath();
          ctx.ellipse(w / 2, ry, w / 2, ry, 0, 0, 2 * Math.PI, false);
          ctx.fillStyle = '#dbeafe';
          ctx.fill();
          ctx.stroke();

          // Intermediate Tier Rings
          const ringY1 = ry + (h - 2 * ry) * 0.35;
          const ringY2 = ry + (h - 2 * ry) * 0.70;
          ctx.strokeStyle = '#93c5fd';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(w / 2, ringY1, w / 2, ry, 0, 0, Math.PI, false);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(w / 2, ringY2, w / 2, ry, 0, 0, Math.PI, false);
          ctx.stroke();

          // Text Labels
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = shape.fontColor || '#1e3a8a';
          ctx.font = 'bold 12px Roboto, sans-serif';
          ctx.fillText(title, w / 2, h / 2 - 2);
          ctx.fillStyle = '#64748b';
          ctx.font = '10px Roboto, sans-serif';
          ctx.fillText(sub, w / 2, h / 2 + 13);
          ctx.restore();
        }
    """.trimIndent()

    val AGILE_STORY_CARD = """
        function draw(ctx, shape) {
          const w = shape.width || 280;
          const h = shape.height || 180;
          const props = shape.properties || {};
          const code = props.code || 'US-101';
          const title = props.title || shape.text || 'User Story';
          const persona = props.persona || 'As a User';
          const goal = props.goal || 'I want to perform an action';
          const value = props.value || 'So that I achieve value';
          const points = props.points != null ? String(props.points) : '5';
          const status = props.status || 'IN PROGRESS';

          ctx.save();
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(0, 0, w, h, 8);
          } else {
            ctx.rect(0, 0, w, h);
          }
          ctx.fillStyle = shape.fillColor || '#fefce8';
          ctx.fill();
          ctx.strokeStyle = shape.strokeColor || '#eab308';
          ctx.lineWidth = shape.strokeWidth || 2;
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#854d0e';
          ctx.font = 'bold 12px Roboto, sans-serif';
          ctx.fillText(code + ': ' + title, 14, 20);

          const tagW = 85;
          const tagH = 18;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(14, 34, tagW, tagH, 9);
          } else {
            ctx.rect(14, 34, tagW, tagH);
          }
          ctx.fillStyle = '#fef08a';
          ctx.fill();
          ctx.fillStyle = '#713f12';
          ctx.font = 'bold 9px Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(status, 14 + tagW / 2, 43);

          ctx.beginPath();
          ctx.arc(w - 24, 24, 15, 0, 2 * Math.PI);
          ctx.fillStyle = '#eab308';
          ctx.fill();
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(points, w - 24, 24);

          ctx.beginPath();
          ctx.moveTo(14, 60);
          ctx.lineTo(w - 14, 60);
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#713f12';
          ctx.font = '500 11px Roboto, sans-serif';
          ctx.fillText('👤 ' + persona, 14, 72);
          ctx.fillText('🎯 ' + goal, 14, 96);
          ctx.fillText('💡 ' + value, 14, 120);
          ctx.restore();
        }
    """.trimIndent()

    val BPMN_GATEWAY = """
        function draw(ctx, shape) {
          const w = shape.width || 120;
          const h = shape.height || 100;
          const props = shape.properties || {};
          const type = (props.gatewayType || 'EXCLUSIVE').toUpperCase();
          const label = props.label || shape.text || 'Decision?';

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(w / 2, 4);
          ctx.lineTo(w - 4, h / 2);
          ctx.lineTo(w / 2, h - 4);
          ctx.lineTo(4, h / 2);
          ctx.closePath();
          ctx.fillStyle = shape.fillColor || '#fef3c7';
          ctx.fill();
          ctx.strokeStyle = shape.strokeColor || '#d97706';
          ctx.lineWidth = shape.strokeWidth || 2;
          ctx.stroke();

          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 2.5;
          const cx = w / 2;
          const cy = h / 2;
          const s = 10;
          if (type === 'EXCLUSIVE') {
            ctx.beginPath();
            ctx.moveTo(cx - s, cy - s);
            ctx.lineTo(cx + s, cy + s);
            ctx.moveTo(cx + s, cy - s);
            ctx.lineTo(cx - s, cy + s);
            ctx.stroke();
          } else if (type === 'PARALLEL') {
            ctx.beginPath();
            ctx.moveTo(cx - s, cy);
            ctx.lineTo(cx + s, cy);
            ctx.moveTo(cx, cy - s);
            ctx.lineTo(cx, cy + s);
            ctx.stroke();
          }

          if (label) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#92400e';
            ctx.font = 'bold 11px Roboto, sans-serif';
            ctx.fillText(label, w / 2, h + 2);
          }
          ctx.restore();
        }
    """.trimIndent()

    val DIAMOND = """
        function draw(ctx, shape) {
          const w = shape.width || 140;
          const h = shape.height || 100;
          const text = shape.text || (shape.properties && shape.properties.label) || '';

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(w / 2, 2);
          ctx.lineTo(w - 2, h / 2);
          ctx.lineTo(w / 2, h - 2);
          ctx.lineTo(2, h / 2);
          ctx.closePath();
          ctx.fillStyle = shape.fillColor || '#fef3c7';
          ctx.fill();
          ctx.strokeStyle = shape.strokeColor || '#ca8a04';
          ctx.lineWidth = shape.strokeWidth || 2;
          ctx.stroke();

          if (text) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = shape.fontColor || '#713f12';
            ctx.font = 'bold 12px Roboto, sans-serif';
            ctx.fillText(text, w / 2, h / 2);
          }
          ctx.restore();
        }
    """.trimIndent()

    val CLOUD_BOUNDARY = """
        function draw(ctx, shape) {
          const w = shape.width || 200;
          const h = shape.height || 100;
          const text = shape.text || 'Cloud / Service';

          ctx.save();
          ctx.beginPath();
          const r = 16;
          ctx.moveTo(r, 0);
          ctx.lineTo(w - r, 0);
          ctx.quadraticCurveTo(w, 0, w, r);
          ctx.lineTo(w, h - r);
          ctx.quadraticCurveTo(w, h, w - r, h);
          ctx.lineTo(r, h);
          ctx.quadraticCurveTo(0, h, 0, h - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();

          ctx.fillStyle = shape.fillColor || '#fdf4ff';
          ctx.fill();
          ctx.strokeStyle = shape.strokeColor || '#c026d3';
          ctx.lineWidth = shape.strokeWidth || 2;
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = shape.fontColor || '#86198f';
          ctx.font = 'bold 12px Roboto, sans-serif';
          ctx.fillText('☁️ ' + text, w / 2, h / 2);
          ctx.restore();
        }
    """.trimIndent()
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

        // 1. Determine dimensions for each node based on shape and stencil type
        for (node in nodes) {
            val labelLen = node.label.length
            val shapeType = node.shapeType.lowercase()

            val baseWidth = when {
                node.width != null -> node.width
                shapeType == "umlclass" -> 240.0
                shapeType == "agilestorycard" -> 280.0
                shapeType == "bpmngateway" -> 120.0
                shapeType in listOf("diamond", "rhombus") -> maxOf(140.0, labelLen * 10.0 + 40.0)
                shapeType in listOf("cylinder", "database") -> 160.0
                shapeType in listOf("cloud", "queue") -> maxOf(160.0, labelLen * 8.0 + 40.0)
                shapeType == "stickynote" -> 180.0
                shapeType in listOf("capsule", "pill") -> maxOf(140.0, labelLen * 8.5 + 40.0)
                shapeType in listOf("ellipse", "circle") -> maxOf(140.0, labelLen * 9.0 + 40.0)
                labelLen > 25 -> 220.0
                labelLen > 15 -> 180.0
                else -> 160.0
            }

            val baseHeight = when {
                node.height != null -> node.height
                shapeType == "umlclass" -> {
                    val attrs = (node.properties?.get("attributes") as? List<*>)?.size ?: 3
                    val methods = (node.properties?.get("methods") as? List<*>)?.size ?: 2
                    44.0 + (maxOf(attrs, 1) * 16.0) + 20.0 + (maxOf(methods, 1) * 16.0) + 16.0
                }
                shapeType == "agilestorycard" -> 180.0
                shapeType == "bpmngateway" -> 100.0
                shapeType in listOf("diamond", "rhombus") -> 100.0
                shapeType in listOf("cylinder", "database") -> 110.0
                shapeType in listOf("cloud", "queue") -> 80.0
                shapeType == "stickynote" -> 140.0
                shapeType in listOf("capsule", "pill") -> 50.0
                shapeType in listOf("ellipse", "circle") -> 70.0
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
        val gapX = if (isHorizontal) 100.0 else 70.0
        val gapY = if (isHorizontal) 60.0 else 100.0

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
                    left = minX - 35.0
                    top = minY - 50.0
                    width = (maxX - minX) + 70.0
                    height = (maxY - minY) + 85.0
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
            val shapeType = node.shapeType.lowercase()

            val dgmShape: Shape = when {
                shapeType == "umlclass" -> {
                    Custom().apply {
                        type = "Custom"
                        script = node.script ?: StencilDrawScripts.UML_CLASS_BOX
                        properties = node.properties ?: mapOf(
                            "className" to node.label,
                            "stereotype" to "<<Entity>>",
                            "attributes" to listOf("- id: UUID", "- name: String"),
                            "methods" to listOf("+ getId(): UUID", "+ save(): void")
                        )
                        text = node.label
                    }
                }
                shapeType == "agilestorycard" -> {
                    Custom().apply {
                        type = "Custom"
                        script = node.script ?: StencilDrawScripts.AGILE_STORY_CARD
                        properties = node.properties ?: mapOf(
                            "code" to "US-101",
                            "title" to node.label,
                            "persona" to "User",
                            "goal" to "Perform workflow",
                            "value" to "Produce value",
                            "points" to 5,
                            "status" to "IN_PROGRESS"
                        )
                        text = node.label
                    }
                }
                shapeType == "bpmngateway" -> {
                    Custom().apply {
                        type = "Custom"
                        script = node.script ?: StencilDrawScripts.BPMN_GATEWAY
                        properties = node.properties ?: mapOf(
                            "gatewayType" to "EXCLUSIVE",
                            "label" to node.label
                        )
                        text = node.label
                    }
                }
                shapeType in listOf("diamond", "rhombus") -> {
                    Custom().apply {
                        type = "Custom"
                        script = node.script ?: StencilDrawScripts.DIAMOND
                        properties = node.properties ?: mapOf("label" to node.label)
                        text = node.label
                    }
                }
                shapeType in listOf("cylinder", "database") -> {
                    Custom().apply {
                        type = "Custom"
                        script = node.script ?: StencilDrawScripts.DATABASE_CYLINDER
                        properties = node.properties ?: mapOf(
                            "title" to node.label,
                            "subtitle" to "Data Store"
                        )
                        text = node.label
                    }
                }
                shapeType == "cloud" -> {
                    Custom().apply {
                        type = "Custom"
                        script = node.script ?: StencilDrawScripts.CLOUD_BOUNDARY
                        properties = node.properties ?: mapOf("label" to node.label)
                        text = node.label
                    }
                }
                node.script != null || shapeType == "custom" -> {
                    Custom().apply {
                        type = "Custom"
                        script = node.script
                        properties = node.properties
                        text = node.label
                    }
                }
                shapeType in listOf("ellipse", "circle") -> {
                    Ellipse().apply {
                        type = "Ellipse"
                        text = node.label
                    }
                }
                shapeType in listOf("capsule", "pill", "queue") -> {
                    Rectangle().apply {
                        type = "Rectangle"
                        corners = mutableListOf(24.0, 24.0, 24.0, 24.0)
                        text = node.label
                    }
                }
                shapeType == "stickynote" -> {
                    Rectangle().apply {
                        type = "Rectangle"
                        corners = mutableListOf(2.0, 2.0, 2.0, 2.0)
                        padding = mutableListOf(12.0, 12.0, 12.0, 12.0)
                        horzAlign = "left"
                        vertAlign = "top"
                        text = node.label
                    }
                }
                else -> {
                    Rectangle().apply {
                        type = "Rectangle"
                        corners = mutableListOf(8.0, 8.0, 8.0, 8.0)
                        text = node.label
                    }
                }
            }

            dgmShape.apply {
                id = node.id.ifBlank { UUID.randomUUID().toString() }
                left = box.left
                top = box.top
                width = box.width
                height = box.height
                fontFamily = "Inter, sans-serif"
                fontSize = node.fontSize ?: 14.0
                fontWeight = 500
                fontColor = node.fontColor ?: if (shapeType == "stickynote") "#713f12" else "#0f172a"
                strokeColor = node.strokeColor ?: if (shapeType == "stickynote") "#ca8a04" else "#334155"
                strokeWidth = node.strokeWidth ?: 2.0
                fillColor = node.fillColor ?: if (shapeType == "stickynote") "#fef08a" else "#ffffff"
                fillStyle = node.fillStyle ?: "solid"
                roughness = node.roughness ?: if (shapeType == "stickynote") 0.8 else 0.0
                shadow = node.shadow ?: (shapeType == "stickynote")
                movable = "free"
                sizable = "free"
            }

            dgmElements.add(dgmShape)
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
                headEndType = when (edge.arrowHead.lowercase()) {
                    "diamond" -> "diamond"
                    "solid-arrow", "solid_arrow", "arrow-solid" -> "solid-arrow"
                    "crowfoot", "crowfoot-many", "crowfoot_many" -> "crowfoot-many"
                    "circle" -> "circle"
                    "none" -> "flat"
                    else -> "arrow"
                }

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
