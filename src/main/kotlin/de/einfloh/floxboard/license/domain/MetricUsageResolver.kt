package de.einfloh.floxboard.license.domain

import java.util.UUID

interface MetricUsageResolver {
    val metricKey: String
    fun getCurrentUsage(ownerId: UUID, context: Map<String, Any> = emptyMap()): Long
}
