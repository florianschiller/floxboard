package de.einfloh.floxboard.whiteboard.domain.events

import de.einfloh.floxboard.whiteboard.domain.CollaboratorRole
import java.util.UUID

data class CollaboratorInvitedEvent(
    val whiteboardId: UUID,
    val whiteboardName: String,
    val recipientEmail: String,
    val recipientUsername: String,
    val role: CollaboratorRole
)

data class AccessRequestResolvedEvent(
    val whiteboardId: UUID,
    val whiteboardName: String,
    val recipientEmail: String,
    val recipientUsername: String,
    val approved: Boolean,
    val assignedRole: CollaboratorRole?
)
