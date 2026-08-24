package de.einfloh.floxboard.whiteboard.domain.dgm

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class DgmModelTest {

    private val objectMapper: ObjectMapper = ObjectMapper()

    @Test
    fun testDocSerializationAndDeserialization() {
        val doc = Doc().apply {
            id = "doc-1"
            version = 1
            children = mutableListOf(
                Page().apply {
                    id = "page-1"
                    size = mutableListOf(1920.0, 1080.0)
                    pageOrigin = mutableListOf(0.0, 0.0)
                    pageScale = 1.0
                    children = mutableListOf(
                        Rectangle().apply {
                            id = "rect-1"
                            left = 100.0
                            top = 200.0
                            width = 300.0
                            height = 150.0
                            fillColor = "#ff0000"
                            fillStyle = "solid"
                            strokeColor = "#000000"
                            strokeWidth = 2.0
                            text = "Hello Rectangle"
                            horzAlign = "center"
                            vertAlign = "middle"
                        },
                        Ellipse().apply {
                            id = "ellipse-1"
                            left = 450.0
                            top = 200.0
                            width = 150.0
                            height = 150.0
                            fillColor = "#00ff00"
                        },
                        Text().apply {
                            id = "text-1"
                            left = 100.0
                            top = 400.0
                            width = 200.0
                            height = 50.0
                            text = "Sample text"
                            fontSize = 16.0
                            fontFamily = "Inter"
                        },
                        Line().apply {
                            id = "line-1"
                            path = mutableListOf(
                                mutableListOf(0.0, 0.0),
                                mutableListOf(100.0, 100.0)
                            )
                            lineType = LineType.STRAIGHT.value
                            headEndType = LineEndType.ARROW.value
                        },
                        Connector().apply {
                            id = "conn-1"
                            head = "rect-1"
                            tail = "ellipse-1"
                            headAnchor = mutableListOf(0.5, 1.0)
                            tailAnchor = mutableListOf(0.5, 0.0)
                            headMargin = 5.0
                            tailMargin = 5.0
                        },
                        Freehand().apply {
                            id = "freehand-1"
                            path = mutableListOf(
                                mutableListOf(10.0, 10.0),
                                mutableListOf(20.0, 15.0),
                                mutableListOf(30.0, 20.0)
                            )
                            thinning = 0.5
                            tailTaper = 0.2
                            headTaper = 0.2
                        },
                        Highlighter().apply {
                            id = "hl-1"
                            path = mutableListOf(
                                mutableListOf(50.0, 50.0),
                                mutableListOf(150.0, 50.0)
                            )
                        },
                        Image().apply {
                            id = "img-1"
                            imageData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                            imageWidth = 100.0
                            imageHeight = 100.0
                        },
                        Icon().apply {
                            id = "icon-1"
                            viewWidth = 24.0
                            viewHeight = 24.0
                            data = mutableListOf(mapOf("tag" to "path", "d" to "M0 0h24v24H0z"))
                        },
                        Group().apply {
                            id = "grp-1"
                            children = mutableListOf(
                                Rectangle().apply { id = "grp-rect-1"; left = 10.0; top = 10.0; width = 50.0; height = 50.0 }
                            )
                        },
                        Frame().apply {
                            id = "frame-1"
                            name = "My Frame"
                            children = mutableListOf(
                                Ellipse().apply { id = "frame-ellipse-1"; left = 20.0; top = 20.0; width = 30.0; height = 30.0 }
                            )
                        },
                        Mirror().apply {
                            id = "mirror-1"
                            subject = "rect-1"
                        },
                        Embed().apply {
                            id = "embed-1"
                            src = "https://example.com/embed"
                        }
                    )
                }
            )
        }

        val jsonString = objectMapper.writeValueAsString(doc)
        assertNotNull(jsonString)

        val deserializedDoc: Doc = objectMapper.readValue(jsonString, Doc::class.java)
        assertEquals("doc-1", deserializedDoc.id)
        assertEquals("Doc", deserializedDoc.type)
        assertEquals(1, deserializedDoc.version)
        assertEquals(1, deserializedDoc.children.size)

        val page = deserializedDoc.children[0]
        assertTrue(page is Page)
        page as Page
        assertEquals("page-1", page.id)
        assertEquals("Page", page.type)
        assertEquals(13, page.children.size)

        val rect = page.children[0]
        assertTrue(rect is Rectangle)
        rect as Rectangle
        assertEquals("rect-1", rect.id)
        assertEquals(100.0, rect.left)
        assertEquals("Hello Rectangle", rect.text)

        val ellipse = page.children[1]
        assertTrue(ellipse is Ellipse)
        ellipse as Ellipse
        assertEquals("ellipse-1", ellipse.id)

        val text = page.children[2]
        assertTrue(text is Text)
        text as Text
        assertEquals("text-1", text.id)
        assertEquals(16.0, text.fontSize)

        val line = page.children[3]
        assertTrue(line is Line)
        line as Line
        assertEquals("line-1", line.id)
        assertEquals("straight", line.lineType)
        assertEquals("arrow", line.headEndType)

        val connector = page.children[4]
        assertTrue(connector is Connector)
        connector as Connector
        assertEquals("conn-1", connector.id)
        assertEquals("rect-1", connector.head)
        assertEquals("ellipse-1", connector.tail)

        val freehand = page.children[5]
        assertTrue(freehand is Freehand)
        freehand as Freehand
        assertEquals("freehand-1", freehand.id)
        assertEquals(0.5, freehand.thinning)

        val highlighter = page.children[6]
        assertTrue(highlighter is Highlighter)
        highlighter as Highlighter
        assertEquals("hl-1", highlighter.id)

        val image = page.children[7]
        assertTrue(image is Image)
        image as Image
        assertEquals("img-1", image.id)
        assertEquals(100.0, image.imageWidth)

        val icon = page.children[8]
        assertTrue(icon is Icon)
        icon as Icon
        assertEquals("icon-1", icon.id)
        assertEquals(24.0, icon.viewWidth)

        val group = page.children[9]
        assertTrue(group is Group)
        group as Group
        assertEquals("grp-1", group.id)
        assertEquals(1, group.children.size)
        assertTrue(group.children[0] is Rectangle)

        val frame = page.children[10]
        assertTrue(frame is Frame)
        frame as Frame
        assertEquals("frame-1", frame.id)
        assertEquals("My Frame", frame.name)
        assertEquals(1, frame.children.size)
        assertTrue(frame.children[0] is Ellipse)

        val mirror = page.children[11]
        assertTrue(mirror is Mirror)
        mirror as Mirror
        assertEquals("mirror-1", mirror.id)
        assertEquals("rect-1", mirror.subject)

        val embed = page.children[12]
        assertTrue(embed is Embed)
        embed as Embed
        assertEquals("embed-1", embed.id)
        assertEquals("https://example.com/embed", embed.src)
    }

    @Test
    fun testDgmJsCompatibilityWithUnknownFields() {
        val dgmJson = """
        {
            "id": "root-doc",
            "type": "Doc",
            "version": 1,
            "customUnknownDocProp": 12345,
            "children": [
                {
                    "id": "p1",
                    "type": "Page",
                    "size": [800, 600],
                    "pageOrigin": [0, 0],
                    "pageScale": 1,
                    "children": [
                        {
                            "id": "r1",
                            "type": "Rectangle",
                            "left": 50,
                            "top": 60,
                            "width": 120,
                            "height": 80,
                            "fillColor": "#3b82f6",
                            "fillStyle": "solid",
                            "strokeColor": "#1e40af",
                            "strokeWidth": 1.5,
                            "unknownShapeAttribute": "should-not-break",
                            "tags": ["diagram", "v1"]
                        }
                    ]
                }
            ]
        }
        """.trimIndent()

        val doc: Doc = objectMapper.readValue(dgmJson, Doc::class.java)
        assertEquals("root-doc", doc.id)
        assertEquals(1, doc.version)
        assertEquals(1, doc.children.size)

        val page = doc.children[0] as Page
        assertEquals("p1", page.id)
        assertEquals(listOf(800.0, 600.0), page.size)
        assertEquals(1, page.children.size)

        val rect = page.children[0] as Rectangle
        assertEquals("r1", rect.id)
        assertEquals(50.0, rect.left)
        assertEquals(60.0, rect.top)
        assertEquals(120.0, rect.width)
        assertEquals(80.0, rect.height)
        assertEquals("#3b82f6", rect.fillColor)
        assertEquals(listOf("diagram", "v1"), rect.tags)
    }
}
