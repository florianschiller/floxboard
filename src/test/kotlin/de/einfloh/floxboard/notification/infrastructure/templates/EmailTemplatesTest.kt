package de.einfloh.floxboard.notification.infrastructure.templates

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class EmailTemplatesTest {

    @Test
    fun testCollaboratorInviteTemplate() {
        val html = EmailTemplates.collaboratorInvite(
            username = "Alice",
            whiteboardName = "Project Roadmap",
            role = "EDITOR",
            boardUrl = "http://localhost:8080/board/123e4567-e89b-12d3-a456-426614174000"
        )

        assertTrue(html.contains("Hello, Alice!"))
        assertTrue(html.contains("Project Roadmap"))
        assertTrue(html.contains("EDITOR"))
        assertTrue(html.contains("http://localhost:8080/board/123e4567-e89b-12d3-a456-426614174000"))
        assertTrue(html.contains("Open Whiteboard"))
    }

    @Test
    fun testAccessRequestApprovedTemplate() {
        val html = EmailTemplates.accessRequestResolved(
            username = "Bob",
            whiteboardName = "Architecture Board",
            approved = true,
            role = "VIEWER",
            boardUrl = "http://localhost:8080/board/123e4567-e89b-12d3-a456-426614174000"
        )

        assertTrue(html.contains("Hello, Bob!"))
        assertTrue(html.contains("Architecture Board"))
        assertTrue(html.contains("approved"))
        assertTrue(html.contains("VIEWER"))
        assertTrue(html.contains("http://localhost:8080/board/123e4567-e89b-12d3-a456-426614174000"))
        assertTrue(html.contains("Open Whiteboard"))
    }

    @Test
    fun testAccessRequestRejectedTemplate() {
        val html = EmailTemplates.accessRequestResolved(
            username = "Charlie",
            whiteboardName = "Confidential Board",
            approved = false,
            role = null,
            boardUrl = "http://localhost:8080/board/123e4567-e89b-12d3-a456-426614174000"
        )

        assertTrue(html.contains("Hello, Charlie!"))
        assertTrue(html.contains("Confidential Board"))
        assertTrue(html.contains("rejected"))
    }
}
