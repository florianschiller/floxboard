package de.einfloh.floxboard.whiteboard.domain

import de.einfloh.floxboard.license.domain.EntitlementService
import de.einfloh.floxboard.whiteboard.collab.WhiteboardCollabSocket
import de.einfloh.floxboard.whiteboard.domain.dgm.Doc
import de.einfloh.floxboard.whiteboard.domain.events.AccessRequestResolvedEvent
import de.einfloh.floxboard.whiteboard.domain.events.AccessRequestedEvent
import de.einfloh.floxboard.whiteboard.domain.events.CollaboratorInvitedEvent
import de.einfloh.floxboard.whiteboard.storage.AssetStorageService
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.event.Event
import jakarta.enterprise.inject.Instance
import jakarta.inject.Inject
import jakarta.transaction.Transactional
import java.time.Instant
import java.util.*

data class WhiteboardSummary(
    val id: UUID, 
    val name: String,
    val role: CollaboratorRole = CollaboratorRole.OWNER,
    val createdAt: Instant? = null,
    val updatedAt: Instant? = null
)

data class CollaboratorInfo(
    val id: UUID?,
    val userId: UUID,
    val userEmail: String,
    val username: String?,
    val role: CollaboratorRole,
    val createdAt: Instant?
)

@ApplicationScoped
class WhiteboardService(
    private val repository: WhiteboardRepository,
    private val collaboratorRepository: WhiteboardCollaboratorRepository,
    private val accessRequestRepository: WhiteboardAccessRequestRepository,
    private val userService: UserService,
    private val entitlementService: EntitlementService,
    private val assetStorageService: AssetStorageService
) {
    @Inject
    lateinit var collabSocket: Instance<WhiteboardCollabSocket>

    @Inject
    lateinit var collaboratorInvitedEvent: Event<CollaboratorInvitedEvent>

    @Inject
    lateinit var accessRequestResolvedEvent: Event<AccessRequestResolvedEvent>

    @Inject
    lateinit var accessRequestedEvent: Event<AccessRequestedEvent>

    fun isOwner(whiteboardId: UUID, userId: UUID): Boolean {
        val whiteboard = repository.findById(whiteboardId) ?: return false
        return whiteboard.ownerId == userId
    }

    fun exists(whiteboardId: UUID): Boolean {
        return repository.findById(whiteboardId) != null
    }

    fun getRoleForUser(userId: UUID, whiteboardId: UUID): CollaboratorRole? {
        val whiteboard = repository.findById(whiteboardId) ?: return null
        if (whiteboard.ownerId == userId) return CollaboratorRole.OWNER
        val collaborator = collaboratorRepository.findByWhiteboardAndUser(whiteboardId, userId)
        return collaborator?.role
    }

    fun canView(whiteboardId: UUID, userId: UUID): Boolean {
        return getRoleForUser(userId, whiteboardId) != null
    }

    fun canEdit(whiteboardId: UUID, userId: UUID): Boolean {
        val role = getRoleForUser(userId, whiteboardId) ?: return false
        return role == CollaboratorRole.OWNER || role == CollaboratorRole.ADMIN || role == CollaboratorRole.EDITOR
    }

    fun canAdmin(whiteboardId: UUID, userId: UUID): Boolean {
        val role = getRoleForUser(userId, whiteboardId) ?: return false
        return role == CollaboratorRole.OWNER || role == CollaboratorRole.ADMIN
    }

    fun searchUsers(query: String, callerUserId: UUID? = null): List<UserInfo> {
        return userService.searchUsers(query, callerUserId)
    }

    fun listForUser(userId: String, start: Int? = null, max: Int? = null): List<WhiteboardSummary> {
        val userUuid = UUID.fromString(userId)
        val startIndex = maxOf(0, start ?: 0)
        val maxResults = maxOf(1, max ?: 5)
        val list = repository.findByOwner(userUuid, startIndex, maxResults)
        return list.map { 
            WhiteboardSummary(it.id!!, it.name, CollaboratorRole.OWNER, it.createdAt, it.updatedAt) 
        }
    }

    fun listSharedForUser(userId: String, start: Int? = null, max: Int? = null): List<WhiteboardSummary> {
        val userUuid = UUID.fromString(userId)
        val memberships = collaboratorRepository.findByUser(userUuid)
        if (memberships.isEmpty()) return emptyList()

        val boardIds = memberships.map { it.whiteboardId }
        val startIndex = maxOf(0, start ?: 0)
        val maxResults = maxOf(1, max ?: 5)
        val boards = repository.findByIds(boardIds, startIndex, maxResults)
        val roleMap = memberships.associate { it.whiteboardId to it.role }

        return boards.map {
            WhiteboardSummary(
                id = it.id!!,
                name = it.name,
                role = roleMap[it.id!!] ?: CollaboratorRole.VIEWER,
                createdAt = it.createdAt,
                updatedAt = it.updatedAt
            )
        }
    }

    fun getForUser(userId: String, id: UUID): Whiteboard {
        val whiteboard = repository.findById(id) ?: throw NoSuchElementException("Whiteboard not found")
        val userUuid = UUID.fromString(userId)
        val role = getRoleForUser(userUuid, id) ?: throw SecurityException("Access denied to whiteboard")
        return whiteboard
    }

    @Transactional
    fun saveForUser(
        userId: String,
        name: String,
        content: Doc? = null,
        id: UUID? = null,
        ownerUsername: String? = null,
        ownerEmail: String? = null
    ): Whiteboard {
        val userUuid = UUID.fromString(userId)

        if (id != null) {
            val whiteboard = repository.findById(id)
                ?: throw NoSuchElementException("Whiteboard not found")
            if (!canEdit(id, userUuid)) {
                throw SecurityException("Access denied: You do not have permission to edit this whiteboard")
            }

            val existingWithName = repository.findByOwnerAndName(whiteboard.ownerId, name)
            if (existingWithName != null && existingWithName.id != id) {
                throw IllegalArgumentException("A whiteboard with the name '$name' already exists")
            }

            whiteboard.name = name
            whiteboard.content = content
            if (isOwner(id, userUuid)) {
                if (ownerUsername != null) whiteboard.ownerUsername = ownerUsername
                if (ownerEmail != null) whiteboard.ownerEmail = ownerEmail
            }
            whiteboard.updatedAt = Instant.now()
            repository.persistAndFlush(whiteboard)
            return whiteboard
        } else {
            val existingWithName = repository.findByOwnerAndName(userUuid, name)
            if (existingWithName != null) {
                throw IllegalArgumentException("A whiteboard with the name '$name' already exists")
            }

            entitlementService.assertQuota(userUuid, "whiteboards", 1)

            val now = Instant.now()
            val whiteboard = Whiteboard().apply {
                this.name = name
                this.content = content
                this.ownerId = userUuid
                this.ownerUsername = ownerUsername
                this.ownerEmail = ownerEmail
                this.createdAt = now
                this.updatedAt = now
            }
            repository.persistAndFlush(whiteboard)
            return whiteboard
        }
    }

    @Transactional
    fun deleteForUser(userId: String, id: UUID): Boolean {
        val userUuid = UUID.fromString(userId)
        val whiteboard = repository.findByOwnerAndId(userUuid, id) ?: return false
        
        collaboratorRepository.deleteByWhiteboard(id)
        accessRequestRepository.deleteByWhiteboard(id)
        assetStorageService.deleteForWhiteboard(id)
        repository.delete(whiteboard)
        return true
    }

    // Collaborators
    fun listCollaborators(userId: String, whiteboardId: UUID): List<CollaboratorInfo> {
        val userUuid = UUID.fromString(userId)
        if (!canView(whiteboardId, userUuid)) {
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
        if (!canAdmin(whiteboardId, requesterUuid)) {
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
        if (!canAdmin(whiteboardId, requesterUuid)) {
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
        if (!isSelf && !canAdmin(whiteboardId, requesterUuid)) {
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

    // Access Requests
    @Transactional
    fun createAccessRequest(requesterId: String, requesterEmail: String, requesterUsername: String, whiteboardId: UUID, requestedRole: CollaboratorRole, message: String?): WhiteboardAccessRequest {
        val userUuid = UUID.fromString(requesterId)
        val whiteboard = repository.findById(whiteboardId) ?: throw NoSuchElementException("Whiteboard not found")

        if (whiteboard.ownerId == userUuid || collaboratorRepository.findByWhiteboardAndUser(whiteboardId, userUuid) != null) {
            throw IllegalArgumentException("You already have access to this whiteboard")
        }

        val targetRole = if (requestedRole == CollaboratorRole.OWNER) CollaboratorRole.EDITOR else requestedRole

        val existing = accessRequestRepository.findByWhiteboardAndUser(whiteboardId, userUuid)
        val request = if (existing != null) {
            existing.requestedRole = targetRole
            existing.message = message
            existing.status = AccessRequestStatus.PENDING
            existing.userEmail = requesterEmail
            existing.username = requesterUsername
            existing.updatedAt = Instant.now()
            accessRequestRepository.persistAndFlush(existing)
            existing
        } else {
            val newReq = WhiteboardAccessRequest().apply {
                this.whiteboardId = whiteboardId
                this.userId = userUuid
                this.userEmail = requesterEmail
                this.username = requesterUsername
                this.requestedRole = targetRole
                this.status = AccessRequestStatus.PENDING
                this.message = message
            }
            accessRequestRepository.persistAndFlush(newReq)
            newReq
        }

        val ownerUser = userService.findUserById(whiteboard.ownerId)
        val ownerUsername = ownerUser?.username ?: whiteboard.ownerUsername ?: "Owner"
        val ownerEmail = ownerUser?.email ?: whiteboard.ownerEmail ?: "owner@floxboard.io"

        val recipients = mutableMapOf<String, String>() // email -> username
        if (ownerEmail.isNotBlank()) {
            recipients[ownerEmail] = ownerUsername
        }

        val admins = collaboratorRepository.findByWhiteboard(whiteboardId).filter { it.role == CollaboratorRole.ADMIN }
        for (admin in admins) {
            if (admin.userEmail.isNotBlank()) {
                recipients[admin.userEmail] = admin.username ?: admin.userEmail
            }
        }

        for ((email, username) in recipients) {
            accessRequestedEvent.fireAsync(
                AccessRequestedEvent(
                    whiteboardId = whiteboard.id!!,
                    whiteboardName = whiteboard.name,
                    requesterId = userUuid,
                    requesterEmail = requesterEmail,
                    requesterUsername = requesterUsername,
                    requestedRole = targetRole,
                    message = message,
                    recipientEmail = email,
                    recipientUsername = username
                )
            )
        }

        return request
    }

    fun listPendingAccessRequests(requesterId: String, whiteboardId: UUID): List<WhiteboardAccessRequest> {
        val requesterUuid = UUID.fromString(requesterId)
        if (!canAdmin(whiteboardId, requesterUuid)) {
            throw SecurityException("Access denied: Only owners and admins can view access requests")
        }
        return accessRequestRepository.findPendingByWhiteboard(whiteboardId)
    }

    fun getMyAccessRequest(requesterId: String, whiteboardId: UUID): WhiteboardAccessRequest? {
        val requesterUuid = UUID.fromString(requesterId)
        return accessRequestRepository.findByWhiteboardAndUser(whiteboardId, requesterUuid)
    }

    @Transactional
    fun resolveAccessRequest(requesterId: String, whiteboardId: UUID, requestId: UUID, approve: Boolean, assignedRole: CollaboratorRole? = null): WhiteboardAccessRequest {
        val requesterUuid = UUID.fromString(requesterId)
        if (!canAdmin(whiteboardId, requesterUuid)) {
            throw SecurityException("Access denied: Only owners and admins can resolve access requests")
        }

        val request = accessRequestRepository.findById(requestId)
            ?: throw NoSuchElementException("Access request not found")

        if (request.whiteboardId != whiteboardId) {
            throw IllegalArgumentException("Request does not belong to this whiteboard")
        }

        if (approve) {
            val roleToGrant = assignedRole ?: request.requestedRole
            val effectiveRole = if (roleToGrant == CollaboratorRole.OWNER) CollaboratorRole.EDITOR else roleToGrant
            request.status = AccessRequestStatus.APPROVED
            request.updatedAt = Instant.now()
            accessRequestRepository.persistAndFlush(request)

            val existing = collaboratorRepository.findByWhiteboardAndUser(whiteboardId, request.userId)
            if (existing != null) {
                existing.role = effectiveRole
                collaboratorRepository.persistAndFlush(existing)
            } else {
                val whiteboard = repository.findById(whiteboardId)
                    ?: throw NoSuchElementException("Whiteboard not found")
                entitlementService.assertQuota(
                    whiteboard.ownerId,
                    "collaborators_per_board",
                    1,
                    mapOf<String, Any>("whiteboardId" to whiteboardId)
                )

                val collab = WhiteboardCollaborator().apply {
                    this.whiteboardId = whiteboardId
                    this.userId = request.userId
                    this.userEmail = request.userEmail
                    this.username = request.username
                    this.role = effectiveRole
                }
                collaboratorRepository.persistAndFlush(collab)
            }

            val whiteboard = repository.findById(whiteboardId)
            val whiteboardName = whiteboard?.name ?: "Whiteboard"
            accessRequestResolvedEvent.fireAsync(
                AccessRequestResolvedEvent(
                    whiteboardId = whiteboardId,
                    whiteboardName = whiteboardName,
                    recipientEmail = request.userEmail,
                    recipientUsername = request.username,
                    approved = true,
                    assignedRole = effectiveRole
                )
            )
        } else {
            request.status = AccessRequestStatus.REJECTED
            request.updatedAt = Instant.now()
            accessRequestRepository.persistAndFlush(request)

            val whiteboard = repository.findById(whiteboardId)
            val whiteboardName = whiteboard?.name ?: "Whiteboard"
            accessRequestResolvedEvent.fireAsync(
                AccessRequestResolvedEvent(
                    whiteboardId = whiteboardId,
                    whiteboardName = whiteboardName,
                    recipientEmail = request.userEmail,
                    recipientUsername = request.username,
                    approved = false,
                    assignedRole = null
                )
            )
        }

        return request
    }
}
