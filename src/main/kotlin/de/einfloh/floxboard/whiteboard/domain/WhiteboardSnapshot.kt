package de.einfloh.floxboard.whiteboard.domain

import com.fasterxml.jackson.annotation.JsonProperty
import de.einfloh.floxboard.whiteboard.domain.dgm.Doc
import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.*

@Entity
@Table(
    name = "whiteboard_snapshot",
    indexes = [
        Index(name = "idx_snapshot_whiteboard_created", columnList = "whiteboard_id, created_at DESC")
    ]
)
class WhiteboardSnapshot : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(name = "whiteboard_id", nullable = false)
    lateinit var whiteboardId: UUID

    @Column
    var name: String? = null

    @Column(length = 1000)
    var description: String? = null

    @JsonProperty("isAutomatic")
    @Column(name = "is_automatic", nullable = false)
    var isAutomatic: Boolean = false

    @JsonProperty("isGeneratedByAI")
    @Column(name = "is_generated_by_ai", nullable = false)
    var isGeneratedByAI: Boolean = false

    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var content: Doc? = null

    @Column(name = "created_by", nullable = false)
    lateinit var createdBy: UUID

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null

    override fun toString(): String {
        return "WhiteboardSnapshot(id=$id, whiteboardId=$whiteboardId, name=$name, isAutomatic=$isAutomatic, isGeneratedByAI=$isGeneratedByAI, createdBy=$createdBy, createdAt=$createdAt)"
    }
}

data class WhiteboardSnapshotSummary(
    val id: UUID,
    val whiteboardId: UUID,
    val name: String?,
    val description: String?,
    @JsonProperty("isAutomatic")
    val isAutomatic: Boolean,
    @JsonProperty("isGeneratedByAI")
    val isGeneratedByAI: Boolean,
    val createdBy: UUID,
    val createdAt: Instant?
)

fun WhiteboardSnapshot.toSummary(): WhiteboardSnapshotSummary = WhiteboardSnapshotSummary(
    id = this.id!!,
    whiteboardId = this.whiteboardId,
    name = this.name,
    description = this.description,
    isAutomatic = this.isAutomatic,
    isGeneratedByAI = this.isGeneratedByAI,
    createdBy = this.createdBy,
    createdAt = this.createdAt
)

@ApplicationScoped
class WhiteboardSnapshotRepository : PanacheRepositoryBase<WhiteboardSnapshot, UUID> {
    companion object {
        const val MAX_AUTO_SNAPSHOTS_DEFAULT = 10
    }

    fun findByWhiteboard(whiteboardId: UUID, start: Int = 0, max: Int = 20): List<WhiteboardSnapshot> {
        val startIndex = maxOf(0, start)
        val maxResults = maxOf(1, max)
        val lastIndex = startIndex + maxResults - 1
        return find("whiteboardId = ?1 order by createdAt desc", whiteboardId)
            .range(startIndex, lastIndex)
            .list()
    }

    fun findLatestByWhiteboard(whiteboardId: UUID): WhiteboardSnapshot? {
        return find("whiteboardId = ?1 order by createdAt desc", whiteboardId).firstResult()
    }

    fun findByWhiteboardAndId(whiteboardId: UUID, snapshotId: UUID): WhiteboardSnapshot? {
        return find("whiteboardId = ?1 and id = ?2", whiteboardId, snapshotId).firstResult()
    }

    fun deleteByWhiteboard(whiteboardId: UUID): Long {
        return delete("whiteboardId = ?1", whiteboardId)
    }

    fun pruneAutoSnapshots(whiteboardId: UUID, maxKeep: Int = MAX_AUTO_SNAPSHOTS_DEFAULT): Long {
        val autoSnapshots = find("whiteboardId = ?1 and isAutomatic = true order by createdAt desc", whiteboardId).list()
        if (autoSnapshots.size > maxKeep) {
            val toDelete = autoSnapshots.subList(maxKeep, autoSnapshots.size)
            toDelete.forEach { delete(it) }
            flush()
            return toDelete.size.toLong()
        }
        return 0L
    }
}
