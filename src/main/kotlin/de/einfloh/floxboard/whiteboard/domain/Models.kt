package de.einfloh.floxboard.whiteboard.domain

import java.time.Instant
import java.util.UUID

data class WhiteboardSummary(
    val id: UUID,
    val name: String,
    val role: CollaboratorRole = CollaboratorRole.OWNER,
    val createdAt: Instant? = null,
    val updatedAt: Instant? = null
)

data class CollaboratorInfo(
    val id: UUID?,
    val userId: UUID,
    val userEmail: String,
    val username: String?,
    val role: CollaboratorRole,
    val createdAt: Instant?
)
