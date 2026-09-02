package de.einfloh.floxboard.whiteboard.storage

import java.io.InputStream
import java.time.Instant
import java.util.UUID

data class StoredAssetMetadata(
    val assetId: UUID,
    val whiteboardId: UUID,
    val contentType: String,
    val sizeBytes: Long,
    val relativePath: String
)

data class StoredAssetResource(
    val inputStream: InputStream,
    val contentType: String,
    val sizeBytes: Long,
    val lastModified: Instant
)

interface AssetStorageService {
    fun store(
        whiteboardId: UUID,
        assetId: UUID,
        inputStream: InputStream,
        mimeType: String,
        sizeBytes: Long? = null
    ): StoredAssetMetadata

    fun load(whiteboardId: UUID, assetId: UUID): StoredAssetResource?

    fun delete(whiteboardId: UUID, assetId: UUID): Boolean

    fun deleteForWhiteboard(whiteboardId: UUID): Boolean
}
