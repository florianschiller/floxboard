package de.einfloh.floxboard.whiteboard.domain

import de.einfloh.floxboard.organization.domain.OrgMemberRole
import de.einfloh.floxboard.organization.domain.OrganizationMemberRoleRepository
import de.einfloh.floxboard.whiteboard.api.dto.*
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import java.time.Instant
import java.util.UUID

@ApplicationScoped
class ShapeLibraryService(
    private val shapeLibraryRepository: ShapeLibraryRepository,
    private val shapeStencilRepository: ShapeStencilRepository,
    private val permissionRepository: ShapeLibraryMemberPermissionRepository,
    private val orgMemberRoleRepository: OrganizationMemberRoleRepository
) {

    fun getUserOrganizationIds(userId: UUID): List<String> {
        return orgMemberRoleRepository.findByUserId(userId).map { it.organizationId }.distinct()
    }

    fun resolveUserPermission(library: ShapeLibrary, userId: UUID): StencilPermission? {
        if (library.userId == userId) {
            return StencilPermission.ADMIN
        }

        val explicitPerm = permissionRepository.findByLibraryIdAndUserId(library.id!!, userId)

        if (library.organizationId != null) {
            val orgRole = orgMemberRoleRepository.findByOrgIdAndUserId(library.organizationId!!, userId)
            if (orgRole != null) {
                if (orgRole.role == OrgMemberRole.ORG_ADMIN) {
                    return StencilPermission.ADMIN
                }
                val baseRole = library.defaultRole
                return when {
                    explicitPerm?.role == StencilPermission.ADMIN -> StencilPermission.ADMIN
                    explicitPerm?.role == StencilPermission.CONTRIBUTE || baseRole == StencilPermission.CONTRIBUTE -> StencilPermission.CONTRIBUTE
                    else -> StencilPermission.READ
                }
            }
        }

        return explicitPerm?.role
    }

    fun listLibraries(userId: UUID): List<ShapeLibraryDetailDto> {
        val userOrgIds = getUserOrganizationIds(userId)
        val accessibleLibs = shapeLibraryRepository.findAccessible(userId, userOrgIds)
        val allStencils = shapeStencilRepository.findByLibraryIds(accessibleLibs.mapNotNull { it.id })
        val stencilsByLibId = allStencils.groupBy { it.libraryId }

        return accessibleLibs.mapNotNull { lib ->
            val perm = resolveUserPermission(lib, userId)
            if (perm != null) {
                lib.toDetailDto(perm, stencilsByLibId[lib.id] ?: emptyList())
            } else {
                null
            }
        }
    }

    fun getLibrary(libraryId: UUID, userId: UUID): ShapeLibraryDetailDto {
        val lib = shapeLibraryRepository.findById(libraryId)
            ?: throw NoSuchElementException("Shape library not found")
        val perm = resolveUserPermission(lib, userId)
            ?: throw SecurityException("Access denied to shape library")
        val stencils = shapeStencilRepository.findByLibraryId(libraryId)
        return lib.toDetailDto(perm, stencils)
    }

    @Transactional
    fun createLibrary(userId: UUID, request: CreateShapeLibraryRequest): ShapeLibraryDetailDto {
        if (request.name.isBlank()) {
            throw IllegalArgumentException("Library name must not be blank")
        }

        if (request.organizationId != null) {
            val orgRole = orgMemberRoleRepository.findByOrgIdAndUserId(request.organizationId, userId)
            if (orgRole == null) {
                throw SecurityException("User is not a member of organization ${request.organizationId}")
            }
        }

        val lib = ShapeLibrary().apply {
            this.name = request.name.trim()
            this.description = request.description?.trim()
            this.userId = userId
            this.organizationId = request.organizationId
            this.categories = if (request.categories.isNotEmpty()) request.categories else listOf(StencilCategory.GENERAL)
            this.defaultRole = request.defaultRole
            this.createdAt = Instant.now()
        }
        shapeLibraryRepository.persist(lib)
        return lib.toDetailDto(StencilPermission.ADMIN, emptyList())
    }

    @Transactional
    fun updateLibrary(libraryId: UUID, userId: UUID, request: UpdateShapeLibraryRequest): ShapeLibraryDetailDto {
        val lib = shapeLibraryRepository.findById(libraryId)
            ?: throw NoSuchElementException("Shape library not found")
        val perm = resolveUserPermission(lib, userId)
            ?: throw SecurityException("Access denied to shape library")

        if (perm != StencilPermission.ADMIN) {
            throw SecurityException("Admin permission required to update shape library")
        }

        request.name?.let {
            if (it.isBlank()) throw IllegalArgumentException("Library name must not be blank")
            lib.name = it.trim()
        }
        request.description?.let { lib.description = it.trim() }
        request.categories?.let {
            if (it.isNotEmpty()) lib.categories = it
        }
        request.defaultRole?.let { lib.defaultRole = it }
        lib.updatedAt = Instant.now()

        val stencils = shapeStencilRepository.findByLibraryId(libraryId)
        return lib.toDetailDto(perm, stencils)
    }

    @Transactional
    fun deleteLibrary(libraryId: UUID, userId: UUID) {
        val lib = shapeLibraryRepository.findById(libraryId)
            ?: throw NoSuchElementException("Shape library not found")
        val perm = resolveUserPermission(lib, userId)
            ?: throw SecurityException("Access denied to shape library")

        if (perm != StencilPermission.ADMIN) {
            throw SecurityException("Admin permission required to delete shape library")
        }

        permissionRepository.deleteByLibraryId(libraryId)
        shapeStencilRepository.deleteByLibraryId(libraryId)
        shapeLibraryRepository.delete(lib)
    }

    @Transactional
    fun createStencil(libraryId: UUID, userId: UUID, request: CreateShapeStencilRequest): ShapeStencilDto {
        if (request.name.isBlank()) {
            throw IllegalArgumentException("Stencil name must not be blank")
        }
        if (request.shapesJson.isBlank()) {
            throw IllegalArgumentException("Stencil shapes JSON must not be blank")
        }

        val lib = shapeLibraryRepository.findById(libraryId)
            ?: throw NoSuchElementException("Shape library not found")
        val perm = resolveUserPermission(lib, userId)
            ?: throw SecurityException("Access denied to shape library")

        if (perm == StencilPermission.READ) {
            throw SecurityException("Contribute or admin permission required to add stencils")
        }

        val stencil = ShapeStencil().apply {
            this.libraryId = libraryId
            this.name = request.name.trim()
            this.category = request.category
            this.description = request.description?.trim()
            this.shapesJson = request.shapesJson
            this.thumbnailSvg = request.thumbnailSvg
            this.createdBy = userId
            this.createdAt = Instant.now()
        }
        shapeStencilRepository.persist(stencil)
        return stencil.toDto()
    }

    @Transactional
    fun deleteStencil(libraryId: UUID, stencilId: UUID, userId: UUID) {
        val lib = shapeLibraryRepository.findById(libraryId)
            ?: throw NoSuchElementException("Shape library not found")
        val perm = resolveUserPermission(lib, userId)
            ?: throw SecurityException("Access denied to shape library")

        val stencil = shapeStencilRepository.findByLibraryIdAndId(libraryId, stencilId)
            ?: throw NoSuchElementException("Stencil not found in library")

        if (perm == StencilPermission.READ) {
            throw SecurityException("Insufficient permissions to delete stencil")
        }

        if (perm == StencilPermission.CONTRIBUTE && stencil.createdBy != userId) {
            throw SecurityException("Contributors can only delete stencils they created")
        }

        shapeStencilRepository.delete(stencil)
    }
}
