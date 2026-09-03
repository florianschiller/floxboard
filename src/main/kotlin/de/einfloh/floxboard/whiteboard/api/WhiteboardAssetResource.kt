package de.einfloh.floxboard.whiteboard.api

import de.einfloh.floxboard.license.domain.EntitlementService
import de.einfloh.floxboard.license.domain.UsageLedgerService
import de.einfloh.floxboard.whiteboard.api.dto.AssetUploadResponse
import de.einfloh.floxboard.whiteboard.domain.WhiteboardService
import de.einfloh.floxboard.whiteboard.storage.AssetStorageService
import io.quarkus.security.Authenticated
import jakarta.annotation.security.PermitAll
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import org.jboss.resteasy.reactive.RestForm
import org.jboss.resteasy.reactive.multipart.FileUpload
import java.nio.file.Files
import java.util.UUID

@Path("/api/v1/whiteboards/{id}/assets")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Whiteboard Assets", description = "Whiteboard asset management APIs")
class WhiteboardAssetResource(
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

    @POST
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
    @Path("/{assetId}")
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
    @Path("/{assetId}")
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
