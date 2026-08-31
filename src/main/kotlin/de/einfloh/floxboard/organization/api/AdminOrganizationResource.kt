package de.einfloh.floxboard.organization.api

import de.einfloh.floxboard.organization.domain.*
import de.einfloh.floxboard.payment.domain.MockCheckoutResponse
import de.einfloh.floxboard.payment.domain.PaymentService
import jakarta.annotation.security.RolesAllowed
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.UUID

@Path("/api/v1/admin/organizations")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("admin")
@Tag(name = "Admin Organizations", description = "Realm Admin Organization lifecycle management APIs")
class AdminOrganizationResource(
    private val organizationService: OrganizationService,
    private val paymentService: PaymentService,
    private val jwt: JsonWebToken
) {

    private fun getUserId(): UUID {
        val subject = jwt.subject ?: return UUID.fromString("00000000-0000-0000-0000-000000000000")
        return try {
            UUID.fromString(subject)
        } catch (e: Exception) {
            UUID.fromString("00000000-0000-0000-0000-000000000000")
        }
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Create a new organization with designated initial org-admin")
    fun createOrganization(request: CreateOrganizationRequest): OrganizationDto {
        return organizationService.createOrganization(request)
    }

    @GET
    @Operation(summary = "List all organizations")
    fun listOrganizations(): List<OrganizationDto> {
        return organizationService.listOrganizations()
    }

    @GET
    @Path("/{orgId}")
    @Operation(summary = "Get detailed organization information")
    fun getOrganization(@PathParam("orgId") orgId: String): OrganizationDto {
        return organizationService.getOrganization(orgId)
    }

    @DELETE
    @Path("/{orgId}")
    @Operation(summary = "Delete an organization and cascade associated data")
    fun deleteOrganization(@PathParam("orgId") orgId: String): Response {
        organizationService.deleteOrganization(orgId)
        return Response.noContent().build()
    }

    @GET
    @Path("/{orgId}/members")
    @Operation(summary = "List members of an organization")
    fun listMembers(@PathParam("orgId") orgId: String): List<OrganizationMemberDto> {
        return organizationService.listMembers(orgId)
    }

    @POST
    @Path("/{orgId}/members")
    @Operation(summary = "Add a member to an organization")
    fun addMember(
        @PathParam("orgId") orgId: String,
        @QueryParam("userId") userId: UUID,
        @QueryParam("role") @DefaultValue("MEMBER") role: OrgMemberRole
    ): Response {
        organizationService.addMember(orgId, userId, role)
        return Response.ok(mapOf("message" to "Member added successfully")).build()
    }

    @DELETE
    @Path("/{orgId}/members/{userId}")
    @Operation(summary = "Remove a member from an organization")
    fun removeMember(
        @PathParam("orgId") orgId: String,
        @PathParam("userId") userId: UUID
    ): Response {
        organizationService.removeMember(orgId, userId)
        return Response.noContent().build()
    }

    @POST
    @Path("/{orgId}/admins/{userId}")
    @Operation(summary = "Promote a user to org-admin in an organization")
    fun promoteOrgAdmin(
        @PathParam("orgId") orgId: String,
        @PathParam("userId") userId: UUID
    ): Response {
        organizationService.setOrgAdminStatus(orgId, userId, true)
        return Response.ok(mapOf("message" to "User promoted to organization admin")).build()
    }

    @DELETE
    @Path("/{orgId}/admins/{userId}")
    @Operation(summary = "Demote a user from org-admin in an organization")
    fun demoteOrgAdmin(
        @PathParam("orgId") orgId: String,
        @PathParam("userId") userId: UUID
    ): Response {
        organizationService.setOrgAdminStatus(orgId, userId, false)
        return Response.ok(mapOf("message" to "User demoted from organization admin")).build()
    }

    @GET
    @Path("/{orgId}/pending-members")
    @Operation(summary = "List pending domain-based join requests for an organization")
    fun getPendingMembers(@PathParam("orgId") orgId: String): List<OrganizationJoinRequestDto> {
        return organizationService.getPendingJoinRequests(orgId)
    }

    @POST
    @Path("/{orgId}/pending-members/{requestId}/approve")
    @Operation(summary = "Approve a domain-based join request")
    fun approvePendingMember(
        @PathParam("orgId") orgId: String,
        @PathParam("requestId") requestId: UUID
    ): OrganizationJoinRequestDto {
        val adminId = getUserId()
        return organizationService.approveJoinRequest(orgId, requestId, adminId)
    }

    @POST
    @Path("/{orgId}/pending-members/{requestId}/reject")
    @Operation(summary = "Reject a domain-based join request")
    fun rejectPendingMember(
        @PathParam("orgId") orgId: String,
        @PathParam("requestId") requestId: UUID
    ): OrganizationJoinRequestDto {
        val adminId = getUserId()
        return organizationService.rejectJoinRequest(orgId, requestId, adminId)
    }

    @GET
    @Path("/{orgId}/license-pools")
    @Operation(summary = "View organization license pools")
    fun getLicensePools(@PathParam("orgId") orgId: String): List<OrgLicensePoolDto> {
        return organizationService.getLicensePools(orgId)
    }

    @POST
    @Path("/{orgId}/license-pools/checkout")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Purchase bulk license seats for the organization")
    fun bulkLicenseCheckout(
        @PathParam("orgId") orgId: String,
        request: OrgBulkCheckoutRequest
    ): MockCheckoutResponse {
        val adminId = getUserId()
        return paymentService.processOrgBulkCheckout(
            orgId = orgId,
            buyerUserId = adminId,
            request = request
        )
    }

    @POST
    @Path("/{orgId}/license-pools/{poolId}/assign")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Assign a seat from a license pool to an organization member")
    fun assignSeat(
        @PathParam("orgId") orgId: String,
        @PathParam("poolId") poolId: UUID,
        request: AssignSeatRequest
    ): SeatAssignmentDto {
        val adminId = getUserId()
        return organizationService.assignSeat(
            orgId = orgId,
            poolId = poolId,
            userId = request.userId,
            adminUserId = adminId
        )
    }

    @POST
    @Path("/{orgId}/license-pools/{poolId}/unassign")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(summary = "Unassign / revoke a seat from an organization member")
    fun unassignSeat(
        @PathParam("orgId") orgId: String,
        @PathParam("poolId") poolId: UUID,
        request: AssignSeatRequest
    ): Response {
        val unassigned = organizationService.unassignSeat(
            orgId = orgId,
            poolId = poolId,
            userId = request.userId
        )
        return Response.ok(mapOf("unassigned" to unassigned)).build()
    }
}
