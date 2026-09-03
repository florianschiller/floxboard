package de.einfloh.floxboard.whiteboard.api.dto

import de.einfloh.floxboard.whiteboard.domain.CollaboratorRole

data class AddCollaboratorRequest(
    val email: String? = null,
    val query: String? = null,
    val role: CollaboratorRole = CollaboratorRole.EDITOR
)
