package de.einfloh.floxboard.whiteboard.api.dto

import de.einfloh.floxboard.whiteboard.domain.CollaboratorRole

data class CreateAccessRequestDto(
    val requestedRole: CollaboratorRole = CollaboratorRole.EDITOR,
    val message: String? = null
)
