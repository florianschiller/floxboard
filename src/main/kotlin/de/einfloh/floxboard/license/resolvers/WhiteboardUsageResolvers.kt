package de.einfloh.floxboard.license.resolvers

import de.einfloh.floxboard.license.domain.MetricUsageResolver
import de.einfloh.floxboard.whiteboard.domain.WhiteboardCollaboratorRepository
import de.einfloh.floxboard.whiteboard.domain.WhiteboardRepository
import jakarta.enterprise.context.ApplicationScoped
import java.util.UUID

@ApplicationScoped
class WhiteboardCountUsageResolver(
    private val whiteboardRepository: WhiteboardRepository
) : MetricUsageResolver {
    override val metricKey = "whiteboards"

    override fun getCurrentUsage(ownerId: UUID, context: Map<String, Any>): Long {
        return whiteboardRepository.count("ownerId = ?1", ownerId)
    }
}

@ApplicationScoped
class CollaboratorCountUsageResolver(
    private val collaboratorRepository: WhiteboardCollaboratorRepository
) : MetricUsageResolver {
    override val metricKey = "collaborators_per_board"

    override fun getCurrentUsage(ownerId: UUID, context: Map<String, Any>): Long {
        val whiteboardId = context["whiteboardId"] as? UUID
            ?: return 0L
        return collaboratorRepository.count("whiteboardId = ?1", whiteboardId)
    }
}
