package de.einfloh.floxboard.organization.domain

import de.einfloh.floxboard.license.domain.LicensePlan
import de.einfloh.floxboard.payment.domain.BillingInterval
import java.time.Instant
import java.util.UUID

enum class JoinRequestStatus {
    PENDING,
    APPROVED,
    REJECTED
}

enum class OrgLicensePoolStatus {
    ACTIVE,
    EXPIRED,
    CANCELLED
}

enum class OrgMemberRole {
    ORG_ADMIN,
    MEMBER
}

data class OrganizationDto(
    val id: String,
    val name: String,
    val alias: String? = null,
    val domains: List<String> = emptyList(),
    val memberCount: Int = 0,
    val adminCount: Int = 0,
    val activePools: List<OrgLicensePoolDto> = emptyList()
)

data class CreateOrganizationRequest(
    val name: String,
    val domains: List<String> = emptyList(),
    val initialOrgAdminUserId: UUID? = null,
    val initialOrgAdminEmail: String? = null
)

data class OrganizationMemberDto(
    val id: UUID,
    val username: String,
    val email: String,
    val firstName: String? = null,
    val lastName: String? = null,
    val role: OrgMemberRole = OrgMemberRole.MEMBER,
    val assignedPlan: LicensePlan? = null,
    val poolAssignmentId: UUID? = null,
    val hasLicense: Boolean = false,
    val licenseSource: String? = null
)

data class OrganizationJoinRequestDto(
    val id: UUID,
    val organizationId: String,
    val userId: UUID,
    val email: String,
    val status: JoinRequestStatus,
    val resolvedBy: UUID? = null,
    val createdAt: Instant,
    val updatedAt: Instant? = null
)

data class UpdateMemberRoleRequest(
    val role: OrgMemberRole
)

data class InviteMemberRequest(
    val email: String,
    val role: OrgMemberRole = OrgMemberRole.MEMBER
)

data class OrgLicensePoolDto(
    val id: UUID,
    val organizationId: String,
    val planType: LicensePlan,
    val totalSeats: Int,
    val allocatedSeats: Int,
    val remainingSeats: Int,
    val billingInterval: BillingInterval,
    val validFrom: Instant? = null,
    val validUntil: Instant? = null,
    val status: OrgLicensePoolStatus,
    val createdAt: Instant? = null,
    val updatedAt: Instant? = null
)

data class OrgBulkCheckoutRequest(
    val plan: LicensePlan,
    val seatCount: Int,
    val billingInterval: BillingInterval = BillingInterval.MONTHLY,
    val paymentMethod: String? = null
)

data class AssignSeatRequest(
    val userId: UUID
)

data class SeatAssignmentDto(
    val id: UUID,
    val poolId: UUID,
    val userId: UUID,
    val userEmail: String? = null,
    val assignedBy: UUID,
    val assignedAt: Instant
)

data class MyOrganizationProfileDto(
    val organizationId: String,
    val organizationName: String,
    val role: OrgMemberRole,
    val domains: List<String> = emptyList()
)
