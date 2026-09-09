package de.einfloh.floxboard.whiteboard.domain

import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import java.time.Instant
import java.util.*

@ApplicationScoped
class WhiteboardHistoryService(
    private val snapshotRepository: WhiteboardSnapshotRepository,
    private val whiteboardRepository: WhiteboardRepository,
    private val whiteboardService: WhiteboardService
) {
    fun listSnapshots(whiteboardId: UUID, userId: UUID, start: Int = 0, max: Int = 20): List<WhiteboardSnapshotSummary> {
        if (!whiteboardService.exists(whiteboardId)) {
            throw NoSuchElementException("Whiteboard not found")
        }
        if (!whiteboardService.canView(whiteboardId, userId)) {
            throw SecurityException("Access denied to whiteboard history")
        }
        return snapshotRepository.findByWhiteboard(whiteboardId, start, max).map { it.toSummary() }
    }

    fun getSnapshot(whiteboardId: UUID, snapshotId: UUID, userId: UUID): WhiteboardSnapshot {
        if (!whiteboardService.exists(whiteboardId)) {
            throw NoSuchElementException("Whiteboard not found")
        }
        if (!whiteboardService.canView(whiteboardId, userId)) {
            throw SecurityException("Access denied to whiteboard history")
        }
        return snapshotRepository.findByWhiteboardAndId(whiteboardId, snapshotId)
            ?: throw NoSuchElementException("Snapshot not found")
    }

    @Transactional
    fun createSnapshot(
        whiteboardId: UUID,
        userId: UUID,
        name: String? = null,
        description: String? = null,
        isAutomatic: Boolean = false,
        isGeneratedByAI: Boolean = false
    ): WhiteboardSnapshot {
        val board = whiteboardRepository.findById(whiteboardId)
            ?: throw NoSuchElementException("Whiteboard not found")
        if (!whiteboardService.canEdit(whiteboardId, userId)) {
            throw SecurityException("Access denied: You do not have permission to create snapshots for this whiteboard")
        }

        val snapshot = WhiteboardSnapshot().apply {
            this.whiteboardId = whiteboardId
            this.name = name?.trim()?.ifBlank { null }
            this.description = description?.trim()?.ifBlank { null }
            this.isAutomatic = isAutomatic
            this.isGeneratedByAI = isGeneratedByAI
            this.content = board.content
            this.createdBy = userId
        }
        snapshotRepository.persistAndFlush(snapshot)
        if (isAutomatic) {
            snapshotRepository.pruneAutoSnapshots(whiteboardId)
        }
        return snapshot
    }

    @Transactional
    fun restoreSnapshot(whiteboardId: UUID, snapshotId: UUID, userId: UUID): Whiteboard {
        val board = whiteboardRepository.findById(whiteboardId)
            ?: throw NoSuchElementException("Whiteboard not found")
        if (!whiteboardService.canEdit(whiteboardId, userId)) {
            throw SecurityException("Access denied: You do not have permission to restore this whiteboard")
        }

        val snapshot = snapshotRepository.findByWhiteboardAndId(whiteboardId, snapshotId)
            ?: throw NoSuchElementException("Snapshot not found")

        board.content = snapshot.content
        board.updatedAt = Instant.now()
        whiteboardRepository.persistAndFlush(board)

        // Record a checkpoint after restore
        val restoreSnapshot = WhiteboardSnapshot().apply {
            this.whiteboardId = whiteboardId
            this.name = "Restored checkpoint${if (!snapshot.name.isNullOrBlank()) " (${snapshot.name})" else ""}"
            this.description = "Restored from snapshot ${snapshot.id}"
            this.isAutomatic = true
            this.content = snapshot.content
            this.createdBy = userId
        }
        snapshotRepository.persistAndFlush(restoreSnapshot)
        snapshotRepository.pruneAutoSnapshots(whiteboardId)

        return board
    }

    @Transactional
    fun forkSnapshot(
        whiteboardId: UUID,
        snapshotId: UUID,
        userId: UUID,
        newName: String,
        ownerUsername: String? = null,
        ownerEmail: String? = null
    ): Whiteboard {
        if (!whiteboardService.exists(whiteboardId)) {
            throw NoSuchElementException("Whiteboard not found")
        }
        if (!whiteboardService.canView(whiteboardId, userId)) {
            throw SecurityException("Access denied: You do not have permission to fork from this whiteboard")
        }

        val snapshot = snapshotRepository.findByWhiteboardAndId(whiteboardId, snapshotId)
            ?: throw NoSuchElementException("Snapshot not found")

        val newBoard = whiteboardService.saveForUser(
            userId = userId.toString(),
            name = newName,
            content = snapshot.content,
            id = null,
            ownerUsername = ownerUsername,
            ownerEmail = ownerEmail
        )

        val existingInitial = snapshotRepository.findLatestByWhiteboard(newBoard.id!!)
        if (existingInitial != null) {
            existingInitial.name = "Initial revision (Forked from snapshot ${snapshot.id})"
            existingInitial.description = "Forked from whiteboard $whiteboardId snapshot ${snapshot.id}"
            snapshotRepository.persistAndFlush(existingInitial)
        } else {
            // Seed initial snapshot on the new whiteboard
            val initialSnapshot = WhiteboardSnapshot().apply {
                this.whiteboardId = newBoard.id!!
                this.name = "Initial revision (Forked from snapshot ${snapshot.id})"
                this.description = "Forked from whiteboard $whiteboardId snapshot ${snapshot.id}"
                this.isAutomatic = true
                this.content = snapshot.content
                this.createdBy = userId
            }
            snapshotRepository.persistAndFlush(initialSnapshot)
        }

        return newBoard
    }

    @Transactional
    fun deleteSnapshotsForWhiteboard(whiteboardId: UUID): Long {
        return snapshotRepository.deleteByWhiteboard(whiteboardId)
    }
}
