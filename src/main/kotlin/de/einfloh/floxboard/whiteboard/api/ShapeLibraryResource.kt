package de.einfloh.floxboard.whiteboard.api

import de.einfloh.floxboard.whiteboard.api.dto.CreateShapeLibraryRequest
import de.einfloh.floxboard.whiteboard.api.dto.CreateShapeStencilRequest
import de.einfloh.floxboard.whiteboard.api.dto.UpdateShapeLibraryRequest
import de.einfloh.floxboard.whiteboard.domain.ShapeLibraryService
import io.quarkus.security.Authenticated
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.*

@Path("/api/v1/shape-libraries")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Shape Libraries", description = "Shape libraries and custom diagram stencils APIs")
class ShapeLibraryResource(
    private val shapeLibraryService: ShapeLibraryService,
    private val jwt: JsonWebToken
) {

    private fun getUserId(): UUID {
        val sub = jwt.subject ?: throw WebApplicationException("Subject is missing", 401)
        return try {
            UUID.fromString(sub)
        } catch (e: Exception) {
            throw WebApplicationException("Invalid user ID in JWT subject", 401)
        }
    }

    @GET
    @Operation(summary = "List all shape libraries accessible to the current user")
    fun listLibraries(): Response {
        val libraries = shapeLibraryService.listLibraries(getUserId())
        return Response.ok(libraries).build()
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get shape library details and stencils by ID")
    fun getLibrary(@PathParam("id") id: UUID): Response {
        return try {
            val lib = shapeLibraryService.getLibrary(id, getUserId())
            Response.ok(lib).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to (e.message ?: "Shape library not found")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied to shape library")))
                .build()
        }
    }

    @POST
    @Operation(summary = "Create a new custom personal or organization shape library")
    fun createLibrary(request: CreateShapeLibraryRequest): Response {
        return try {
            val created = shapeLibraryService.createLibrary(getUserId(), request)
            Response.status(Response.Status.CREATED).entity(created).build()
        } catch (e: IllegalArgumentException) {
            Response.status(Response.Status.BAD_REQUEST)
                .entity(mapOf("error" to (e.message ?: "Invalid request")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied")))
                .build()
        }
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update shape library metadata and sharing settings")
    fun updateLibrary(@PathParam("id") id: UUID, request: UpdateShapeLibraryRequest): Response {
        return try {
            val updated = shapeLibraryService.updateLibrary(id, getUserId(), request)
            Response.ok(updated).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to (e.message ?: "Shape library not found")))
                .build()
        } catch (e: IllegalArgumentException) {
            Response.status(Response.Status.BAD_REQUEST)
                .entity(mapOf("error" to (e.message ?: "Invalid request")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied")))
                .build()
        }
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete a shape library and its stencils")
    fun deleteLibrary(@PathParam("id") id: UUID): Response {
        return try {
            shapeLibraryService.deleteLibrary(id, getUserId())
            Response.noContent().build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to (e.message ?: "Shape library not found")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied")))
                .build()
        }
    }

    @POST
    @Path("/{id}/stencils")
    @Operation(summary = "Add a new stencil to a shape library")
    fun createStencil(@PathParam("id") id: UUID, request: CreateShapeStencilRequest): Response {
        return try {
            val created = shapeLibraryService.createStencil(id, getUserId(), request)
            Response.status(Response.Status.CREATED).entity(created).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to (e.message ?: "Shape library not found")))
                .build()
        } catch (e: IllegalArgumentException) {
            Response.status(Response.Status.BAD_REQUEST)
                .entity(mapOf("error" to (e.message ?: "Invalid request")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied")))
                .build()
        }
    }

    @DELETE
    @Path("/{id}/stencils/{stencilId}")
    @Operation(summary = "Delete a stencil from a shape library")
    fun deleteStencil(@PathParam("id") id: UUID, @PathParam("stencilId") stencilId: UUID): Response {
        return try {
            shapeLibraryService.deleteStencil(id, stencilId, getUserId())
            Response.noContent().build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to (e.message ?: "Stencil not found")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied")))
                .build()
        }
    }
}
