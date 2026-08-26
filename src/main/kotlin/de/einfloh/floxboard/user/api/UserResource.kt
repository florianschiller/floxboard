package de.einfloh.floxboard.user.api

import de.einfloh.floxboard.whiteboard.domain.UserService
import io.quarkus.security.Authenticated
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.UUID

@Path("/api/v1/user")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "User", description = "User profile and account management APIs")
class UserResource(
    private val userService: UserService,
    private val jwt: JsonWebToken
) {
    private fun getUserId(): UUID {
        val subject = jwt.subject ?: throw WebApplicationException("Subject is missing", 401)
        return UUID.fromString(subject)
    }

    @GET
    @Path("/me")
    @Operation(summary = "Get current authenticated user profile")
    fun getProfile(): UserProfileDto {
        return userService.getUserProfile(getUserId())
    }

    @PUT
    @Path("/me")
    @Operation(summary = "Update current user profile (first name and last name)")
    fun updateProfile(request: UpdateProfileRequest): UserProfileDto {
        return userService.updateUserProfile(
            userId = getUserId(),
            firstName = request.firstName,
            lastName = request.lastName
        )
    }
}
