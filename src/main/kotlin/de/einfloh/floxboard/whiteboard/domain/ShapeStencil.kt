package de.einfloh.floxboard.whiteboard.domain

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "shape_stencil",
    indexes = [
        Index(name = "idx_shape_stencil_library_id", columnList = "library_id"),
        Index(name = "idx_shape_stencil_category", columnList = "category")
    ]
)
class ShapeStencil : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(name = "library_id", nullable = false)
    lateinit var libraryId: UUID

    @Column(nullable = false)
    lateinit var name: String

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var category: StencilCategory = StencilCategory.GENERAL

    @Column(length = 1000)
    var description: String? = null

    @Column(name = "shapes_json", columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    lateinit var shapesJson: String

    @Column(name = "thumbnail_svg", columnDefinition = "text")
    var thumbnailSvg: String? = null

    @Column(name = "created_by", nullable = false)
    lateinit var createdBy: UUID

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
}

@ApplicationScoped
class ShapeStencilRepository : PanacheRepositoryBase<ShapeStencil, UUID> {
    fun findByLibraryId(libraryId: UUID): List<ShapeStencil> =
        list("libraryId = ?1 order by createdAt desc", libraryId)

    fun findByLibraryIds(libraryIds: List<UUID>): List<ShapeStencil> {
        if (libraryIds.isEmpty()) return emptyList()
        return list("libraryId in ?1 order by createdAt desc", libraryIds)
    }

    fun findByLibraryIdAndId(libraryId: UUID, stencilId: UUID): ShapeStencil? =
        find("libraryId = ?1 and id = ?2", libraryId, stencilId).firstResult()

    fun deleteByLibraryId(libraryId: UUID): Long =
        delete("libraryId = ?1", libraryId)

    fun deleteByCreatedBy(userId: UUID): Long =
        delete("createdBy = ?1", userId)
}
