package de.einfloh.floxboard.license.domain

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.*

@Entity
@Table(name = "quota_usage_event")
class QuotaUsageEvent : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(name = "owner_id", nullable = false)
    lateinit var ownerId: UUID

    @Column(name = "metric_key", nullable = false)
    lateinit var metricKey: String

    @Column(name = "units_consumed", nullable = false)
    var unitsConsumed: Long = 0

    @Column(name = "operation")
    var operation: String? = null

    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    var metadata: Map<String, Any>? = null

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null
}

@ApplicationScoped
class QuotaUsageRepository : PanacheRepositoryBase<QuotaUsageEvent, UUID> {
    fun getUsageSince(ownerId: UUID, metricKey: String, since: Instant): Long {
        val result = find(
            "SELECT COALESCE(SUM(unitsConsumed), 0) FROM QuotaUsageEvent WHERE ownerId = ?1 AND metricKey = ?2 AND createdAt >= ?3",
            ownerId, metricKey, since
        ).project(Long::class.java).firstResult()
        return result ?: 0L
    }
}
