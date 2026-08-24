package de.einfloh.floxboard.whiteboard.domain

import de.einfloh.floxboard.whiteboard.domain.dgm.Doc
import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.*

@Entity
@Table(
    name = "whiteboard",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_whiteboard_owner_name", columnNames = ["owner_id", "name"])
    ]
)
class Whiteboard : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(nullable = false)
    lateinit var name: String

    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var content: Doc? = null
    
    @Column(name = "owner_id", nullable = false)
    lateinit var ownerId: UUID

    @Column(name = "owner_username")
    var ownerUsername: String? = null

    @Column(name = "owner_email")
    var ownerEmail: String? = null

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant? = null

    override fun toString(): String {
        return "Whiteboard(id=$id, name='$name', ownerId='$ownerId', content='$content', createdAt=$createdAt, updatedAt=$updatedAt)"
    }
}

@ApplicationScoped
class WhiteboardRepository : PanacheRepositoryBase<Whiteboard, UUID> {
    fun findByOwner(ownerId: UUID, start: Int = 0, max: Int = 5): List<Whiteboard> {
        val startIndex = maxOf(0, start)
        val maxResults = maxOf(1, max)
        val lastIndex = startIndex + maxResults - 1
        val result = find("ownerId = ?1 order by updatedAt desc, createdAt desc", ownerId)
            .range(startIndex, lastIndex)
            .list()
        return result
    }

    fun findByOwnerAndId(ownerId: UUID, id: UUID): Whiteboard? {
        val result = find("ownerId = ?1 and id = ?2", ownerId, id).firstResult()
        return result
    }

    fun findByOwnerAndName(ownerId: UUID, name: String): Whiteboard? {
        val result = find("ownerId = ?1 and name = ?2", ownerId, name).firstResult()
        return result
    }

    fun findByIds(ids: List<UUID>, start: Int = 0, max: Int = 5): List<Whiteboard> {
        if (ids.isEmpty()) return emptyList()
        val startIndex = maxOf(0, start)
        val maxResults = maxOf(1, max)
        val lastIndex = startIndex + maxResults - 1
        return find("id in ?1 order by updatedAt desc, createdAt desc", ids)
            .range(startIndex, lastIndex)
            .list()
    }
}
