package de.einfloh.floxboard.whiteboard.domain

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import java.util.*

@Entity
@Table(
    name = "whiteboard_access_requests",
    uniqueConstraints = [
        UniqueConstraint(name = "uk_whiteboard_access_request", columnNames = ["whiteboard_id", "user_id"])
    ]
)
class WhiteboardAccessRequest : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(name = "whiteboard_id", nullable = false)
    lateinit var whiteboardId: UUID

    @Column(name = "user_id", nullable = false)
    lateinit var userId: UUID

    @Column(name = "user_email", nullable = false)
    lateinit var userEmail: String

    @Column(name = "username", nullable = false)
    lateinit var username: String

    @Enumerated(EnumType.STRING)
    @Column(name = "requested_role", nullable = false)
    var requestedRole: CollaboratorRole = CollaboratorRole.EDITOR

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: AccessRequestStatus = AccessRequestStatus.PENDING

    @Column(name = "message")
    var message: String? = null

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    var createdAt: Instant? = null

    @UpdateTimestamp
    @Column(nullable = false)
    var updatedAt: Instant? = null
}

@ApplicationScoped
class WhiteboardAccessRequestRepository : PanacheRepositoryBase<WhiteboardAccessRequest, UUID> {
    fun findByWhiteboard(whiteboardId: UUID): List<WhiteboardAccessRequest> {
        return find("whiteboardId = ?1 order by createdAt desc", whiteboardId).list()
    }

    fun findPendingByWhiteboard(whiteboardId: UUID): List<WhiteboardAccessRequest> {
        return find("whiteboardId = ?1 and status = ?2 order by createdAt desc", whiteboardId, AccessRequestStatus.PENDING).list()
    }

    fun findByWhiteboardAndUser(whiteboardId: UUID, userId: UUID): WhiteboardAccessRequest? {
        return find("whiteboardId = ?1 and userId = ?2", whiteboardId, userId).firstResult()
    }

    fun deleteByWhiteboard(whiteboardId: UUID): Long {
        return delete("whiteboardId = ?1", whiteboardId)
    }
}
