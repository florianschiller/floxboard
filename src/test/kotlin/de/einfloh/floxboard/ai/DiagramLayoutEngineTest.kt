package de.einfloh.floxboard.ai

import de.einfloh.floxboard.ai.domain.*
import de.einfloh.floxboard.whiteboard.domain.dgm.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class DiagramLayoutEngineTest {

    private val layoutEngine = DiagramLayoutEngine()

    @Test
    fun testHorizontalLayoutWithContainersAndConnectors() {
        val graph = AiDiagramGraph(
            title = "Microservices Test",
            nodes = listOf(
                AiNode(id = "n1", label = "API Gateway", shapeType = "Rectangle"),
                AiNode(id = "n2", label = "Auth Service", shapeType = "Rectangle", containerId = "c1"),
                AiNode(id = "n3", label = "User Service", shapeType = "Rectangle", containerId = "c1"),
                AiNode(id = "n4", label = "Database", shapeType = "Ellipse")
            ),
            edges = listOf(
                AiEdge(id = "e1", fromNodeId = "n1", toNodeId = "n2", label = "Auth Request"),
                AiEdge(id = "e2", fromNodeId = "n1", toNodeId = "n3", label = "User Request"),
                AiEdge(id = "e3", fromNodeId = "n3", toNodeId = "n4", label = "SQL Query")
            ),
            containers = listOf(
                AiContainer(id = "c1", label = "Backend Cluster", nodeIds = listOf("n2", "n3"))
            )
        )

        val result = layoutEngine.layout(graph, "HORIZONTAL")

        assertEquals(5, result.shapeCount) // 1 frame + 4 nodes
        assertEquals(3, result.connectorCount)
        assertNotNull(result.doc)
        assertEquals(1, result.doc.children.size)

        val page = result.doc.children[0] as Page
        val boxes = page.children.filterIsInstance<Box>()
        val connectors = page.children.filterIsInstance<Connector>()
        val frames = page.children.filterIsInstance<Frame>()

        assertEquals(5, boxes.size)
        assertEquals(3, connectors.size)
        assertEquals(1, frames.size)

        // Verify Frame bounds enclose n2 and n3
        val frame = frames[0]
        assertEquals("Backend Cluster", frame.name)

        val n2Shape = boxes.first { it.id == "n2" }
        val n3Shape = boxes.first { it.id == "n3" }

        assertTrue(frame.left!! <= n2Shape.left!!)
        assertTrue(frame.left!! <= n3Shape.left!!)
        assertTrue(frame.left!! + frame.width!! >= n2Shape.left!! + n2Shape.width!!)
        assertTrue(frame.left!! + frame.width!! >= n3Shape.left!! + n3Shape.width!!)

        // Verify DAG horizontal ordering: n1 left < n2 left < n4 left
        val n1Shape = boxes.first { it.id == "n1" }
        val n4Shape = boxes.first { it.id == "n4" }
        assertTrue(n1Shape.left!! < n2Shape.left!!)
        assertTrue(n2Shape.left!! < n4Shape.left!!)

        // Verify connector properties
        val e1Conn = connectors.first { it.id == "e1" }
        assertEquals("n1", e1Conn.tail)
        assertEquals("n2", e1Conn.head)
        assertEquals("Auth Request", e1Conn.name)
        assertNotNull(e1Conn.headAnchor)
        assertNotNull(e1Conn.tailAnchor)
    }

    @Test
    fun testVerticalLayoutPositionsNodesTopToBottom() {
        val graph = AiDiagramGraph(
            title = "Vertical Pipeline",
            nodes = listOf(
                AiNode(id = "step1", label = "Build", shapeType = "Rectangle"),
                AiNode(id = "step2", label = "Test", shapeType = "Rectangle"),
                AiNode(id = "step3", label = "Deploy", shapeType = "Rectangle")
            ),
            edges = listOf(
                AiEdge(id = "e1", fromNodeId = "step1", toNodeId = "step2"),
                AiEdge(id = "e2", fromNodeId = "step2", toNodeId = "step3")
            )
        )

        val result = layoutEngine.layout(graph, "VERTICAL")

        val page = result.doc.children[0] as Page
        val s1 = page.children.first { it.id == "step1" } as Shape
        val s2 = page.children.first { it.id == "step2" } as Shape
        val s3 = page.children.first { it.id == "step3" } as Shape

        assertTrue(s1.top!! < s2.top!!)
        assertTrue(s2.top!! < s3.top!!)
    }

    @Test
    fun testScriptedStencilsAndMultiShapeSynthesis() {
        val graph = AiDiagramGraph(
            title = "Multi-Shape Stencil Test",
            nodes = listOf(
                AiNode(
                    id = "uml1",
                    label = "User",
                    shapeType = "UmlClass",
                    properties = mapOf(
                        "className" to "User",
                        "stereotype" to "<<Entity>>",
                        "attributes" to listOf("- id: UUID", "- email: String", "- role: String"),
                        "methods" to listOf("+ save(): void", "+ getRole(): String")
                    )
                ),
                AiNode(
                    id = "agile1",
                    label = "Auth Story",
                    shapeType = "AgileStoryCard",
                    properties = mapOf(
                        "code" to "US-101",
                        "title" to "SSO Auth",
                        "points" to 5
                    )
                ),
                AiNode(
                    id = "db1",
                    label = "PostgreSQL",
                    shapeType = "Cylinder",
                    properties = mapOf("title" to "PostgreSQL", "subtitle" to "Primary DB")
                ),
                AiNode(
                    id = "decision1",
                    label = "Is Admin?",
                    shapeType = "Diamond"
                ),
                AiNode(
                    id = "sticky1",
                    label = "Review schema changes",
                    shapeType = "StickyNote",
                    fillStyle = "solid",
                    roughness = 0.9
                ),
                AiNode(
                    id = "capsule1",
                    label = "/api/v1/auth",
                    shapeType = "Capsule"
                )
            ),
            edges = listOf(
                AiEdge(
                    id = "e1",
                    fromNodeId = "uml1",
                    toNodeId = "db1",
                    label = "persists",
                    arrowHead = "solid-arrow",
                    strokePattern = "dashed"
                ),
                AiEdge(
                    id = "e2",
                    fromNodeId = "decision1",
                    toNodeId = "capsule1",
                    label = "route",
                    arrowHead = "crowfoot-many"
                )
            )
        )

        val result = layoutEngine.layout(graph, "HORIZONTAL")

        assertEquals(6, result.shapeCount)
        assertEquals(2, result.connectorCount)

        val page = result.doc.children[0] as Page

        // Verify UmlClass is Custom with script and properties
        val umlShape = page.children.first { it.id == "uml1" } as Custom
        assertEquals("Custom", umlShape.type)
        assertNotNull(umlShape.script)
        assertTrue(umlShape.script!!.contains("umlClassBox") || umlShape.script!!.contains("className"))
        assertNotNull(umlShape.properties)
        assertTrue(umlShape.height!! >= 160.0)

        // Verify AgileStoryCard is Custom with script and properties
        val agileShape = page.children.first { it.id == "agile1" } as Custom
        assertEquals("Custom", agileShape.type)
        assertEquals(280.0, agileShape.width)
        assertEquals(180.0, agileShape.height)
        assertNotNull(agileShape.script)

        // Verify Database Cylinder is Custom with script
        val dbShape = page.children.first { it.id == "db1" } as Custom
        assertEquals("Custom", dbShape.type)
        assertEquals(160.0, dbShape.width)
        assertEquals(110.0, dbShape.height)
        assertNotNull(dbShape.script)

        // Verify Diamond is Custom with diamond draw script
        val diamondShape = page.children.first { it.id == "decision1" } as Custom
        assertEquals("Custom", diamondShape.type)
        assertNotNull(diamondShape.script)

        // Verify StickyNote has warm fill, roughness, shadow
        val stickyShape = page.children.first { it.id == "sticky1" } as Rectangle
        assertEquals("#fef08a", stickyShape.fillColor)
        assertEquals(0.9, stickyShape.roughness)
        assertTrue(stickyShape.shadow == true)

        // Verify Capsule has rounded corners (24.0)
        val capsuleShape = page.children.first { it.id == "capsule1" } as Rectangle
        assertEquals(listOf(24.0, 24.0, 24.0, 24.0), capsuleShape.corners)

        // Verify Connectors
        val e1 = page.children.first { it.id == "e1" } as Connector
        assertEquals("solid-arrow", e1.headEndType)

        val e2 = page.children.first { it.id == "e2" } as Connector
        assertEquals("crowfoot-many", e2.headEndType)
    }
}
