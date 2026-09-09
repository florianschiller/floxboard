package de.einfloh.floxboard.whiteboard.api

import de.einfloh.floxboard.license.domain.QuotaExceededException
import de.einfloh.floxboard.license.interceptors.RequireFeature
import de.einfloh.floxboard.whiteboard.api.dto.CreateSnapshotRequest
import de.einfloh.floxboard.whiteboard.api.dto.ForkSnapshotRequest
import de.einfloh.floxboard.whiteboard.domain.Whiteboard
import de.einfloh.floxboard.whiteboard.domain.WhiteboardHistoryService
import de.einfloh.floxboard.whiteboard.domain.WhiteboardSnapshot
import de.einfloh.floxboard.whiteboard.domain.WhiteboardSnapshotSummary
import io.quarkus.security.Authenticated
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.*

@Path("/api/v1/whiteboards/{id}/history")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
@RequireFeature("whiteboard:version_history")
@Tag(name = "Whiteboard History", description = "Whiteboard revision and snapshot history management APIs")
class WhiteboardHistoryResource(
    private val historyService: WhiteboardHistoryService,
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

    private fun getUserEmail(): String =
        jwt.getClaim<String>("email") ?: jwt.getClaim<String>("preferred_username") ?: getUserId().toString()

    private fun getUsername(): String =
        jwt.getClaim<String>("preferred_username") ?: jwt.getClaim<String>("name") ?: getUserEmail()

    @GET
    @Operation(summary = "List revision snapshots for a whiteboard")
    fun list(
        @PathParam("id") id: UUID,
        @Parameter(description = "Zero-based index of the first item to return") @QueryParam("start") start: Int?,
        @Parameter(description = "Maximum number of items to return (default: 20)") @QueryParam("max") max: Int?
    ): Response {
        return try {
            val snapshots = historyService.listSnapshots(
                whiteboardId = id,
                userId = getUserId(),
                start = start ?: 0,
                max = max ?: 20
            )
            Response.ok(snapshots).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to (e.message ?: "Whiteboard not found")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied to history")))
                .build()
        }
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Create a new named checkpoint snapshot for a whiteboard")
    fun create(
        @PathParam("id") id: UUID,
        request: CreateSnapshotRequest?
    ): Response {
        return try {
            val snapshot = historyService.createSnapshot(
                whiteboardId = id,
                userId = getUserId(),
                name = request?.name,
                description = request?.description,
                isAutomatic = false,
                isGeneratedByAI = request?.isGeneratedByAI ?: false
            )
            Response.ok(snapshot).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to (e.message ?: "Whiteboard not found")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied to whiteboard")))
                .build()
        }
    }

    @GET
    @Path("/{snapshotId}")
    @Operation(summary = "Get a specific revision snapshot by ID")
    fun get(
        @PathParam("id") id: UUID,
        @PathParam("snapshotId") snapshotId: UUID
    ): Response {
        return try {
            val snapshot = historyService.getSnapshot(
                whiteboardId = id,
                snapshotId = snapshotId,
                userId = getUserId()
            )
            Response.ok(snapshot).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to (e.message ?: "Snapshot not found")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied to snapshot")))
                .build()
        }
    }

    @POST
    @Path("/{snapshotId}/restore")
    @Operation(summary = "Restore a whiteboard to a previous snapshot state")
    fun restore(
        @PathParam("id") id: UUID,
        @PathParam("snapshotId") snapshotId: UUID
    ): Response {
        return try {
            val updatedBoard = historyService.restoreSnapshot(
                whiteboardId = id,
                snapshotId = snapshotId,
                userId = getUserId()
            )
            Response.ok(updatedBoard).build()
        } catch (e: NoSuchElementException) {
            Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to (e.message ?: "Snapshot or whiteboard not found")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied to restore whiteboard")))
                .build()
        }
    }

    @POST
    @Path("/{snapshotId}/fork")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Fork a snapshot into a new standalone whiteboard")
    fun fork(
        @PathParam("id") id: UUID,
        @PathParam("snapshotId") snapshotId: UUID,
        request: ForkSnapshotRequest
    ): Response {
        if (request.name.isBlank()) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(mapOf("error" to "Whiteboard name must not be blank"))
                .build()
        }
        return try {
            val forkedBoard = historyService.forkSnapshot(
                whiteboardId = id,
                snapshotId = snapshotId,
                userId = getUserId(),
                newName = request.name.trim(),
                ownerUsername = getUsername(),
                ownerEmail = getUserEmail()
            )
            Response.ok(forkedBoard).build()
        } catch (e: QuotaExceededException) {
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
                .entity(mapOf("error" to (e.message ?: "Snapshot or whiteboard not found")))
                .build()
        } catch (e: SecurityException) {
            Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to (e.message ?: "Access denied to fork whiteboard")))
                .build()
        }
    }
}
