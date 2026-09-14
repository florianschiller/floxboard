package de.einfloh.floxboard.whiteboard.domain

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

enum class StencilCategory {
    CLOUD_ARCHITECTURE,
    SOFTWARE_DESIGN_UML,
    UI_WIREFRAMING,
    FLOWCHART_BPMN,
    AGILE_SPRINT,
    GENERAL
}

enum class StencilPermission {
    READ,
    CONTRIBUTE,
    ADMIN
}

@Entity
@Table(
    name = "shape_library",
    indexes = [
        Index(name = "idx_shape_library_user_id", columnList = "user_id"),
        Index(name = "idx_shape_library_org_id", columnList = "organization_id")
    ]
)
class ShapeLibrary : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(nullable = false)
    lateinit var name: String

    @Column(length = 1000)
    var description: String? = null

    @Column(name = "user_id", nullable = false)
    lateinit var userId: UUID

    @Column(name = "organization_id")
    var organizationId: String? = null

    @Column(columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    var categories: List<StencilCategory> = listOf(StencilCategory.GENERAL)

    @Enumerated(EnumType.STRING)
    @Column(name = "default_role", nullable = false)
    var defaultRole: StencilPermission = StencilPermission.READ

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    @UpdateTimestamp
    @Column(name = "updated_at")
    var updatedAt: Instant? = null
}

@Entity
@Table(
    name = "shape_library_member_permission",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_lib_perm_lib_user", columnNames = ["library_id", "user_id"])
    ]
)
class ShapeLibraryMemberPermission : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(name = "library_id", nullable = false)
    lateinit var libraryId: UUID

    @Column(name = "user_id", nullable = false)
    lateinit var userId: UUID

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    var role: StencilPermission = StencilPermission.READ

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
}

@ApplicationScoped
class ShapeLibraryRepository : PanacheRepositoryBase<ShapeLibrary, UUID> {
    fun findByUserId(userId: UUID): List<ShapeLibrary> =
        list("userId = ?1 order by createdAt desc", userId)

    fun findByOrganizationId(organizationId: String): List<ShapeLibrary> =
        list("organizationId = ?1 order by createdAt desc", organizationId)

    fun findByOrganizationIds(organizationIds: List<String>): List<ShapeLibrary> {
        if (organizationIds.isEmpty()) return emptyList()
        return list("organizationId in ?1 order by createdAt desc", organizationIds)
    }

    fun findAccessible(userId: UUID, organizationIds: List<String>): List<ShapeLibrary> {
        return if (organizationIds.isEmpty()) {
            list("userId = ?1 order by createdAt desc", userId)
        } else {
            list("userId = ?1 or organizationId in ?2 order by createdAt desc", userId, organizationIds)
        }
    }

    fun deleteByUserId(userId: UUID): Long =
        delete("userId = ?1", userId)

    fun deleteByOrganizationId(organizationId: String): Long =
        delete("organizationId = ?1", organizationId)
}

@ApplicationScoped
class ShapeLibraryMemberPermissionRepository : PanacheRepositoryBase<ShapeLibraryMemberPermission, UUID> {
    fun findByLibraryIdAndUserId(libraryId: UUID, userId: UUID): ShapeLibraryMemberPermission? =
        find("libraryId = ?1 and userId = ?2", libraryId, userId).firstResult()

    fun findByLibraryId(libraryId: UUID): List<ShapeLibraryMemberPermission> =
        list("libraryId = ?1", libraryId)

    fun deleteByLibraryId(libraryId: UUID): Long =
        delete("libraryId = ?1", libraryId)
}
