package de.einfloh.floxboard.ai

import com.fasterxml.jackson.databind.ObjectMapper
import de.einfloh.floxboard.ai.domain.ShapeCatalogIndex
import de.einfloh.floxboard.ai.domain.ShapeRetriever
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class ShapeRetrieverTest {

    private lateinit var catalogIndex: ShapeCatalogIndex
    private lateinit var retriever: ShapeRetriever

    @BeforeEach
    fun setUp() {
        catalogIndex = ShapeCatalogIndex(ObjectMapper())
        retriever = ShapeRetriever(catalogIndex, defaultTopK = 10)
    }

    @Test
    fun `test exact keyword and domain-specific shape retrieval for UML`() {
        val shapes = retriever.retrieveShapes(
            prompt = "Design an e-commerce domain model with User, Order and Payment UML classes and interfaces",
            category = "SOFTWARE_DESIGN_UML",
            topK = 5
        )

        assertTrue(shapes.isNotEmpty())
        assertTrue(shapes.any { it.shapeType == "UmlClass" })
        assertTrue(shapes.any { it.id == "uml-class-box" })
    }

    @Test
    fun `test cloud architecture retrieval with synonyms (db, s3, lambda, k8s)`() {
        val shapes = retriever.retrieveShapes(
            prompt = "Architecture with k8s microservice, lambda function, sqs queue and s3 bucket with postgres db",
            category = "CLOUD_ARCHITECTURE",
            topK = 8
        )

        val shapeTypes = shapes.map { it.shapeType }.toSet()
        val shapeIds = shapes.map { it.id }.toSet()

        assertTrue(shapeIds.contains("cloud-serverless-lambda"), "Should contain lambda")
        assertTrue(shapeIds.contains("cloud-storage-bucket"), "Should contain s3 storage bucket")
        assertTrue(shapeIds.contains("cloud-message-broker"), "Should contain message broker")
        assertTrue(shapeTypes.contains("Cylinder"), "Should contain database cylinder")
    }

    @Test
    fun `test agile sprint retrieval with story cards and retro stickies`() {
        val shapes = retriever.retrieveShapes(
            prompt = "Create a sprint planning board with user story cards, jira tasks, and retrospective feedback",
            category = "AGILE_SPRINT",
            topK = 6
        )

        val ids = shapes.map { it.id }
        assertTrue(ids.contains("agile-story-card"), "Should retrieve user story card")
        assertTrue(ids.contains("agile-retro-card"), "Should retrieve retro sticky")
    }

    @Test
    fun `test bpmn process flowchart retrieval with decision gateway`() {
        val shapes = retriever.retrieveShapes(
            prompt = "BPMN process with start event, exclusive decision gateway condition, and approval task activity",
            category = "FLOWCHART_BPMN",
            topK = 6
        )

        val types = shapes.map { it.shapeType }
        assertTrue(types.contains("BpmnGateway"), "Should retrieve BpmnGateway")
        assertTrue(types.contains("Ellipse"), "Should retrieve event node")
        assertTrue(types.contains("Rectangle"), "Should retrieve task activity")
    }

    @Test
    fun `test fallback to category stencils and core shapes when query relevance is low`() {
        val shapes = retriever.retrieveShapes(
            prompt = "xyz foobar 12345 non-matching words",
            category = "SOFTWARE_DESIGN_UML",
            topK = 10
        )

        assertTrue(shapes.isNotEmpty(), "Should return fallback shapes")
        // Should contain category defaults like uml-class-box
        assertTrue(shapes.any { it.category == "SOFTWARE_DESIGN_UML" })
        // Should contain core shapes
        assertTrue(shapes.any { it.isCore })
    }

    @Test
    fun `test topK bound is respected`() {
        val top3 = retriever.retrieveShapes("AWS microservice architecture with database", topK = 3)
        assertEquals(3, top3.size)

        val top7 = retriever.retrieveShapes("AWS microservice architecture with database", topK = 7)
        assertEquals(7, top7.size)
    }

    @Test
    fun `test prompt formatting produces valid guideline string`() {
        val shapes = retriever.retrieveShapes(
            prompt = "Order processing with payment service and database",
            category = "CLOUD_ARCHITECTURE",
            topK = 4
        )

        val promptContext = retriever.formatCandidateShapesPrompt(shapes)
        assertTrue(promptContext.contains("Pre-selected Shape Catalog"))
        assertTrue(promptContext.contains("Allowed shapeTypes:"))
        assertTrue(promptContext.contains("Cylinder") || promptContext.contains("Rectangle"))
    }
}
