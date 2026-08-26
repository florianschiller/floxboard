package de.einfloh.floxboard.license.domain

import com.fasterxml.jackson.annotation.JsonIgnore
import java.time.Instant
import java.util.UUID

enum class LicensePlan {
    FREE,
    PRO,
    TEAM,
    ENTERPRISE
}

enum class LicenseStatus {
    ACTIVE,
    EXPIRED,
    REVOKED,
    INVALID
}

enum class QuotaPeriod {
    LIFETIME,
    MONTHLY,
    DAILY,
    CONCURRENT
}

data class QuotaDefinition(
    val limit: Long = -1,
    val period: QuotaPeriod = QuotaPeriod.LIFETIME,
    val allowOverage: Boolean = false
) {
    @get:JsonIgnore
    val isUnlimited: Boolean
        get() = limit < 0
}

data class QuotaStatus(
    val metricKey: String,
    val allowed: Boolean,
    val current: Long,
    val limit: Long?,
    val remaining: Long?
)

data class PlanDefaults(
    val features: Map<String, Boolean> = emptyMap(),
    val quotas: Map<String, QuotaDefinition> = emptyMap()
)

data class EntitlementStatusResponse(
    val plan: LicensePlan,
    val status: LicenseStatus,
    val features: Map<String, Boolean>,
    val quotas: Map<String, QuotaStatus>,
    val validUntil: Instant?,
    val isExpired: Boolean
)
