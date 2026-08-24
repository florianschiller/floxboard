package de.einfloh.floxboard.notification.application.port.out

import io.smallrye.mutiny.Uni
import java.util.UUID

interface EmailNotificationPort {
    fun sendCollaboratorInvite(
        recipientEmail: String,
        recipientUsername: String,
        whiteboardId: UUID,
        whiteboardName: String,
        role: String
    ): Uni<Void>

    fun sendAccessRequestNotification(
        recipientEmail: String,
        recipientUsername: String,
        whiteboardId: UUID,
        whiteboardName: String,
        approved: Boolean,
        role: String?
    ): Uni<Void>
}
