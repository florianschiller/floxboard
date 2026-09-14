package de.einfloh.floxboard.license.resolvers

import de.einfloh.floxboard.license.domain.MetricUsageResolver
import de.einfloh.floxboard.license.domain.QuotaUsageRepository
import jakarta.enterprise.context.ApplicationScoped
import java.time.Instant
import java.time.ZoneOffset
import java.time.ZonedDateTime
import java.time.temporal.ChronoUnit
import java.util.UUID

@ApplicationScoped
class MonthlyAiCreditsUsageResolver(
    private val usageRepository: QuotaUsageRepository
) : MetricUsageResolver {
    override val metricKey = "ai:monthly_credits"

    override fun getCurrentUsage(ownerId: UUID, context: Map<String, Any>): Long {
        val startOfMonth = ZonedDateTime.now(ZoneOffset.UTC)
            .withDayOfMonth(1)
            .truncatedTo(ChronoUnit.DAYS)
            .toInstant()
        return usageRepository.getUsageSince(ownerId, metricKey, startOfMonth)
    }
}
