package de.einfloh.floxboard.ai

import de.einfloh.floxboard.ai.infrastructure.MockAiProviderAdapter
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class MockAiProviderAdapterTest {

    private val adapter = MockAiProviderAdapter()

    @Test
    fun testGenerateUmlGraph() {
        val graph = adapter.generateGraph("Domain model with User, Order, Payment", "SOFTWARE_DESIGN_UML", "HORIZONTAL")
        assertNotNull(graph)
        assertEquals("Domain Model UML Class Diagram", graph.title)
        assertTrue(graph.nodes.any { it.shapeType == "UmlClass" })
        val userNode = graph.nodes.first { it.id == "node-uml-user" }
        assertEquals("UmlClass", userNode.shapeType)
        assertNotNull(userNode.properties)
        assertTrue(userNode.properties!!.containsKey("attributes"))
        assertTrue(userNode.properties.containsKey("methods"))
        assertTrue(graph.edges.any { it.arrowHead == "crowfoot-many" })
    }

    @Test
    fun testGenerateAgileSprintGraph() {
        val graph = adapter.generateGraph("Sprint backlog with user stories and retro notes", "AGILE_SPRINT", "HORIZONTAL")
        assertNotNull(graph)
        assertEquals("Agile Sprint Backlog & Retrospective", graph.title)
        assertTrue(graph.nodes.any { it.shapeType == "AgileStoryCard" })
        assertTrue(graph.nodes.any { it.shapeType == "StickyNote" })
        assertTrue(graph.containers.isNotEmpty())
    }

    @Test
    fun testGenerateArchitectureGraphWithCylinderAndQueue() {
        val graph = adapter.generateGraph("Microservices architecture with PostgreSQL and Kafka", "CLOUD_ARCHITECTURE", "HORIZONTAL")
        assertNotNull(graph)
        assertTrue(graph.nodes.any { it.shapeType == "Cylinder" })
        assertTrue(graph.nodes.any { it.shapeType == "Queue" })
        assertTrue(graph.nodes.any { it.shapeType == "Capsule" })
    }

    @Test
    fun testGenerateFlowchartGraphWithDiamond() {
        val graph = adapter.generateGraph("Order checkout decision process", "FLOWCHART_BPMN", "HORIZONTAL")
        assertNotNull(graph)
        assertTrue(graph.nodes.any { it.shapeType == "Diamond" })
        assertTrue(graph.nodes.any { it.shapeType == "Capsule" })
    }
}
