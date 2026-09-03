package de.einfloh.floxboard.whiteboard.api

import de.einfloh.floxboard.whiteboard.api.dto.AddCollaboratorRequest
import de.einfloh.floxboard.whiteboard.api.dto.UpdateCollaboratorRoleRequest
import de.einfloh.floxboard.whiteboard.domain.WhiteboardCollaboratorService
import io.quarkus.security.Authenticated
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.UUID

@Path("/api/v1/whiteboards/{id}/collaborators")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Whiteboard Collaborators", description = "Whiteboard collaborator management APIs")
class WhiteboardCollaboratorResource(
    private val service: WhiteboardCollaboratorService,
    private val jwt: JsonWebToken
) {
    private fun getUserId(): String = jwt.subject ?: throw WebApplicationException("Subject is missing", 401)

    @GET
    @Operation(summary = "List all collaborators of a whiteboard")
    fun listCollaborators(@PathParam("id") id: UUID): Response {
        return try {
            val collaborators = service.listCollaborators(getUserId(), id)
            Response.ok(collaborators).build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN).entity(mapOf("error" to e.message)).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND).entity(mapOf("error" to e.message)).build()
        }
    }

    @POST
    @Operation(summary = "Add a collaborator to a whiteboard")
    fun addCollaborator(@PathParam("id") id: UUID, request: AddCollaboratorRequest): Response {
        val query = request.email ?: request.query ?: throw BadRequestException("Email or username is required")
        return try {
            val collab = service.addCollaborator(getUserId(), id, query, request.role)
            Response.ok(collab).build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN).entity(mapOf("error" to e.message)).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND).entity(mapOf("error" to e.message)).build()
        } catch (e: IllegalArgumentException) {
            Response.status(Response.Status.BAD_REQUEST).entity(mapOf("error" to e.message)).build()
        }
    }

    @PATCH
    @Path("/{userId}")
    @Operation(summary = "Update collaborator role")
    fun updateCollaboratorRole(
        @PathParam("id") id: UUID,
        @PathParam("userId") targetUserId: UUID,
        request: UpdateCollaboratorRoleRequest
    ): Response {
        return try {
            val updated = service.updateCollaboratorRole(getUserId(), id, targetUserId, request.role)
            Response.ok(updated).build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN).entity(mapOf("error" to e.message)).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND).entity(mapOf("error" to e.message)).build()
        } catch (e: IllegalArgumentException) {
            Response.status(Response.Status.BAD_REQUEST).entity(mapOf("error" to e.message)).build()
        }
    }

    @DELETE
    @Path("/{userId}")
    @Operation(summary = "Remove a collaborator")
    fun removeCollaborator(
        @PathParam("id") id: UUID,
        @PathParam("userId") targetUserId: UUID
    ): Response {
        return try {
            val removed = service.removeCollaborator(getUserId(), id, targetUserId)
            if (removed) Response.noContent().build() else Response.status(404).build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN).entity(mapOf("error" to e.message)).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND).entity(mapOf("error" to e.message)).build()
        }
    }
}
