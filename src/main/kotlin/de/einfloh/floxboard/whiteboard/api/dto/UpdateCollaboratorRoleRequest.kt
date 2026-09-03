package de.einfloh.floxboard.whiteboard.api.dto

import de.einfloh.floxboard.whiteboard.domain.CollaboratorRole

data class UpdateCollaboratorRoleRequest(
    val role: CollaboratorRole
)
