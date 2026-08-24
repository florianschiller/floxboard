package de.einfloh.floxboard.whiteboard.domain

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.util.*

enum class CollaboratorRole {
    OWNER, ADMIN, EDITOR, VIEWER
}

enum class AccessRequestStatus {
    PENDING, APPROVED, REJECTED
}

@Entity
@Table(
    name = "whiteboard_collaborators",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_whiteboard_collaborator", columnNames = ["whiteboard_id", "user_id"])
    ]
)
class WhiteboardCollaborator : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(name = "whiteboard_id", nullable = false)
    lateinit var whiteboardId: UUID

    @Column(name = "user_id", nullable = false)
    lateinit var userId: UUID

    @Column(name = "user_email", nullable = false)
    lateinit var userEmail: String

    @Column(name = "username")
    var username: String? = null

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: CollaboratorRole = CollaboratorRole.EDITOR

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null
}

@ApplicationScoped
class WhiteboardCollaboratorRepository : PanacheRepositoryBase<WhiteboardCollaborator, UUID> {
    fun findByWhiteboard(whiteboardId: UUID): List<WhiteboardCollaborator> {
        return find("whiteboardId = ?1 order by createdAt asc", whiteboardId).list()
    }

    fun findByWhiteboardAndUser(whiteboardId: UUID, userId: UUID): WhiteboardCollaborator? {
        return find("whiteboardId = ?1 and userId = ?2", whiteboardId, userId).firstResult()
    }

    fun findByUser(userId: UUID): List<WhiteboardCollaborator> {
        return find("userId = ?1 order by createdAt desc", userId).list()
    }

    fun deleteByWhiteboardAndUser(whiteboardId: UUID, userId: UUID): Long {
        return delete("whiteboardId = ?1 and userId = ?2", whiteboardId, userId)
    }

    fun deleteByWhiteboard(whiteboardId: UUID): Long {
        return delete("whiteboardId = ?1", whiteboardId)
    }
}
