package de.einfloh.floxboard.whiteboard.domain

import de.einfloh.floxboard.license.domain.EntitlementService
import de.einfloh.floxboard.whiteboard.domain.events.AccessRequestResolvedEvent
import de.einfloh.floxboard.whiteboard.domain.events.AccessRequestedEvent
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.event.Event
import jakarta.inject.Inject
import jakarta.transaction.Transactional
import java.time.Instant
import java.util.UUID

@ApplicationScoped
class WhiteboardAccessRequestService(
    private val repository: WhiteboardRepository,
    private val collaboratorRepository: WhiteboardCollaboratorRepository,
    private val accessRequestRepository: WhiteboardAccessRequestRepository,
    private val userService: UserService,
    private val entitlementService: EntitlementService,
    private val whiteboardService: WhiteboardService
) {
    @Inject
    lateinit var accessRequestResolvedEvent: Event<AccessRequestResolvedEvent>

    @Inject
    lateinit var accessRequestedEvent: Event<AccessRequestedEvent>

    @Transactional
    fun createAccessRequest(
        requesterId: String,
        requesterEmail: String,
        requesterUsername: String,
        whiteboardId: UUID,
        requestedRole: CollaboratorRole,
        message: String?
    ): WhiteboardAccessRequest {
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
        if (!whiteboardService.canAdmin(whiteboardId, requesterUuid)) {
            throw SecurityException("Access denied: Only owners and admins can view access requests")
        }
        return accessRequestRepository.findPendingByWhiteboard(whiteboardId)
    }

    fun getMyAccessRequest(requesterId: String, whiteboardId: UUID): WhiteboardAccessRequest? {
        val requesterUuid = UUID.fromString(requesterId)
        return accessRequestRepository.findByWhiteboardAndUser(whiteboardId, requesterUuid)
    }

    @Transactional
    fun resolveAccessRequest(
        requesterId: String,
        whiteboardId: UUID,
        requestId: UUID,
        approve: Boolean,
        assignedRole: CollaboratorRole? = null
    ): WhiteboardAccessRequest {
        val requesterUuid = UUID.fromString(requesterId)
        if (!whiteboardService.canAdmin(whiteboardId, requesterUuid)) {
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
