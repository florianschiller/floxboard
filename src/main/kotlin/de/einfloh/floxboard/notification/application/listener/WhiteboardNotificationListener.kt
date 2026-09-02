package de.einfloh.floxboard.notification.application.listener

import de.einfloh.floxboard.notification.application.port.out.EmailNotificationPort
import de.einfloh.floxboard.whiteboard.domain.events.AccessRequestResolvedEvent
import de.einfloh.floxboard.whiteboard.domain.events.AccessRequestedEvent
import de.einfloh.floxboard.whiteboard.domain.events.CollaboratorInvitedEvent
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.event.ObservesAsync
import org.jboss.logging.Logger

@ApplicationScoped
class WhiteboardNotificationListener(
    private val emailNotificationPort: EmailNotificationPort
) {
    private val log = Logger.getLogger(WhiteboardNotificationListener::class.java)

    fun onCollaboratorInvited(@ObservesAsync event: CollaboratorInvitedEvent) {
        log.infof("Processing CollaboratorInvitedEvent for %s on whiteboard %s", event.recipientEmail, event.whiteboardId)
        emailNotificationPort.sendCollaboratorInvite(
            recipientEmail = event.recipientEmail,
            recipientUsername = event.recipientUsername,
            whiteboardId = event.whiteboardId,
            whiteboardName = event.whiteboardName,
            role = event.role.name
        ).subscribe().with(
            { log.debugf("Collaborator invite sent to %s", event.recipientEmail) },
            { ex -> log.errorf(ex, "Failed to send collaborator invite to %s", event.recipientEmail) }
        )
    }

    fun onAccessRequestResolved(@ObservesAsync event: AccessRequestResolvedEvent) {
        log.infof("Processing AccessRequestResolvedEvent for %s (approved=%s) on whiteboard %s", event.recipientEmail, event.approved, event.whiteboardId)
        emailNotificationPort.sendAccessRequestNotification(
            recipientEmail = event.recipientEmail,
            recipientUsername = event.recipientUsername,
            whiteboardId = event.whiteboardId,
            whiteboardName = event.whiteboardName,
            approved = event.approved,
            role = event.assignedRole?.name
        ).subscribe().with(
            { log.debugf("Access request notification sent to %s", event.recipientEmail) },
            { ex -> log.errorf(ex, "Failed to send access request notification to %s", event.recipientEmail) }
        )
    }

    fun onAccessRequested(@ObservesAsync event: AccessRequestedEvent) {
        log.infof("Processing AccessRequestedEvent for recipient %s (requester=%s) on whiteboard %s", event.recipientEmail, event.requesterEmail, event.whiteboardId)
        emailNotificationPort.sendAccessRequestedNotification(
            recipientEmail = event.recipientEmail,
            recipientUsername = event.recipientUsername,
            requesterEmail = event.requesterEmail,
            requesterUsername = event.requesterUsername,
            whiteboardId = event.whiteboardId,
            whiteboardName = event.whiteboardName,
            requestedRole = event.requestedRole.name,
            message = event.message
        ).subscribe().with(
            { log.debugf("Access requested notification sent to %s", event.recipientEmail) },
            { ex -> log.errorf(ex, "Failed to send access requested notification to %s", event.recipientEmail) }
        )
    }
}
