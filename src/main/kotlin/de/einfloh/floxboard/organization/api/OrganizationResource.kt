package de.einfloh.floxboard.organization.api

import de.einfloh.floxboard.organization.domain.*
import de.einfloh.floxboard.payment.domain.MockCheckoutResponse
import de.einfloh.floxboard.payment.domain.PaymentService
import io.quarkus.security.Authenticated
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.UUID

@Path("/api/v1/organizations")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Organizations", description = "Organization member, admin, approval and licensing APIs")
class OrganizationResource(
    private val organizationService: OrganizationService,
    private val paymentService: PaymentService,
    private val jwt: JsonWebToken
) {

    private fun getUserId(): UUID {
        val subject = jwt.subject ?: throw WebApplicationException("Subject is missing", 401)
        return UUID.fromString(subject)
    }

    private fun getUserEmail(): String {
        return jwt.getClaim<String>("email") ?: jwt.name ?: ""
    }

    private fun getCurrentUserOrg(preferredOrgId: String? = null): MyOrganizationProfileDto {
        val userId = getUserId()
        if (!preferredOrgId.isNullOrBlank()) {
            val org = organizationService.getOrganization(preferredOrgId)
            val isMember = organizationService.listMembers(preferredOrgId).any { it.id == userId }
            val isAdmin = organizationService.isOrgAdmin(userId, preferredOrgId)
            if (isMember || isAdmin) {
                return MyOrganizationProfileDto(
                    organizationId = org.id,
                    organizationName = org.name,
                    role = if (isAdmin) OrgMemberRole.ORG_ADMIN else OrgMemberRole.MEMBER,
                    domains = org.domains
                )
            } else {
                throw ForbiddenException("User does not have access to organization $preferredOrgId")
            }
        }
        return organizationService.getUserOrganization(userId)
            ?: throw NotFoundException("Current user is not associated with any organization")
    }

    private fun requireOrgAdmin(orgId: String): UUID {
        val userId = getUserId()
        val groups = jwt.groups ?: emptySet<String>()
        val realmAccess = jwt.getClaim<Map<String, Any>>("realm_access")
        val roles = (realmAccess?.get("roles") as? List<*>)?.map { it.toString() } ?: emptyList()
        val isRealmAdmin = "admin" in groups || "admin" in roles
        if (isRealmAdmin) {
            return userId
        }
        val isAdmin = organizationService.isOrgAdmin(userId, orgId)
        if (!isAdmin) {
            throw ForbiddenException("Organization administrator privileges required")
        }
        return userId
    }

    @GET
    @Path("/my")
    @Operation(summary = "Get current authenticated user's organization profile")
    fun getMyOrganization(@QueryParam("orgId") orgId: String?): MyOrganizationProfileDto {
        return getCurrentUserOrg(orgId)
    }

    @GET
    @Path("/my-organizations")
    @Operation(summary = "Get all organizations the current authenticated user belongs to")
    fun getMyOrganizations(): List<MyOrganizationProfileDto> {
        val userId = getUserId()
        return organizationService.getUserOrganizations(userId)
    }

    @POST
    @Path("/join-domain")
    @Operation(summary = "Check user's email domain and submit a pending join request")
    fun requestDomainJoin(): OrganizationJoinRequestDto {
        val userId = getUserId()
        val email = getUserEmail()
        return organizationService.checkAndCreatePendingDomainJoin(userId, email)
            ?: throw BadRequestException("No matching organization domain found for email $email or user is already a member")
    }

    @GET
    @Path("/members")
    @Operation(summary = "List members of current user's organization")
    fun listMembers(@QueryParam("orgId") orgId: String?): List<OrganizationMemberDto> {
        val org = getCurrentUserOrg(orgId)
        return organizationService.listMembers(org.organizationId)
    }

    @POST
    @Path("/invitations")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Invite a member by email to the organization (Org Admin only)")
    fun inviteMember(
        @QueryParam("orgId") orgId: String?,
        request: InviteMemberRequest
    ): Response {
        val org = getCurrentUserOrg(orgId)
        requireOrgAdmin(org.organizationId)
        organizationService.inviteMember(org.organizationId, request.email, request.role)
        return Response.ok(mapOf("message" to "Invitation processed for ${request.email}")).build()
    }

    @POST
    @Path("/members/{userId}/role")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Change a member's role (Org Admin only)")
    fun updateMemberRole(
        @PathParam("userId") targetUserId: UUID,
        @QueryParam("orgId") orgId: String?,
        request: UpdateMemberRoleRequest
    ): Response {
        val org = getCurrentUserOrg(orgId)
        requireOrgAdmin(org.organizationId)
        organizationService.setOrgAdminStatus(
            orgId = org.organizationId,
            userId = targetUserId,
            isAdmin = (request.role == OrgMemberRole.ORG_ADMIN)
        )
        return Response.ok(mapOf("message" to "Member role updated to ${request.role}")).build()
    }

    @DELETE
    @Path("/members/{userId}")
    @Operation(summary = "Remove a member from the organization (Org Admin only)")
    fun removeMember(
        @PathParam("userId") targetUserId: UUID,
        @QueryParam("orgId") orgId: String?
    ): Response {
        val org = getCurrentUserOrg(orgId)
        requireOrgAdmin(org.organizationId)
        organizationService.removeMember(org.organizationId, targetUserId)
        return Response.noContent().build()
    }

    @GET
    @Path("/pending-members")
    @Operation(summary = "List pending domain-based join requests for organization (Org Admin only)")
    fun getPendingMembers(@QueryParam("orgId") orgId: String?): List<OrganizationJoinRequestDto> {
        val org = getCurrentUserOrg(orgId)
        requireOrgAdmin(org.organizationId)
        return organizationService.getPendingJoinRequests(org.organizationId)
    }

    @POST
    @Path("/pending-members/{requestId}/approve")
    @Operation(summary = "Approve a domain-based join request (Org Admin only)")
    fun approvePendingMember(@PathParam("requestId") requestId: UUID): OrganizationJoinRequestDto {
        val req = organizationService.getPendingJoinRequest(requestId)
        val adminId = requireOrgAdmin(req.organizationId)
        return organizationService.approveJoinRequest(req.organizationId, requestId, adminId)
    }

    @POST
    @Path("/pending-members/{requestId}/reject")
    @Operation(summary = "Reject a domain-based join request (Org Admin only)")
    fun rejectPendingMember(@PathParam("requestId") requestId: UUID): OrganizationJoinRequestDto {
        val req = organizationService.getPendingJoinRequest(requestId)
        val adminId = requireOrgAdmin(req.organizationId)
        return organizationService.rejectJoinRequest(req.organizationId, requestId, adminId)
    }

    @GET
    @Path("/license-pool")
    @Operation(summary = "View organization license pools and seat allocations")
    fun getLicensePool(@QueryParam("orgId") orgId: String?): List<OrgLicensePoolDto> {
        val org = getCurrentUserOrg(orgId)
        return organizationService.getLicensePools(org.organizationId)
    }

    @POST
    @Path("/license-pool/checkout")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Purchase bulk license seats for the organization (Org Admin only)")
    fun bulkLicenseCheckout(
        @QueryParam("orgId") orgId: String?,
        request: OrgBulkCheckoutRequest
    ): MockCheckoutResponse {
        val org = getCurrentUserOrg(orgId)
        val adminId = requireOrgAdmin(org.organizationId)
        return paymentService.processOrgBulkCheckout(
            orgId = org.organizationId,
            buyerUserId = adminId,
            request = request
        )
    }

    @POST
    @Path("/license-pool/{poolId}/assign")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Assign a seat from a license pool to an organization member (Org Admin only)")
    fun assignSeat(
        @PathParam("poolId") poolId: UUID,
        request: AssignSeatRequest
    ): SeatAssignmentDto {
        val pool = organizationService.getLicensePool(poolId)
        val adminId = requireOrgAdmin(pool.organizationId)
        return organizationService.assignSeat(
            orgId = pool.organizationId,
            poolId = poolId,
            userId = request.userId,
            adminUserId = adminId
        )
    }

    @POST
    @Path("/license-pool/{poolId}/unassign")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Unassign / revoke a seat from an organization member (Org Admin only)")
    fun unassignSeat(
        @PathParam("poolId") poolId: UUID,
        request: AssignSeatRequest
    ): Response {
        val pool = organizationService.getLicensePool(poolId)
        requireOrgAdmin(pool.organizationId)
        val unassigned = organizationService.unassignSeat(
            orgId = pool.organizationId,
            poolId = poolId,
            userId = request.userId
        )
        return Response.ok(mapOf("unassigned" to unassigned)).build()
    }
}
