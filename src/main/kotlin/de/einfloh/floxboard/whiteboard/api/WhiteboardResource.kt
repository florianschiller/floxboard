package de.einfloh.floxboard.whiteboard.api

import de.einfloh.floxboard.whiteboard.api.dto.SaveWhiteboardRequest
import de.einfloh.floxboard.whiteboard.domain.UserInfo
import de.einfloh.floxboard.whiteboard.domain.WhiteboardService
import de.einfloh.floxboard.whiteboard.domain.WhiteboardSummary
import io.quarkus.security.Authenticated
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.UUID

@Path("/api/v1/whiteboards")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Whiteboard", description = "Whiteboard management APIs")
class WhiteboardResource(
    private val service: WhiteboardService,
    private val jwt: JsonWebToken
) {
    private fun getUserId(): String = jwt.subject ?: throw WebApplicationException("Subject is missing", 401)
    private fun getUserEmail(): String = (jwt.getClaim<String>("email") ?: jwt.getClaim<String>("preferred_username") ?: getUserId())
    private fun getUsername(): String = (jwt.getClaim<String>("preferred_username") ?: jwt.getClaim<String>("name") ?: getUserEmail())

    @GET
    @Operation(summary = "List all whiteboards owned by the authenticated user")
    fun list(
        @Parameter(description = "Zero-based index of the first item to return") @QueryParam("start") start: Int?,
        @Parameter(description = "Maximum number of items to return (default: 5)") @QueryParam("max") max: Int?
    ): List<WhiteboardSummary> {
        val effectiveMax = max ?: 5
        val effectiveStart = start ?: 0
        return service.listForUser(getUserId(), effectiveStart, effectiveMax)
    }

    @GET
    @Path("/shared")
    @Operation(summary = "List all whiteboards shared with the authenticated user")
    fun listShared(
        @Parameter(description = "Zero-based index of the first item to return") @QueryParam("start") start: Int?,
        @Parameter(description = "Maximum number of items to return (default: 5)") @QueryParam("max") max: Int?
    ): List<WhiteboardSummary> {
        val effectiveMax = max ?: 5
        val effectiveStart = start ?: 0
        return service.listSharedForUser(getUserId(), effectiveStart, effectiveMax)
    }

    @GET
    @Path("/users")
    @Operation(summary = "Search users across user base")
    fun searchUsers(
        @Parameter(description = "Search query for user email or username") @QueryParam("q") query: String?
    ): List<UserInfo> {
        if (query.isNullOrBlank()) return emptyList()
        val userId = try { UUID.fromString(getUserId()) } catch (e: Exception) { null }
        return service.searchUsers(query.trim(), userId)
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get a whiteboard by ID")
    fun get(@PathParam("id") id: UUID): Response {
        return try {
            val whiteboard = service.getForUser(getUserId(), id)
            Response.ok(whiteboard).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND).entity(mapOf("error" to (e.message ?: "Whiteboard not found"))).build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN).entity(mapOf("error" to (e.message ?: "Access denied to whiteboard"))).build()
        }
    }

    @GET
    @Path("/{id}/role")
    @Operation(summary = "Get user role for a whiteboard")
    fun getRole(@PathParam("id") id: UUID): Response {
        val role = service.getRoleForUser(UUID.fromString(getUserId()), id)
        return if (role != null) {
            Response.ok(mapOf("role" to role.name)).build()
        } else {
            Response.status(Response.Status.FORBIDDEN).entity(mapOf("error" to "No access to whiteboard")).build()
        }
    }

    @POST
    @Operation(summary = "Create or update a whiteboard")
    fun save(request: SaveWhiteboardRequest): Response {
        return try {
            val saved = service.saveForUser(
                userId = getUserId(),
                name = request.name,
                content = request.content,
                id = request.id,
                ownerUsername = getUsername(),
                ownerEmail = getUserEmail()
            )
            Response.ok(saved).build()
        } catch (e: de.einfloh.floxboard.license.domain.QuotaExceededException) {
            Response.status(402)
                .entity(
                    mapOf(
                        "error" to (e.message ?: "Quota exceeded"),
                        "metricKey" to e.metricKey,
                        "current" to e.current,
                        "limit" to e.limit
                    )
                )
                .build()
        } catch (e: IllegalArgumentException) {
            Response.status(Response.Status.CONFLICT)
                .entity(mapOf("error" to (e.message ?: "A whiteboard with this name already exists")))
                .build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to (e.message ?: "Whiteboard not found")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied")))
                .build()
        }
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a whiteboard")
    fun delete(@PathParam("id") id: UUID): Response {
        val deleted = service.deleteForUser(getUserId(), id)
        return if (deleted) Response.noContent().build() else Response.status(404).build()
    }
}
