package de.einfloh.floxboard.ai.infrastructure

import de.einfloh.floxboard.ai.domain.AiContainer
import de.einfloh.floxboard.ai.domain.AiDiagramGraph
import de.einfloh.floxboard.ai.domain.AiEdge
import de.einfloh.floxboard.ai.domain.AiNode
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.inject.Typed
import java.util.UUID

@ApplicationScoped
@Typed(MockAiProviderAdapter::class)
class MockAiProviderAdapter : AiProviderPort {

    override fun generateGraph(prompt: String, category: String?, layoutDirection: String?): AiDiagramGraph {
        val lower = prompt.lowercase()

        val detectedCategory = category?.uppercase() ?: when {
            lower.contains("flow") || lower.contains("process") || lower.contains("step") -> "FLOWCHART"
            lower.contains("mind") || lower.contains("brainstorm") || lower.contains("idea") -> "MINDMAP"
            lower.contains("seq") || lower.contains("order") || lower.contains("call") -> "SEQUENCE"
            lower.contains("arch") || lower.contains("microservice") || lower.contains("cloud") || lower.contains("aws") -> "ARCHITECTURE"
            else -> "GENERAL"
        }

        return when (detectedCategory) {
            "ARCHITECTURE" -> generateArchitectureGraph(prompt)
            "FLOWCHART" -> generateFlowchartGraph(prompt)
            "MINDMAP" -> generateMindmapGraph(prompt)
            "SEQUENCE" -> generateSequenceGraph(prompt)
            else -> generateGenericOrKeywordGraph(prompt)
        }
    }

    private fun generateArchitectureGraph(prompt: String): AiDiagramGraph {
        val lower = prompt.lowercase()
        val nodes = mutableListOf<AiNode>()
        val edges = mutableListOf<AiEdge>()
        val containers = mutableListOf<AiContainer>()

        val clientNode = AiNode(
            id = "node-client",
            label = "Client / Web App",
            shapeType = "Rectangle",
            fillColor = "#f0f9ff",
            strokeColor = "#0284c7"
        )
        val apiGateway = AiNode(
            id = "node-gateway",
            label = "API Gateway (Kong / Nginx)",
            shapeType = "Rectangle",
            fillColor = "#f8fafc",
            strokeColor = "#475569"
        )
        val authService = AiNode(
            id = "node-auth",
            label = "Auth Service (Keycloak/JWT)",
            shapeType = "Rectangle",
            fillColor = "#fef2f2",
            strokeColor = "#ef4444",
            containerId = "container-backend"
        )
        val mainService = AiNode(
            id = "node-main-service",
            label = if (lower.contains("order")) "Order Service" else "Core API Service",
            shapeType = "Rectangle",
            fillColor = "#f0fdf4",
            strokeColor = "#22c55e",
            containerId = "container-backend"
        )
        val database = AiNode(
            id = "node-db",
            label = if (lower.contains("mongo")) "MongoDB" else "PostgreSQL Database",
            shapeType = "Rectangle",
            fillColor = "#fffbeb",
            strokeColor = "#f59e0b"
        )
        val eventBus = AiNode(
            id = "node-eventbus",
            label = if (lower.contains("rabbit")) "RabbitMQ" else "Kafka Event Bus",
            shapeType = "Rectangle",
            fillColor = "#fdf4ff",
            strokeColor = "#c026d3"
        )

        nodes.addAll(listOf(clientNode, apiGateway, authService, mainService, database, eventBus))

        edges.add(AiEdge(id = "edge-1", fromNodeId = clientNode.id, toNodeId = apiGateway.id, label = "HTTPS / REST"))
        edges.add(AiEdge(id = "edge-2", fromNodeId = apiGateway.id, toNodeId = authService.id, label = "Validate Token"))
        edges.add(AiEdge(id = "edge-3", fromNodeId = apiGateway.id, toNodeId = mainService.id, label = "Route Request"))
        edges.add(AiEdge(id = "edge-4", fromNodeId = mainService.id, toNodeId = database.id, label = "CRUD Queries"))
        edges.add(AiEdge(id = "edge-5", fromNodeId = mainService.id, toNodeId = eventBus.id, label = "Publish Events"))

        containers.add(
            AiContainer(
                id = "container-backend",
                label = "Microservices Cluster",
                nodeIds = listOf(authService.id, mainService.id),
                strokeColor = "#94a3b8",
                fillColor = "rgba(248, 250, 252, 0.6)"
            )
        )

        return AiDiagramGraph(
            title = "System Architecture Diagram",
            nodes = nodes,
            edges = edges,
            containers = containers
        )
    }

    private fun generateFlowchartGraph(prompt: String): AiDiagramGraph {
        val nodes = mutableListOf<AiNode>()
        val edges = mutableListOf<AiEdge>()

        val start = AiNode(id = "node-start", label = "Start Process", shapeType = "Ellipse", fillColor = "#dcfce7", strokeColor = "#16a34a")
        val step1 = AiNode(id = "node-step1", label = "Receive & Validate Input", shapeType = "Rectangle", fillColor = "#ffffff", strokeColor = "#475569")
        val decision = AiNode(id = "node-decision", label = "Is Valid Payload?", shapeType = "Rectangle", fillColor = "#fef9c3", strokeColor = "#ca8a04")
        val stepProcess = AiNode(id = "node-process", label = "Execute Business Logic", shapeType = "Rectangle", fillColor = "#eff6ff", strokeColor = "#2563eb")
        val stepError = AiNode(id = "node-error", label = "Log Error & Return 400", shapeType = "Rectangle", fillColor = "#fee2e2", strokeColor = "#dc2626")
        val end = AiNode(id = "node-end", label = "Complete & Respond", shapeType = "Ellipse", fillColor = "#e0e7ff", strokeColor = "#4f46e5")

        nodes.addAll(listOf(start, step1, decision, stepProcess, stepError, end))

        edges.add(AiEdge(id = "edge-1", fromNodeId = start.id, toNodeId = step1.id))
        edges.add(AiEdge(id = "edge-2", fromNodeId = step1.id, toNodeId = decision.id))
        edges.add(AiEdge(id = "edge-3", fromNodeId = decision.id, toNodeId = stepProcess.id, label = "Yes"))
        edges.add(AiEdge(id = "edge-4", fromNodeId = decision.id, toNodeId = stepError.id, label = "No"))
        edges.add(AiEdge(id = "edge-5", fromNodeId = stepProcess.id, toNodeId = end.id, label = "Success"))
        edges.add(AiEdge(id = "edge-6", fromNodeId = stepError.id, toNodeId = end.id, label = "Handled"))

        return AiDiagramGraph(
            title = "Business Process Flowchart",
            nodes = nodes,
            edges = edges
        )
    }

    private fun generateMindmapGraph(prompt: String): AiDiagramGraph {
        val nodes = mutableListOf<AiNode>()
        val edges = mutableListOf<AiEdge>()

        val root = AiNode(
            id = "node-root",
            label = if (prompt.isNotBlank()) prompt.take(30) else "Main Subject",
            shapeType = "Ellipse",
            fillColor = "#ede9fe",
            strokeColor = "#7c3aed"
        )
        val branch1 = AiNode(id = "node-b1", label = "Core Features", shapeType = "Rectangle", fillColor = "#e0f2fe", strokeColor = "#0284c7")
        val branch2 = AiNode(id = "node-b2", label = "Architecture & Tech", shapeType = "Rectangle", fillColor = "#f0fdf4", strokeColor = "#16a34a")
        val branch3 = AiNode(id = "node-b3", label = "Security & Quotas", shapeType = "Rectangle", fillColor = "#fef3c7", strokeColor = "#d97706")
        val branch4 = AiNode(id = "node-b4", label = "User Experience", shapeType = "Rectangle", fillColor = "#fae8ff", strokeColor = "#c026d3")

        nodes.addAll(listOf(root, branch1, branch2, branch3, branch4))

        edges.add(AiEdge(id = "edge-1", fromNodeId = root.id, toNodeId = branch1.id))
        edges.add(AiEdge(id = "edge-2", fromNodeId = root.id, toNodeId = branch2.id))
        edges.add(AiEdge(id = "edge-3", fromNodeId = root.id, toNodeId = branch3.id))
        edges.add(AiEdge(id = "edge-4", fromNodeId = root.id, toNodeId = branch4.id))

        return AiDiagramGraph(
            title = "Mind Map Structure",
            nodes = nodes,
            edges = edges
        )
    }

    private fun generateSequenceGraph(prompt: String): AiDiagramGraph {
        val nodes = mutableListOf<AiNode>()
        val edges = mutableListOf<AiEdge>()

        val user = AiNode(id = "node-actor", label = "End User", shapeType = "Ellipse", fillColor = "#f8fafc", strokeColor = "#475569")
        val frontend = AiNode(id = "node-fe", label = "Frontend App", shapeType = "Rectangle", fillColor = "#f0f9ff", strokeColor = "#0284c7")
        val backend = AiNode(id = "node-be", label = "API Server", shapeType = "Rectangle", fillColor = "#f0fdf4", strokeColor = "#16a34a")
        val db = AiNode(id = "node-storage", label = "Persistence DB", shapeType = "Rectangle", fillColor = "#fffbeb", strokeColor = "#d97706")

        nodes.addAll(listOf(user, frontend, backend, db))

        edges.add(AiEdge(id = "edge-1", fromNodeId = user.id, toNodeId = frontend.id, label = "1. Click Action"))
        edges.add(AiEdge(id = "edge-2", fromNodeId = frontend.id, toNodeId = backend.id, label = "2. POST Request"))
        edges.add(AiEdge(id = "edge-3", fromNodeId = backend.id, toNodeId = db.id, label = "3. Query & Store"))
        edges.add(AiEdge(id = "edge-4", fromNodeId = db.id, toNodeId = backend.id, label = "4. Data Record"))
        edges.add(AiEdge(id = "edge-5", fromNodeId = backend.id, toNodeId = frontend.id, label = "5. 200 OK Response"))

        return AiDiagramGraph(
            title = "Sequence Flow",
            nodes = nodes,
            edges = edges
        )
    }

    private fun generateGenericOrKeywordGraph(prompt: String): AiDiagramGraph {
        // If prompt has arrows or steps like A -> B -> C or comma separated
        val parts = when {
            prompt.contains("->") -> prompt.split("->").map { it.trim() }.filter { it.isNotBlank() }
            prompt.contains("-->") -> prompt.split("-->").map { it.trim() }.filter { it.isNotBlank() }
            prompt.contains(",") -> prompt.split(",").map { it.trim() }.filter { it.isNotBlank() }
            prompt.contains("\n") -> prompt.lines().map { it.trim() }.filter { it.isNotBlank() }
            else -> emptyList()
        }

        if (parts.size >= 2) {
            val nodes = mutableListOf<AiNode>()
            val edges = mutableListOf<AiEdge>()

            for (i in parts.indices) {
                val id = "node-${i + 1}"
                val isFirst = i == 0
                val isLast = i == parts.size - 1
                nodes.add(
                    AiNode(
                        id = id,
                        label = parts[i],
                        shapeType = if (isFirst || isLast) "Ellipse" else "Rectangle",
                        fillColor = if (isFirst) "#dcfce7" else if (isLast) "#e0e7ff" else "#ffffff",
                        strokeColor = if (isFirst) "#16a34a" else if (isLast) "#4f46e5" else "#475569"
                    )
                )
                if (i > 0) {
                    edges.add(
                        AiEdge(
                            id = "edge-$i",
                            fromNodeId = "node-$i",
                            toNodeId = id,
                            label = "Next"
                        )
                    )
                }
            }

            return AiDiagramGraph(
                title = "Generated Flow",
                nodes = nodes,
                edges = edges
            )
        }

        // Fallback to flowchart
        return generateFlowchartGraph(prompt)
    }
}
