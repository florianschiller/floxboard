package de.einfloh.floxboard.whiteboard.domain

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import de.einfloh.floxboard.license.domain.EntitlementService
import de.einfloh.floxboard.whiteboard.domain.dgm.Doc
import de.einfloh.floxboard.whiteboard.storage.AssetStorageService
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import java.time.Instant
import java.util.*

@ApplicationScoped
class WhiteboardService(
    private val repository: WhiteboardRepository,
    private val collaboratorRepository: WhiteboardCollaboratorRepository,
    private val accessRequestRepository: WhiteboardAccessRequestRepository,
    private val snapshotRepository: WhiteboardSnapshotRepository,
    private val userService: UserService,
    private val entitlementService: EntitlementService,
    private val assetStorageService: AssetStorageService,
    private val objectMapper: ObjectMapper
) {
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

    fun isContentEqual(doc1: Doc?, doc2: Doc?): Boolean {
        if (doc1 == null && doc2 == null) return true
        if (doc1 == null || doc2 == null) return false
        val tree1 = objectMapper.valueToTree<JsonNode>(doc1)
        val tree2 = objectMapper.valueToTree<JsonNode>(doc2)
        return tree1 == tree2
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

            val latest = snapshotRepository.findLatestByWhiteboard(id)
            if (content != null && (latest == null || !isContentEqual(latest.content, content))) {
                val autoSnapshot = WhiteboardSnapshot().apply {
                    this.whiteboardId = id
                    this.name = "Auto-save"
                    this.isAutomatic = true
                    this.content = content
                    this.createdBy = userUuid
                }
                snapshotRepository.persistAndFlush(autoSnapshot)
                snapshotRepository.pruneAutoSnapshots(id)
            }

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

            if (content != null) {
                val initialSnapshot = WhiteboardSnapshot().apply {
                    this.whiteboardId = whiteboard.id!!
                    this.name = "Initial state"
                    this.isAutomatic = true
                    this.content = content
                    this.createdBy = userUuid
                }
                snapshotRepository.persistAndFlush(initialSnapshot)
            }

            return whiteboard
        }
    }

    @Transactional
    fun deleteForUser(userId: String, id: UUID): Boolean {
        val userUuid = UUID.fromString(userId)
        val whiteboard = repository.findByOwnerAndId(userUuid, id) ?: return false
        
        snapshotRepository.deleteByWhiteboard(id)
        collaboratorRepository.deleteByWhiteboard(id)
        accessRequestRepository.deleteByWhiteboard(id)
        assetStorageService.deleteForWhiteboard(id)
        repository.delete(whiteboard)
        return true
    }
}
