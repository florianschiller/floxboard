package de.einfloh.floxboard.whiteboard.api

import de.einfloh.floxboard.whiteboard.api.dto.CreateAccessRequestDto
import de.einfloh.floxboard.whiteboard.api.dto.ResolveAccessRequestDto
import de.einfloh.floxboard.whiteboard.domain.WhiteboardAccessRequestService
import io.quarkus.security.Authenticated
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.UUID

@Path("/api/v1/whiteboards/{id}/access-requests")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Whiteboard Access Requests", description = "Whiteboard access request management APIs")
class WhiteboardAccessRequestResource(
    private val service: WhiteboardAccessRequestService,
    private val jwt: JsonWebToken
) {
    private fun getUserId(): String = jwt.subject ?: throw WebApplicationException("Subject is missing", 401)
    private fun getUserEmail(): String = (jwt.getClaim<String>("email") ?: jwt.getClaim<String>("preferred_username") ?: getUserId())
    private fun getUsername(): String = (jwt.getClaim<String>("preferred_username") ?: jwt.getClaim<String>("name") ?: getUserEmail())

    @POST
    @Operation(summary = "Request access to a whiteboard")
    fun createAccessRequest(
        @PathParam("id") id: UUID,
        request: CreateAccessRequestDto
    ): Response {
        return try {
            val accessRequest = service.createAccessRequest(
                requesterId = getUserId(),
                requesterEmail = getUserEmail(),
                requesterUsername = getUsername(),
                whiteboardId = id,
                requestedRole = request.requestedRole,
                message = request.message
            )
            Response.ok(accessRequest).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND).entity(mapOf("error" to e.message)).build()
        } catch (e: IllegalArgumentException) {
            Response.status(Response.Status.BAD_REQUEST).entity(mapOf("error" to e.message)).build()
        }
    }

    @GET
    @Operation(summary = "List pending access requests for a whiteboard")
    fun listPendingAccessRequests(@PathParam("id") id: UUID): Response {
        return try {
            val requests = service.listPendingAccessRequests(getUserId(), id)
            Response.ok(requests).build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN).entity(mapOf("error" to e.message)).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND).entity(mapOf("error" to e.message)).build()
        }
    }

    @GET
    @Path("/my")
    @Operation(summary = "Get current user's access request for a whiteboard")
    fun getMyAccessRequest(@PathParam("id") id: UUID): Response {
        val request = service.getMyAccessRequest(getUserId(), id)
        return if (request != null) {
            Response.ok(request).build()
        } else {
            Response.status(Response.Status.NOT_FOUND).build()
        }
    }

    @POST
    @Path("/{requestId}/approve")
    @Operation(summary = "Approve an access request")
    fun approveAccessRequest(
        @PathParam("id") id: UUID,
        @PathParam("requestId") requestId: UUID,
        request: ResolveAccessRequestDto?
    ): Response {
        return try {
            val resolved = service.resolveAccessRequest(
                requesterId = getUserId(),
                whiteboardId = id,
                requestId = requestId,
                approve = true,
                assignedRole = request?.role
            )
            Response.ok(resolved).build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN).entity(mapOf("error" to e.message)).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND).entity(mapOf("error" to e.message)).build()
        } catch (e: IllegalArgumentException) {
            Response.status(Response.Status.BAD_REQUEST).entity(mapOf("error" to e.message)).build()
        }
    }

    @POST
    @Path("/{requestId}/reject")
    @Operation(summary = "Reject an access request")
    fun rejectAccessRequest(
        @PathParam("id") id: UUID,
        @PathParam("requestId") requestId: UUID
    ): Response {
        return try {
            val resolved = service.resolveAccessRequest(
                requesterId = getUserId(),
                whiteboardId = id,
                requestId = requestId,
                approve = false
            )
            Response.ok(resolved).build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN).entity(mapOf("error" to e.message)).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND).entity(mapOf("error" to e.message)).build()
        } catch (e: IllegalArgumentException) {
            Response.status(Response.Status.BAD_REQUEST).entity(mapOf("error" to e.message)).build()
        }
    }
}
