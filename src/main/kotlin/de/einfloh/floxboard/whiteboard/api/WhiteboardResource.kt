package de.einfloh.floxboard.whiteboard.api

import de.einfloh.floxboard.license.domain.EntitlementService
import de.einfloh.floxboard.license.domain.UsageLedgerService
import de.einfloh.floxboard.whiteboard.domain.*
import de.einfloh.floxboard.whiteboard.domain.dgm.Doc
import de.einfloh.floxboard.whiteboard.storage.AssetStorageService
import io.quarkus.security.Authenticated
import jakarta.annotation.security.PermitAll
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import org.jboss.resteasy.reactive.RestForm
import org.jboss.resteasy.reactive.multipart.FileUpload
import java.nio.file.Files
import java.util.*

data class SaveWhiteboardRequest(
    val id: UUID? = null,
    val name: String,
    val content: Doc? = null
)

data class AssetUploadResponse(
    val assetId: UUID,
    val url: String,
    val contentType: String,
    val size: Long
)

data class AddCollaboratorRequest(
    val email: String? = null,
    val query: String? = null,
    val role: CollaboratorRole = CollaboratorRole.EDITOR
)

data class UpdateCollaboratorRoleRequest(
    val role: CollaboratorRole
)

data class CreateAccessRequestDto(
    val requestedRole: CollaboratorRole = CollaboratorRole.EDITOR,
    val message: String? = null
)

data class ResolveAccessRequestDto(
    val role: CollaboratorRole? = null
)

@Path("/api/v1/whiteboards")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Whiteboard", description = "Whiteboard management APIs")
class WhiteboardResource(
    private val service: WhiteboardService,
    private val jwt: JsonWebToken,
    private val assetStorageService: AssetStorageService,
    private val entitlementService: EntitlementService,
    private val usageLedgerService: UsageLedgerService
) {
    companion object {
        private val ALLOWED_IMAGE_TYPES = setOf(
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp",
            "image/svg+xml",
            "image/gif"
        )
    }

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

    // Collaborators
    @GET
    @Path("/{id}/collaborators")
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
    @Path("/{id}/collaborators")
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
    @Path("/{id}/collaborators/{userId}")
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
    @Path("/{id}/collaborators/{userId}")
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

    // Access Requests
    @POST
    @Path("/{id}/access-requests")
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
    @Path("/{id}/access-requests")
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
    @Path("/{id}/access-requests/my")
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
    @Path("/{id}/access-requests/{requestId}/approve")
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
    @Path("/{id}/access-requests/{requestId}/reject")
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

    // Asset Management
    @POST
    @Path("/{id}/assets")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(summary = "Upload an image asset to a whiteboard")
    fun uploadAsset(
        @PathParam("id") id: UUID,
        @RestForm("file") file: FileUpload?
    ): Response {
        if (file == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(mapOf("error" to "File is missing in multipart upload"))
                .build()
        }

        val userUuid = UUID.fromString(getUserId())

        // 1. Verify board edit permission
        if (!service.canEdit(id, userUuid)) {
            return if (!service.exists(id)) {
                Response.status(Response.Status.NOT_FOUND)
                    .entity(mapOf("error" to "Whiteboard not found"))
                    .build()
            } else {
                Response.status(Response.Status.FORBIDDEN)
                    .entity(mapOf("error" to "You do not have permission to upload assets to this whiteboard"))
                    .build()
            }
        }

        // 2. Validate MIME type
        val cleanMime = (file.contentType() ?: "").substringBefore(";").trim().lowercase()
        val detectedMime = if (cleanMime in ALLOWED_IMAGE_TYPES) {
            cleanMime
        } else {
            when (file.fileName()?.substringAfterLast('.', "")?.lowercase()) {
                "png" -> "image/png"
                "jpg", "jpeg" -> "image/jpeg"
                "webp" -> "image/webp"
                "svg" -> "image/svg+xml"
                "gif" -> "image/gif"
                else -> return Response.status(Response.Status.BAD_REQUEST)
                    .entity(mapOf("error" to "Unsupported file type. Allowed formats: PNG, JPEG, WebP, SVG, GIF"))
                    .build()
            }
        }

        // 3. Check License Feature Entitlement
        val featureAllowed = entitlementService.hasFeature(userUuid, "whiteboard:image_upload")
        if (!featureAllowed) {
            return Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to "Image upload is not enabled for your license plan"))
                .build()
        }

        val fileSize = file.size()

        // 4. Check Single File Max Size Quota
        val maxFileQuota = entitlementService.checkQuota(userUuid, "storage:max_file_size_bytes", requestedDelta = 0)
        if (maxFileQuota.limit != null && fileSize > maxFileQuota.limit) {
            return Response.status(402)
                .entity(mapOf("error" to "File size (${fileSize} bytes) exceeds the maximum allowed file size of ${maxFileQuota.limit} bytes"))
                .build()
        }

        // 5. Check Total Saved Storage Quota per user
        val storageQuota = entitlementService.checkQuota(userUuid, "storage:user_storage_bytes", requestedDelta = fileSize)
        if (!storageQuota.allowed) {
            return Response.status(402)
                .entity(mapOf("error" to "User storage quota exceeded. Current: ${storageQuota.current} bytes, limit: ${storageQuota.limit} bytes"))
                .build()
        }

        // 6. Store file
        val assetId = UUID.randomUUID()
        val stored = Files.newInputStream(file.filePath()).use { inputStream ->
            assetStorageService.store(
                whiteboardId = id,
                assetId = assetId,
                inputStream = inputStream,
                mimeType = detectedMime,
                sizeBytes = fileSize
            )
        }

        // 7. Record usage in ledger
        usageLedgerService.recordUsage(
            ownerId = userUuid,
            metricKey = "storage:user_storage_bytes",
            units = stored.sizeBytes,
            operation = "UPLOAD_ASSET",
            metadata = mapOf(
                "whiteboardId" to id.toString(),
                "assetId" to assetId.toString(),
                "fileName" to (file.fileName() ?: ""),
                "contentType" to detectedMime
            )
        )

        val result = AssetUploadResponse(
            assetId = assetId,
            url = "/api/v1/whiteboards/$id/assets/$assetId",
            contentType = stored.contentType,
            size = stored.sizeBytes
        )

        return Response.status(Response.Status.CREATED).entity(result).build()
    }

    @GET
    @Path("/{id}/assets/{assetId}")
    @Produces("*/*")
    @PermitAll
    @Operation(summary = "Get a whiteboard asset by ID")
    fun getAsset(
        @PathParam("id") id: UUID,
        @PathParam("assetId") assetId: UUID
    ): Response {
        if (!service.exists(id)) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to "Whiteboard not found"))
                .build()
        }

        val resource = assetStorageService.load(id, assetId)
            ?: return Response.status(Response.Status.NOT_FOUND)
                .entity(mapOf("error" to "Asset not found"))
                .build()

        return Response.ok(resource.inputStream, resource.contentType)
            .header("Content-Type", resource.contentType)
            .header("Content-Length", resource.sizeBytes)
            .header("ETag", "\"$assetId\"")
            .header("Cache-Control", "public, max-age=31536000, immutable")
            .build()
    }

    @DELETE
    @Path("/{id}/assets/{assetId}")
    @Operation(summary = "Delete a whiteboard asset by ID")
    fun deleteAsset(
        @PathParam("id") id: UUID,
        @PathParam("assetId") assetId: UUID
    ): Response {
        val userUuid = UUID.fromString(getUserId())
        if (!service.canEdit(id, userUuid)) {
            return Response.status(Response.Status.FORBIDDEN)
                .entity(mapOf("error" to "Access denied"))
                .build()
        }

        val deleted = assetStorageService.delete(id, assetId)
        return if (deleted) {
            Response.noContent().build()
        } else {
            Response.status(Response.Status.NOT_FOUND).build()
        }
    }
}
