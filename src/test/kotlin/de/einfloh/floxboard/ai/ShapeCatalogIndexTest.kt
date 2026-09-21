package de.einfloh.floxboard.ai

import com.fasterxml.jackson.databind.ObjectMapper
import de.einfloh.floxboard.ai.domain.ShapeCatalogIndex
import de.einfloh.floxboard.ai.domain.ShapeDescriptor
import de.einfloh.floxboard.ai.domain.ShapePropertyDefinition
import de.einfloh.floxboard.whiteboard.domain.ShapeStencil
import de.einfloh.floxboard.whiteboard.domain.StencilCategory
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.util.UUID

class ShapeCatalogIndexTest {

    private lateinit var index: ShapeCatalogIndex

    @BeforeEach
    fun setUp() {
        index = ShapeCatalogIndex(ObjectMapper())
    }

    @Test
    fun `test default shapes are indexed correctly`() {
        val all = index.getAllDescriptors()
        assertTrue(all.size >= 15, "Expected at least 15 default descriptors, found ${all.size}")

        val coreShapes = index.getCoreDescriptors()
        assertTrue(coreShapes.isNotEmpty(), "Core descriptors should not be empty")
        assertTrue(coreShapes.any { it.shapeType == "Rectangle" })
        assertTrue(coreShapes.any { it.shapeType == "Ellipse" })
        assertTrue(coreShapes.any { it.shapeType == "Diamond" })
        assertTrue(coreShapes.any { it.shapeType == "Cylinder" })

        val umlShapes = index.getDescriptorsByCategory("SOFTWARE_DESIGN_UML")
        assertTrue(umlShapes.isNotEmpty())
        assertTrue(umlShapes.any { it.shapeType == "UmlClass" })

        val agileShapes = index.getDescriptorsByCategory("AGILE_SPRINT")
        assertTrue(agileShapes.isNotEmpty())
        assertTrue(agileShapes.any { it.shapeType == "AgileStoryCard" })

        val cloudShapes = index.getDescriptorsByCategory("CLOUD_ARCHITECTURE")
        assertTrue(cloudShapes.isNotEmpty())
        assertTrue(cloudShapes.any { it.id == "cloud-serverless-lambda" })
    }

    @Test
    fun `test custom stencil indexing and metadata extraction`() {
        val stencil = ShapeStencil().apply {
            id = UUID.randomUUID()
            name = "Custom Kubernetes Ingress"
            category = StencilCategory.CLOUD_ARCHITECTURE
            description = "Kubernetes Ingress controller routing external HTTP traffic to pods"
            shapesJson = """
                [
                  {
                    "type": "Custom",
                    "script": "function draw(ctx, shape) { ... }",
                    "properties": {
                      "ingressClass": "nginx",
                      "host": "api.floxboard.com"
                    }
                  }
                ]
            """.trimIndent()
            createdBy = UUID.randomUUID()
        }

        val descriptor = index.indexStencil(stencil)
        assertNotNull(descriptor)
        assertEquals("Custom Kubernetes Ingress", descriptor.name)
        assertEquals("Custom", descriptor.shapeType)
        assertEquals("CLOUD_ARCHITECTURE", descriptor.category)
        assertTrue(descriptor.tags.contains("kubernetes"))
        assertTrue(descriptor.tags.contains("ingress"))

        // Verify it is searchable
        val found = index.findShapeIdsForToken("ingress")
        assertTrue(found.contains(descriptor.id))

        val retrieved = index.getDescriptor(descriptor.id)
        assertNotNull(retrieved)
        assertEquals("nginx", retrieved?.properties?.get("ingressClass"))
    }

    @Test
    fun `test tokenization and synonym expansions`() {
        val tokens = index.tokenize("Create an AWS S3 bucket and DynamoDB table for user auth")
        assertTrue(tokens.contains("aws"))
        assertTrue(tokens.contains("s3"))
        assertTrue(tokens.contains("bucket"))
        assertTrue(tokens.contains("dynamodb"))
        assertTrue(tokens.contains("table"))
        assertTrue(tokens.contains("user"))
        assertTrue(tokens.contains("auth"))
        assertFalse(tokens.contains("an"))
        assertFalse(tokens.contains("for"))

        val expanded = index.expandTokensWithSynonyms(listOf("db", "k8s", "sqs"))
        assertTrue(expanded.contains("database"))
        assertTrue(expanded.contains("kubernetes"))
        assertTrue(expanded.contains("queue"))
        assertTrue(expanded.contains("messaging"))
    }

    @Test
    fun `test prompt guideline formatting`() {
        val descriptor = ShapeDescriptor(
            id = "test-node",
            name = "Test Node",
            shapeType = "TestType",
            category = "GENERAL",
            description = "A test node descriptor",
            propertyDefinitions = listOf(
                ShapePropertyDefinition("title", "string", "Node title", "Demo"),
                ShapePropertyDefinition("count", "number", "Item count", 42)
            )
        )

        val guideline = descriptor.toPromptGuideline()
        assertTrue(guideline.contains("\"TestType\""))
        assertTrue(guideline.contains("properties: {\"title\": string, \"count\": number}"))
    }
}
