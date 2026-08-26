package de.einfloh.floxboard.license.domain

import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UpdateTimestamp
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.*

@Entity
@Table(name = "license")
class License : PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(name = "owner_id", nullable = false)
    lateinit var ownerId: UUID

    @Column(name = "license_key", columnDefinition = "text", nullable = false)
    lateinit var licenseKey: String

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", nullable = false)
    var planType: LicensePlan = LicensePlan.FREE

    @Column(columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    var features: Map<String, Boolean> = emptyMap()

    @Column(columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    var quotas: Map<String, QuotaDefinition> = emptyMap()

    @Column(name = "valid_from")
    var validFrom: Instant? = null

    @Column(name = "valid_until")
    var validUntil: Instant? = null

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: LicenseStatus = LicenseStatus.ACTIVE

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant? = null
}

@ApplicationScoped
class LicenseRepository : PanacheRepositoryBase<License, UUID> {
    fun findActiveByOwnerId(ownerId: UUID): License? =
        find("ownerId = ?1 and status = ?2", ownerId, LicenseStatus.ACTIVE).firstResult()

    fun findByOwnerId(ownerId: UUID): List<License> =
        list("ownerId = ?1", ownerId)
}
