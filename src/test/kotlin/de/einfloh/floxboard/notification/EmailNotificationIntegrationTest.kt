package de.einfloh.floxboard.notification

import de.einfloh.floxboard.notification.application.port.out.EmailNotificationPort
import de.einfloh.floxboard.whiteboard.domain.CollaboratorRole
import de.einfloh.floxboard.whiteboard.domain.events.AccessRequestResolvedEvent
import de.einfloh.floxboard.whiteboard.domain.events.CollaboratorInvitedEvent
import io.quarkus.mailer.MockMailbox
import io.quarkus.test.junit.QuarkusTest
import jakarta.enterprise.event.Event
import jakarta.inject.Inject
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.util.UUID

@QuarkusTest
class EmailNotificationIntegrationTest {

    @Inject
    lateinit var mailbox: MockMailbox

    @Inject
    lateinit var emailNotificationPort: EmailNotificationPort

    @Inject
    lateinit var collaboratorInvitedEvent: Event<CollaboratorInvitedEvent>

    @Inject
    lateinit var accessRequestResolvedEvent: Event<AccessRequestResolvedEvent>

    @BeforeEach
    fun setUp() {
        mailbox.clear()
    }

    @Test
    fun testSendCollaboratorInviteDirect() {
        val whiteboardId = UUID.randomUUID()
        emailNotificationPort.sendCollaboratorInvite(
            recipientEmail = "invitee@example.com",
            recipientUsername = "testinvitee",
            whiteboardId = whiteboardId,
            whiteboardName = "Design Sprint",
            role = "EDITOR"
        ).await().indefinitely()

        val sent = mailbox.getMailsSentTo("invitee@example.com")
        assertEquals(1, sent.size)
        val mail = sent[0]
        assertTrue(mail.subject.contains("Design Sprint"))
        assertTrue(mail.html.contains("testinvitee"))
        assertTrue(mail.html.contains("EDITOR"))
        assertTrue(mail.html.contains(whiteboardId.toString()))
    }

    @Test
    fun testSendAccessRequestApprovedDirect() {
        val whiteboardId = UUID.randomUUID()
        emailNotificationPort.sendAccessRequestNotification(
            recipientEmail = "requester@example.com",
            recipientUsername = "requesterUser",
            whiteboardId = whiteboardId,
            whiteboardName = "Sprint Retrospective",
            approved = true,
            role = "ADMIN"
        ).await().indefinitely()

        val sent = mailbox.getMailsSentTo("requester@example.com")
        assertEquals(1, sent.size)
        val mail = sent[0]
        assertTrue(mail.subject.contains("Access Request Approved"))
        assertTrue(mail.html.contains("requesterUser"))
        assertTrue(mail.html.contains("ADMIN"))
        assertTrue(mail.html.contains("Sprint Retrospective"))
    }

    @Test
    fun testSendAccessRequestRejectedDirect() {
        val whiteboardId = UUID.randomUUID()
        emailNotificationPort.sendAccessRequestNotification(
            recipientEmail = "rejected@example.com",
            recipientUsername = "rejectedUser",
            whiteboardId = whiteboardId,
            whiteboardName = "Secret Project",
            approved = false,
            role = null
        ).await().indefinitely()

        val sent = mailbox.getMailsSentTo("rejected@example.com")
        assertEquals(1, sent.size)
        val mail = sent[0]
        assertTrue(mail.subject.contains("Access Request Rejected"))
        assertTrue(mail.html.contains("rejectedUser"))
        assertTrue(mail.html.contains("Secret Project"))
    }

    @Test
    fun testAsyncCollaboratorInvitedEventFlow() {
        val whiteboardId = UUID.randomUUID()
        collaboratorInvitedEvent.fireAsync(
            CollaboratorInvitedEvent(
                whiteboardId = whiteboardId,
                whiteboardName = "Event Driven Board",
                recipientEmail = "eventuser@example.com",
                recipientUsername = "eventuser",
                role = CollaboratorRole.EDITOR
            )
        )

        // Give async event a short window to process
        var sent = mailbox.getMailsSentTo("eventuser@example.com")
        var attempts = 0
        while (sent.isEmpty() && attempts < 50) {
            Thread.sleep(50)
            sent = mailbox.getMailsSentTo("eventuser@example.com")
            attempts++
        }

        assertEquals(1, sent.size)
        val mail = sent[0]
        assertTrue(mail.subject.contains("Event Driven Board"))
        assertTrue(mail.html.contains("eventuser"))
        assertTrue(mail.html.contains("EDITOR"))
    }

    @Test
    fun testAsyncAccessRequestResolvedEventFlow() {
        val whiteboardId = UUID.randomUUID()
        accessRequestResolvedEvent.fireAsync(
            AccessRequestResolvedEvent(
                whiteboardId = whiteboardId,
                whiteboardName = "Access Event Board",
                recipientEmail = "resolveduser@example.com",
                recipientUsername = "resolveduser",
                approved = true,
                assignedRole = CollaboratorRole.VIEWER
            )
        )

        // Give async event a short window to process
        var sent = mailbox.getMailsSentTo("resolveduser@example.com")
        var attempts = 0
        while (sent.isEmpty() && attempts < 50) {
            Thread.sleep(50)
            sent = mailbox.getMailsSentTo("resolveduser@example.com")
            attempts++
        }

        assertEquals(1, sent.size)
        val mail = sent[0]
        assertTrue(mail.subject.contains("Access Request Approved"))
        assertTrue(mail.html.contains("resolveduser"))
        assertTrue(mail.html.contains("VIEWER"))
    }
}
