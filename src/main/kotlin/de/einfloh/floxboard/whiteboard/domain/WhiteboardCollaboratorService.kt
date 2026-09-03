package de.einfloh.floxboard.whiteboard.domain

import de.einfloh.floxboard.license.domain.EntitlementService
import de.einfloh.floxboard.whiteboard.collab.WhiteboardCollabSocket
import de.einfloh.floxboard.whiteboard.domain.events.CollaboratorInvitedEvent
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.event.Event
import jakarta.enterprise.inject.Instance
import jakarta.inject.Inject
import jakarta.transaction.Transactional
import java.time.Instant
import java.util.UUID

@ApplicationScoped
class WhiteboardCollaboratorService(
    private val repository: WhiteboardRepository,
    private val collaboratorRepository: WhiteboardCollaboratorRepository,
    private val accessRequestRepository: WhiteboardAccessRequestRepository,
    private val userService: UserService,
    private val entitlementService: EntitlementService,
    private val whiteboardService: WhiteboardService
) {
    @Inject
    lateinit var collabSocket: Instance<WhiteboardCollabSocket>

    @Inject
    lateinit var collaboratorInvitedEvent: Event<CollaboratorInvitedEvent>

    fun listCollaborators(userId: String, whiteboardId: UUID): List<CollaboratorInfo> {
        val userUuid = UUID.fromString(userId)
        if (!whiteboardService.canView(whiteboardId, userUuid)) {
            throw SecurityException("Access denied")
        }

        val whiteboard = repository.findById(whiteboardId) ?: throw NoSuchElementException("Whiteboard not found")
        val ownerUser = userService.findUserById(whiteboard.ownerId)
        val ownerUsername = ownerUser?.username ?: whiteboard.ownerUsername ?: "Owner"
        val ownerEmail = ownerUser?.email ?: whiteboard.ownerEmail ?: "owner@floxboard.io"
        val ownerInfo = CollaboratorInfo(
            id = null,
            userId = whiteboard.ownerId,
            userEmail = ownerEmail,
            username = ownerUsername,
            role = CollaboratorRole.OWNER,
            createdAt = whiteboard.createdAt
        )

        val collaborators = collaboratorRepository.findByWhiteboard(whiteboardId)
        val collabInfos = collaborators.map {
            CollaboratorInfo(
                id = it.id,
                userId = it.userId,
                userEmail = it.userEmail,
                username = it.username ?: it.userEmail,
                role = it.role,
                createdAt = it.createdAt
            )
        }

        return listOf(ownerInfo) + collabInfos
    }

    @Transactional
    fun addCollaborator(requesterId: String, whiteboardId: UUID, query: String, role: CollaboratorRole): WhiteboardCollaborator {
        val requesterUuid = UUID.fromString(requesterId)
        if (!whiteboardService.canAdmin(whiteboardId, requesterUuid)) {
            throw SecurityException("Access denied: Only owners and admins can invite collaborators")
        }
        if (role == CollaboratorRole.OWNER) {
            throw IllegalArgumentException("Cannot assign OWNER role to a collaborator")
        }

        val whiteboard = repository.findById(whiteboardId) ?: throw NoSuchElementException("Whiteboard not found")
        val targetUser = userService.findUserByEmailOrUsername(query)
            ?: throw NoSuchElementException("User '$query' not found")

        if (targetUser.id == whiteboard.ownerId) {
            throw IllegalArgumentException("The board owner cannot be added as a collaborator")
        }

        val existing = collaboratorRepository.findByWhiteboardAndUser(whiteboardId, targetUser.id)
        val collaborator = if (existing != null) {
            existing.role = role
            existing.userEmail = targetUser.email
            existing.username = targetUser.username
            collaboratorRepository.persistAndFlush(existing)
            existing
        } else {
            entitlementService.assertQuota(
                whiteboard.ownerId,
                "collaborators_per_board",
                1,
                mapOf<String, Any>("whiteboardId" to whiteboardId)
            )

            val newCollab = WhiteboardCollaborator().apply {
                this.whiteboardId = whiteboardId
                this.userId = targetUser.id
                this.userEmail = targetUser.email
                this.username = targetUser.username
                this.role = role
            }
            collaboratorRepository.persistAndFlush(newCollab)
            newCollab
        }

        val pendingReq = accessRequestRepository.findByWhiteboardAndUser(whiteboardId, targetUser.id)
        if (pendingReq != null && pendingReq.status == AccessRequestStatus.PENDING) {
            pendingReq.status = AccessRequestStatus.APPROVED
            pendingReq.updatedAt = Instant.now()
            accessRequestRepository.persistAndFlush(pendingReq)
        }

        collaboratorInvitedEvent.fireAsync(
            CollaboratorInvitedEvent(
                whiteboardId = whiteboard.id!!,
                whiteboardName = whiteboard.name,
                recipientEmail = targetUser.email,
                recipientUsername = targetUser.username,
                role = role
            )
        )

        return collaborator
    }

    @Transactional
    fun updateCollaboratorRole(requesterId: String, whiteboardId: UUID, targetUserId: UUID, newRole: CollaboratorRole): WhiteboardCollaborator {
        val requesterUuid = UUID.fromString(requesterId)
        if (!whiteboardService.canAdmin(whiteboardId, requesterUuid)) {
            throw SecurityException("Access denied: Only owners and admins can modify collaborator roles")
        }
        if (newRole == CollaboratorRole.OWNER) {
            throw IllegalArgumentException("Cannot promote collaborator to OWNER")
        }

        val whiteboard = repository.findById(whiteboardId) ?: throw NoSuchElementException("Whiteboard not found")
        if (targetUserId == whiteboard.ownerId) {
            throw SecurityException("Cannot modify the role of the board owner")
        }

        val collaborator = collaboratorRepository.findByWhiteboardAndUser(whiteboardId, targetUserId)
            ?: throw NoSuchElementException("Collaborator not found on this whiteboard")

        collaborator.role = newRole
        collaboratorRepository.persistAndFlush(collaborator)
        return collaborator
    }

    @Transactional
    fun removeCollaborator(requesterId: String, whiteboardId: UUID, targetUserId: UUID): Boolean {
        val requesterUuid = UUID.fromString(requesterId)
        val isSelf = requesterUuid == targetUserId
        if (!isSelf && !whiteboardService.canAdmin(whiteboardId, requesterUuid)) {
            throw SecurityException("Access denied: Only owners, admins, or the collaborator themselves can remove access")
        }

        val whiteboard = repository.findById(whiteboardId) ?: throw NoSuchElementException("Whiteboard not found")
        if (targetUserId == whiteboard.ownerId) {
            throw SecurityException("Cannot remove the board owner")
        }

        val deletedCount = collaboratorRepository.deleteByWhiteboardAndUser(whiteboardId, targetUserId)
        if (deletedCount > 0) {
            accessRequestRepository.delete("whiteboardId = ?1 and userId = ?2", whiteboardId, targetUserId)
            try {
                if (collabSocket.isResolvable) {
                    collabSocket.get().evictUser(whiteboardId, targetUserId)
                }
            } catch (e: Exception) {
                // Socket eviction error handling
            }
            return true
        }
        return false
    }
}
