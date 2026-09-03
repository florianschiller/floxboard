package de.einfloh.floxboard.whiteboard.api.dto

import java.util.UUID

data class AssetUploadResponse(
    val assetId: UUID,
    val url: String,
    val contentType: String,
    val size: Long
)
