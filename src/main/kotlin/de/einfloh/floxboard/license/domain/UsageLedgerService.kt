package de.einfloh.floxboard.license.domain

import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import java.util.UUID

@ApplicationScoped
class UsageLedgerService(
    private val quotaUsageRepository: QuotaUsageRepository
) {
    @Transactional
    fun recordUsage(
        ownerId: UUID,
        metricKey: String,
        units: Long,
        operation: String? = null,
        metadata: Map<String, Any>? = null
    ): QuotaUsageEvent {
        val event = QuotaUsageEvent().apply {
            this.ownerId = ownerId
            this.metricKey = metricKey
            this.unitsConsumed = units
            this.operation = operation
            this.metadata = metadata
        }
        quotaUsageRepository.persist(event)
        return event
    }
}
