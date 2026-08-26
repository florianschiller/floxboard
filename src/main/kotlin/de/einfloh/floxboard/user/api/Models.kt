package de.einfloh.floxboard.user.api

import java.util.UUID

data class UserProfileDto(
    val id: UUID,
    val username: String,
    val email: String,
    val firstName: String?,
    val lastName: String?,
    val emailVerified: Boolean,
    val roles: List<String>
)

data class UpdateProfileRequest(
    val firstName: String?,
    val lastName: String?
)
