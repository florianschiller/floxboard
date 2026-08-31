package de.einfloh.floxboard.organization.domain

import de.einfloh.floxboard.license.domain.LicensePlan
import de.einfloh.floxboard.payment.domain.BillingInterval
import io.quarkus.hibernate.orm.panache.kotlin.PanacheEntityBase
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "organization_join_request")
class OrganizationJoinRequest : PanacheEntityBase {
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID = UUID.randomUUID()

    @Column(name = "organization_id", nullable = false)
    lateinit var organizationId: String

    @Column(name = "user_id", nullable = false)
    lateinit var userId: UUID

    @Column(name = "email", nullable = false)
    lateinit var email: String

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: JoinRequestStatus = JoinRequestStatus.PENDING

    @Column(name = "resolved_by")
    var resolvedBy: UUID? = null

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    @UpdateTimestamp
    @Column(name = "updated_at")
    var updatedAt: Instant? = null
}

@ApplicationScoped
class OrganizationJoinRequestRepository : PanacheRepositoryBase<OrganizationJoinRequest, UUID> {
    fun findByOrgIdAndStatus(organizationId: String, status: JoinRequestStatus): List<OrganizationJoinRequest> =
        list("organizationId = ?1 and status = ?2 order by createdAt desc", organizationId, status)

    fun findByUserIdAndOrgId(userId: UUID, organizationId: String): List<OrganizationJoinRequest> =
        list("userId = ?1 and organizationId = ?2", userId, organizationId)

    fun findByUserId(userId: UUID): List<OrganizationJoinRequest> =
        list("userId = ?1 order by createdAt desc", userId)

    fun findPendingByEmail(email: String): List<OrganizationJoinRequest> =
        list("email = ?1 and status = ?2", email, JoinRequestStatus.PENDING)

    fun deleteByOrgId(organizationId: String): Long =
        delete("organizationId = ?1", organizationId)
}

@Entity
@Table(name = "organization_license_pool")
class OrganizationLicensePool : PanacheEntityBase {
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID = UUID.randomUUID()

    @Column(name = "organization_id", nullable = false)
    lateinit var organizationId: String

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", nullable = false)
    var planType: LicensePlan = LicensePlan.PRO

    @Column(name = "total_seats", nullable = false)
    var totalSeats: Int = 0

    @Column(name = "allocated_seats", nullable = false)
    var allocatedSeats: Int = 0

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_interval", nullable = false)
    var billingInterval: BillingInterval = BillingInterval.MONTHLY

    @Column(name = "valid_from")
    var validFrom: Instant? = null

    @Column(name = "valid_until")
    var validUntil: Instant? = null

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: OrgLicensePoolStatus = OrgLicensePoolStatus.ACTIVE

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    @UpdateTimestamp
    @Column(name = "updated_at")
    var updatedAt: Instant? = null
}

@ApplicationScoped
class OrganizationLicensePoolRepository : PanacheRepositoryBase<OrganizationLicensePool, UUID> {
    fun findByOrgId(organizationId: String): List<OrganizationLicensePool> =
        list("organizationId = ?1 order by createdAt desc", organizationId)

    fun findActiveByOrgId(organizationId: String): List<OrganizationLicensePool> =
        list("organizationId = ?1 and status = ?2", organizationId, OrgLicensePoolStatus.ACTIVE)

    fun deleteByOrgId(organizationId: String): Long =
        delete("organizationId = ?1", organizationId)
}

@Entity
@Table(name = "organization_license_assignment")
class OrganizationLicenseAssignment : PanacheEntityBase {
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID = UUID.randomUUID()

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "pool_id", nullable = false)
    lateinit var pool: OrganizationLicensePool

    @Column(name = "user_id", nullable = false)
    lateinit var userId: UUID

    @Column(name = "assigned_by", nullable = false)
    lateinit var assignedBy: UUID

    @CreationTimestamp
    @Column(name = "assigned_at", nullable = false, updatable = false)
    var assignedAt: Instant = Instant.now()
}

@ApplicationScoped
class OrganizationLicenseAssignmentRepository : PanacheRepositoryBase<OrganizationLicenseAssignment, UUID> {
    fun findByPoolId(poolId: UUID): List<OrganizationLicenseAssignment> =
        list("pool.id = ?1", poolId)

    fun findByUserId(userId: UUID): List<OrganizationLicenseAssignment> =
        list("userId = ?1", userId)

    fun findByPoolIdAndUserId(poolId: UUID, userId: UUID): OrganizationLicenseAssignment? =
        find("pool.id = ?1 and userId = ?2", poolId, userId).firstResult()

    fun findActiveByUserId(userId: UUID): OrganizationLicenseAssignment? =
        find(
            "userId = ?1 and pool.status = ?2 and (pool.validUntil is null or pool.validUntil > ?3)",
            userId,
            OrgLicensePoolStatus.ACTIVE,
            Instant.now()
        ).firstResult()

    fun findActiveByUserIdAndOrgId(userId: UUID, orgId: String): OrganizationLicenseAssignment? =
        find(
            "userId = ?1 and pool.organizationId = ?2 and pool.status = ?3 and (pool.validUntil is null or pool.validUntil > ?4)",
            userId,
            orgId,
            OrgLicensePoolStatus.ACTIVE,
            Instant.now()
        ).firstResult()

    fun findAllActiveByUserId(userId: UUID): List<OrganizationLicenseAssignment> =
        list(
            "userId = ?1 and pool.status = ?2 and (pool.validUntil is null or pool.validUntil > ?3)",
            userId,
            OrgLicensePoolStatus.ACTIVE,
            Instant.now()
        )

    fun deleteByUserId(userId: UUID): Long =
        delete("userId = ?1", userId)

    fun deleteByPoolId(poolId: UUID): Long =
        delete("pool.id = ?1", poolId)
}

@Entity
@Table(name = "organization_member_role")
class OrganizationMemberRoleEntity : PanacheEntityBase {
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID = UUID.randomUUID()

    @Column(name = "organization_id", nullable = false)
    lateinit var organizationId: String

    @Column(name = "user_id", nullable = false)
    lateinit var userId: UUID

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    var role: OrgMemberRole = OrgMemberRole.MEMBER

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    @UpdateTimestamp
    @Column(name = "updated_at")
    var updatedAt: Instant? = null
}

@ApplicationScoped
class OrganizationMemberRoleRepository : PanacheRepositoryBase<OrganizationMemberRoleEntity, UUID> {
    fun findByOrgIdAndUserId(organizationId: String, userId: UUID): OrganizationMemberRoleEntity? =
        find("organizationId = ?1 and userId = ?2", organizationId, userId).firstResult()

    fun findByOrgId(organizationId: String): List<OrganizationMemberRoleEntity> =
        list("organizationId = ?1", organizationId)

    fun findByUserId(userId: UUID): List<OrganizationMemberRoleEntity> =
        list("userId = ?1", userId)

    fun deleteByOrgId(organizationId: String): Long =
        delete("organizationId = ?1", organizationId)

    fun deleteByOrgIdAndUserId(organizationId: String, userId: UUID): Long =
        delete("organizationId = ?1 and userId = ?2", organizationId, userId)
}
