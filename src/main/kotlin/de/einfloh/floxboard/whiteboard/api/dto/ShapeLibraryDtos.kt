package de.einfloh.floxboard.whiteboard.api.dto

import de.einfloh.floxboard.whiteboard.domain.ShapeLibrary
import de.einfloh.floxboard.whiteboard.domain.ShapeStencil
import de.einfloh.floxboard.whiteboard.domain.StencilCategory
import de.einfloh.floxboard.whiteboard.domain.StencilPermission
import java.time.Instant
import java.util.UUID

data class CreateShapeLibraryRequest(
    val name: String,
    val description: String? = null,
    val organizationId: String? = null,
    val categories: List<StencilCategory> = listOf(StencilCategory.GENERAL),
    val defaultRole: StencilPermission = StencilPermission.READ
)

data class UpdateShapeLibraryRequest(
    val name: String? = null,
    val description: String? = null,
    val categories: List<StencilCategory>? = null,
    val defaultRole: StencilPermission? = null
)

data class CreateShapeStencilRequest(
    val name: String,
    val category: StencilCategory = StencilCategory.GENERAL,
    val description: String? = null,
    val shapesJson: String,
    val thumbnailSvg: String? = null
)

data class ShapeStencilDto(
    val id: UUID,
    val libraryId: UUID,
    val name: String,
    val category: StencilCategory,
    val description: String?,
    val shapesJson: String,
    val thumbnailSvg: String?,
    val createdBy: UUID,
    val createdAt: Instant
)

data class ShapeLibraryDto(
    val id: UUID,
    val name: String,
    val description: String?,
    val userId: UUID,
    val organizationId: String?,
    val categories: List<StencilCategory>,
    val defaultRole: StencilPermission,
    val createdAt: Instant,
    val updatedAt: Instant?,
    val permission: StencilPermission = StencilPermission.ADMIN,
    val stencilCount: Int = 0
)

data class ShapeLibraryDetailDto(
    val id: UUID,
    val name: String,
    val description: String?,
    val userId: UUID,
    val organizationId: String?,
    val categories: List<StencilCategory>,
    val defaultRole: StencilPermission,
    val createdAt: Instant,
    val updatedAt: Instant?,
    val permission: StencilPermission,
    val stencils: List<ShapeStencilDto>
)

fun ShapeStencil.toDto(): ShapeStencilDto = ShapeStencilDto(
    id = this.id!!,
    libraryId = this.libraryId,
    name = this.name,
    category = this.category,
    description = this.description,
    shapesJson = this.shapesJson,
    thumbnailSvg = this.thumbnailSvg,
    createdBy = this.createdBy,
    createdAt = this.createdAt
)

fun ShapeLibrary.toDto(permission: StencilPermission, stencilCount: Int = 0): ShapeLibraryDto = ShapeLibraryDto(
    id = this.id!!,
    name = this.name,
    description = this.description,
    userId = this.userId,
    organizationId = this.organizationId,
    categories = this.categories,
    defaultRole = this.defaultRole,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
    permission = permission,
    stencilCount = stencilCount
)

fun ShapeLibrary.toDetailDto(permission: StencilPermission, stencils: List<ShapeStencil>): ShapeLibraryDetailDto = ShapeLibraryDetailDto(
    id = this.id!!,
    name = this.name,
    description = this.description,
    userId = this.userId,
    organizationId = this.organizationId,
    categories = this.categories,
    defaultRole = this.defaultRole,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
    permission = permission,
    stencils = stencils.map { it.toDto() }
)
