package de.einfloh.floxboard.license.resolvers

import de.einfloh.floxboard.license.domain.MetricUsageResolver
import de.einfloh.floxboard.license.domain.QuotaUsageRepository
import jakarta.enterprise.context.ApplicationScoped
import java.time.Instant
import java.util.UUID

@ApplicationScoped
class UserStorageUsageResolver(
    private val usageRepository: QuotaUsageRepository
) : MetricUsageResolver {
    override val metricKey = "storage:user_storage_bytes"

    override fun getCurrentUsage(ownerId: UUID, context: Map<String, Any>): Long {
        return usageRepository.getUsageSince(ownerId, metricKey, Instant.EPOCH)
    }
}
