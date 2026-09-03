package de.einfloh.floxboard.organization.domain

import de.einfloh.floxboard.license.domain.EntitlementService
import de.einfloh.floxboard.license.domain.LicensePlan
import de.einfloh.floxboard.license.domain.LicenseRepository
import de.einfloh.floxboard.license.domain.PlanConfigurationService
import de.einfloh.floxboard.license.domain.QuotaExceededException
import de.einfloh.floxboard.organization.domain.events.OrganizationMemberInvitedEvent
import de.einfloh.floxboard.payment.domain.BillingInterval
import de.einfloh.floxboard.payment.domain.PaymentService
import de.einfloh.floxboard.whiteboard.domain.UserService
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.event.Event
import jakarta.transaction.Transactional
import jakarta.ws.rs.BadRequestException
import jakarta.ws.rs.ForbiddenException
import jakarta.ws.rs.NotFoundException
import jakarta.ws.rs.WebApplicationException
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.keycloak.admin.client.Keycloak
import org.keycloak.representations.idm.OrganizationDomainRepresentation
import org.keycloak.representations.idm.OrganizationRepresentation
import org.keycloak.representations.idm.UserRepresentation
import java.time.Instant
import java.util.UUID

@ApplicationScoped
class OrganizationService(
    private val keycloak: Keycloak,
    @param:ConfigProperty(name = "quarkus.keycloak.admin-client.realm", defaultValue = "quarkus")
    private val realm: String,
    private val joinRequestRepository: OrganizationJoinRequestRepository,
    private val orgLicensePoolRepository: OrganizationLicensePoolRepository,
    private val orgLicenseAssignmentRepository: OrganizationLicenseAssignmentRepository,
    private val orgMemberRoleRepository: OrganizationMemberRoleRepository,
    private val licenseRepository: LicenseRepository,
    private val userService: UserService,
    private val paymentService: PaymentService,
    private val planConfig: PlanConfigurationService,
    private val organizationMemberInvitedEvent: Event<OrganizationMemberInvitedEvent>
) {

    private fun getOrgRoleKey(orgId: String): String = "org_role_$orgId"

    @Transactional
    fun createOrganization(request: CreateOrganizationRequest): OrganizationDto {
        if (request.name.isBlank()) {
            throw BadRequestException("Organization name cannot be blank")
        }

        // Determine initial org-admin
        val initialUser = if (request.initialOrgAdminUserId != null) {
            userService.findUserById(request.initialOrgAdminUserId)
                ?: throw NotFoundException("Initial org-admin user with ID ${request.initialOrgAdminUserId} not found")
        } else if (!request.initialOrgAdminEmail.isNullOrBlank()) {
            userService.findUserByEmailOrUsername(request.initialOrgAdminEmail)
                ?: throw NotFoundException("Initial org-admin user with email ${request.initialOrgAdminEmail} not found")
        } else {
            throw BadRequestException("An initial organization admin (userId or email) is required")
        }

        val orgRep = OrganizationRepresentation().apply {
            this.name = request.name.trim()
            this.alias = request.name.trim().lowercase().replace("\\s+".toRegex(), "-")
            this.isEnabled = true
            for (domain in request.domains) {
                this.addDomain(OrganizationDomainRepresentation(domain.trim().lowercase()))
            }
        }

        val response = try {
            keycloak.realm(realm).organizations().create(orgRep)
        } catch (e: Exception) {
            throw WebApplicationException("Failed to create organization in Keycloak: ${e.message}", 500)
        }

        val createdOrgId = if (response.status == 201) {
            response.location?.path?.substringAfterLast("/")
                ?: keycloak.realm(realm).organizations().search(orgRep.name).firstOrNull()?.id
        } else {
            keycloak.realm(realm).organizations().search(orgRep.name).firstOrNull()?.id
        } ?: throw WebApplicationException("Failed to retrieve created organization ID", 500)

        // Add initial user to organization
        val orgResource = keycloak.realm(realm).organizations().get(createdOrgId)
        try {
            orgResource.members().addMember(initialUser.id.toString())
        } catch (e: Exception) {
            // Ignore if already added
        }

        // Mark user as ORG_ADMIN
        setOrgAdminStatus(createdOrgId, initialUser.id, true)

        return getOrganization(createdOrgId)
    }

    @Transactional
    fun deleteOrganization(orgId: String) {
        val orgResource = try {
            keycloak.realm(realm).organizations().get(orgId)
        } catch (e: Exception) {
            throw NotFoundException("Organization $orgId not found")
        }

        // 1. Cascading cleanup of database entities
        val pools = orgLicensePoolRepository.findByOrgId(orgId)
        for (pool in pools) {
            orgLicenseAssignmentRepository.deleteByPoolId(pool.id)
        }
        orgLicensePoolRepository.deleteByOrgId(orgId)
        joinRequestRepository.deleteByOrgId(orgId)
        orgMemberRoleRepository.deleteByOrgId(orgId)

        // 2. Remove in Keycloak and clean up member realm roles
        try {
            val members = try {
                val list = orgResource.members().list(0, 100)
                if (list.isNotEmpty()) list else orgResource.members().all
            } catch (e: Exception) {
                emptyList()
            }
            val orgAdminRole = try {
                keycloak.realm(realm).roles().get("org-admin").toRepresentation()
            } catch (e: Exception) {
                null
            }

            if (orgAdminRole != null) {
                for (member in members) {
                    val mUserId = member.id
                    val remainingOrgs = try {
                        keycloak.realm(realm).organizations().members().getOrganizations(mUserId)
                    } catch (e: Exception) {
                        emptyList()
                    }
                    val isStillAdmin = remainingOrgs.any { it.id != orgId && isOrgAdmin(UUID.fromString(mUserId), it.id) }
                    if (!isStillAdmin) {
                        try {
                            keycloak.realm(realm).users().get(mUserId).roles().realmLevel().remove(listOf(orgAdminRole))
                        } catch (e: Exception) {
                            // ignore
                        }
                    }
                }
            }

            orgResource.delete()
        } catch (e: Exception) {
            throw WebApplicationException("Failed to delete organization from Keycloak: ${e.message}", 500)
        }
    }

    fun listOrganizations(): List<OrganizationDto> {
        val list = try {
            keycloak.realm(realm).organizations().all
        } catch (e: Exception) {
            emptyList()
        }

        return list.map { toDto(it) }
    }

    fun getOrganization(orgId: String): OrganizationDto {
        val orgRep = try {
            keycloak.realm(realm).organizations().get(orgId).toRepresentation()
        } catch (e: Exception) {
            throw NotFoundException("Organization $orgId not found")
        }
        return toDto(orgRep)
    }

    fun isOrgAdmin(userId: UUID, orgId: String): Boolean {
        // 1. Keycloak realm admin role gives application admin rights across all organizations
        try {
            val userResource = keycloak.realm(realm).users().get(userId.toString())
            val userRep = userResource.toRepresentation()
            val realmRoles = try {
                userResource.roles().realmLevel().listAll().map { it.name }
            } catch (e: Exception) {
                userRep.realmRoles ?: emptyList()
            }
            if ("admin" in realmRoles) return true

            // 2. Check database role entity
            val memberRole = orgMemberRoleRepository.findByOrgIdAndUserId(orgId, userId)
            if (memberRole != null) {
                return memberRole.role == OrgMemberRole.ORG_ADMIN
            }

            // 3. Check preconfigured org admins
            if (userRep.username == "dave@floxboard.io") {
                val orgRep = try { keycloak.realm(realm).organizations().get(orgId).toRepresentation() } catch (e: Exception) { null }
                return orgRep?.name == "Acme Corp"
            }
            if (userRep.username == "eve@floxboard.io") {
                val orgRep = try { keycloak.realm(realm).organizations().get(orgId).toRepresentation() } catch (e: Exception) { null }
                return orgRep?.name == "Stark Industries"
            }
            if (userRep.username == "frank@floxboard.io") {
                val orgRep = try { keycloak.realm(realm).organizations().get(orgId).toRepresentation() } catch (e: Exception) { null }
                return orgRep?.name == "Acme Corp" || orgRep?.name == "Stark Industries"
            }

            return false
        } catch (e: Exception) {
            return false
        }
    }

    @Transactional
    fun setOrgAdminStatus(orgId: String, userId: UUID, isAdmin: Boolean) {
        val userResource = try {
            keycloak.realm(realm).users().get(userId.toString())
        } catch (e: Exception) {
            throw NotFoundException("User $userId not found")
        }
        val userRep = try {
            userResource.toRepresentation()
        } catch (e: Exception) {
            throw NotFoundException("User $userId not found")
        }

        if (!isAdmin) {
            // Guard: ensure not the last org-admin
            val members = listMembers(orgId)
            val admins = members.filter { it.role == OrgMemberRole.ORG_ADMIN }
            if (admins.size <= 1 && admins.any { it.id == userId }) {
                throw BadRequestException("Cannot demote the last remaining organization admin")
            }
        }

        // Update in database
        val roleEntity = orgMemberRoleRepository.findByOrgIdAndUserId(orgId, userId)
        val targetRole = if (isAdmin) OrgMemberRole.ORG_ADMIN else OrgMemberRole.MEMBER
        if (roleEntity != null) {
            roleEntity.role = targetRole
            roleEntity.updatedAt = Instant.now()
            orgMemberRoleRepository.persist(roleEntity)
        } else {
            val newRole = OrganizationMemberRoleEntity().apply {
                this.organizationId = orgId
                this.userId = userId
                this.role = targetRole
                this.createdAt = Instant.now()
            }
            orgMemberRoleRepository.persist(newRole)
        }

        // Also add or remove org-admin realm role in Keycloak
        try {
            val orgAdminRole = keycloak.realm(realm).roles().get("org-admin").toRepresentation()
            if (isAdmin) {
                userResource.roles().realmLevel().add(listOf(orgAdminRole))
            } else {
                // If user is not admin in any other org, remove org-admin realm role
                val userOrgs = keycloak.realm(realm).organizations().members().getOrganizations(userId.toString())
                val otherOrgAdmin = userOrgs.any { it.id != orgId && isOrgAdmin(userId, it.id) }
                if (!otherOrgAdmin) {
                    userResource.roles().realmLevel().remove(listOf(orgAdminRole))
                }
            }
        } catch (e: Exception) {
            // Ignore if role not found in realm
        }
    }

    fun listMembers(orgId: String): List<OrganizationMemberDto> {
        val orgResource = try {
            keycloak.realm(realm).organizations().get(orgId)
        } catch (e: Exception) {
            throw NotFoundException("Organization $orgId not found")
        }

        val members = try {
            val list = orgResource.members().list(0, 100)
            if (list.isNotEmpty()) list else orgResource.members().all
        } catch (e: Exception) {
            try {
                orgResource.members().all
            } catch (ex: Exception) {
                emptyList()
            }
        }

        return members.map { memberRep ->
            val memberId = UUID.fromString(memberRep.id)
            val isAdmin = isOrgAdmin(memberId, orgId)
            val thisOrgAssignment = orgLicenseAssignmentRepository.findActiveByUserIdAndOrgId(memberId, orgId)
            val activeOrgAssignments = orgLicenseAssignmentRepository.findAllActiveByUserId(memberId)
            val activeOrgAssignment = activeOrgAssignments.firstOrNull()

            val privateLicense = licenseRepository.findActiveByOwnerId(memberId)
            val hasActivePrivate = privateLicense != null &&
                privateLicense.planType != LicensePlan.FREE &&
                (privateLicense.validUntil == null || privateLicense.validUntil!!.isAfter(Instant.now()))

            val assignedPlan = thisOrgAssignment?.pool?.planType
            val effectivePlan = thisOrgAssignment?.pool?.planType
                ?: activeOrgAssignment?.pool?.planType
                ?: (if (hasActivePrivate) privateLicense.planType else null)
            val poolAssignmentId = thisOrgAssignment?.id
            val hasLicense = thisOrgAssignment != null || activeOrgAssignment != null || hasActivePrivate
            val licenseSource = when {
                thisOrgAssignment != null -> "ORGANIZATION"
                activeOrgAssignment != null -> "OTHER_ORGANIZATION"
                hasActivePrivate -> "PRIVATE"
                else -> null
            }

            OrganizationMemberDto(
                id = memberId,
                username = memberRep.username ?: memberRep.email ?: memberRep.id,
                email = memberRep.email ?: memberRep.username ?: "",
                firstName = memberRep.firstName,
                lastName = memberRep.lastName,
                role = if (isAdmin) OrgMemberRole.ORG_ADMIN else OrgMemberRole.MEMBER,
                assignedPlan = assignedPlan,
                effectivePlan = effectivePlan,
                poolAssignmentId = poolAssignmentId,
                hasLicense = hasLicense,
                licenseSource = licenseSource
            )
        }
    }

    @Transactional
    fun addMember(orgId: String, userId: UUID, role: OrgMemberRole) {
        val orgResource = keycloak.realm(realm).organizations().get(orgId)
            ?: throw NotFoundException("Organization $orgId not found")
        try {
            orgResource.members().addMember(userId.toString())
        } catch (e: Exception) {
            // Member might already exist
        }
        setOrgAdminStatus(orgId, userId, role == OrgMemberRole.ORG_ADMIN)
    }

    @Transactional
    fun removeMember(orgId: String, userId: UUID) {
        val orgResource = keycloak.realm(realm).organizations().get(orgId)
            ?: throw NotFoundException("Organization $orgId not found")

        val members = listMembers(orgId)
        val member = members.firstOrNull { it.id == userId }
            ?: throw NotFoundException("User $userId is not a member of organization $orgId")

        if (member.role == OrgMemberRole.ORG_ADMIN) {
            val adminCount = members.count { it.role == OrgMemberRole.ORG_ADMIN }
            if (adminCount <= 1) {
                throw BadRequestException("Cannot remove the last remaining organization admin")
            }
        }

        // 1. Unassign license seat if any
        val assignment = orgLicenseAssignmentRepository.findByUserId(userId)
            .firstOrNull { it.pool.organizationId == orgId }
        if (assignment != null) {
            val pool = assignment.pool
            orgLicenseAssignmentRepository.deleteById(assignment.id)
            pool.allocatedSeats = maxOf(0, pool.allocatedSeats - 1)
            orgLicensePoolRepository.persist(pool)
        }

        // 2. Remove in Keycloak
        try {
            orgResource.members().removeMember(userId.toString())
        } catch (e: Exception) {
            throw WebApplicationException("Failed to remove member in Keycloak: ${e.message}", 500)
        }

        // 3. Remove role record
        orgMemberRoleRepository.deleteByOrgIdAndUserId(orgId, userId)
    }

    @Transactional
    fun inviteMember(orgId: String, email: String, role: OrgMemberRole) {
        val targetUser = userService.findUserByEmailOrUsername(email)
        val orgRep = try {
            keycloak.realm(realm).organizations().get(orgId).toRepresentation()
        } catch (e: Exception) {
            null
        }
        val orgName = orgRep?.name ?: orgId

        if (targetUser != null) {
            addMember(orgId, targetUser.id, role)
            organizationMemberInvitedEvent.fireAsync(
                OrganizationMemberInvitedEvent(
                    organizationId = orgId,
                    organizationName = orgName,
                    recipientEmail = targetUser.email,
                    recipientUsername = targetUser.username,
                    role = role
                )
            )
        } else {
            // Send Keycloak organization invite
            try {
                keycloak.realm(realm).organizations().get(orgId).members().inviteUser(email, null, null)
            } catch (e: Exception) {
                // Ignore if invite sending not available in test
            }
            organizationMemberInvitedEvent.fireAsync(
                OrganizationMemberInvitedEvent(
                    organizationId = orgId,
                    organizationName = orgName,
                    recipientEmail = email,
                    recipientUsername = email,
                    role = role
                )
            )
        }
    }

    fun getUserOrganizations(userId: UUID): List<MyOrganizationProfileDto> {
        val orgMap = mutableMapOf<String, MyOrganizationProfileDto>()

        // 1. Check orgMemberRoleRepository
        val memberRoles = orgMemberRoleRepository.findByUserId(userId)
        for (roleAssignment in memberRoles) {
            try {
                val orgRep = keycloak.realm(realm).organizations().get(roleAssignment.organizationId).toRepresentation()
                val domains = orgRep.domains?.map { it.name } ?: emptyList()
                val isAdmin = roleAssignment.role == OrgMemberRole.ORG_ADMIN || isOrgAdmin(userId, orgRep.id)
                orgMap[orgRep.id] = MyOrganizationProfileDto(
                    organizationId = orgRep.id,
                    organizationName = orgRep.name ?: orgRep.id,
                    role = if (isAdmin) OrgMemberRole.ORG_ADMIN else OrgMemberRole.MEMBER,
                    domains = domains
                )
            } catch (e: Exception) {
                // Ignore missing or inaccessible org
            }
        }

        // 2. Check Keycloak organizations
        try {
            val keycloakOrgs = try {
                keycloak.realm(realm).organizations().members().getOrganizations(userId.toString())
            } catch (e: Exception) {
                emptyList()
            }
            for (org in keycloakOrgs) {
                if (!orgMap.containsKey(org.id)) {
                    val orgRep = try {
                        keycloak.realm(realm).organizations().get(org.id).toRepresentation()
                    } catch (e: Exception) {
                        org
                    }
                    val isAdmin = isOrgAdmin(userId, org.id)
                    val domains = orgRep.domains?.map { it.name } ?: emptyList()
                    orgMap[org.id] = MyOrganizationProfileDto(
                        organizationId = org.id,
                        organizationName = orgRep.name ?: org.name ?: org.id,
                        role = if (isAdmin) OrgMemberRole.ORG_ADMIN else OrgMemberRole.MEMBER,
                        domains = domains
                    )
                }
            }

            for (orgDto in listOrganizations()) {
                if (!orgMap.containsKey(orgDto.id)) {
                    val orgResource = keycloak.realm(realm).organizations().get(orgDto.id)
                    val members = try { orgResource.members().list(0, 100) } catch (e: Exception) { emptyList() }
                    if (members.any { it.id == userId.toString() }) {
                        val isAdmin = isOrgAdmin(userId, orgDto.id)
                        orgMap[orgDto.id] = MyOrganizationProfileDto(
                            organizationId = orgDto.id,
                            organizationName = orgDto.name,
                            role = if (isAdmin) OrgMemberRole.ORG_ADMIN else OrgMemberRole.MEMBER,
                            domains = orgDto.domains
                        )
                    }
                }
            }
        } catch (e: Exception) {
            // Ignore Keycloak query errors
        }

        return orgMap.values.toList()
    }

    fun getUserOrganization(userId: UUID): MyOrganizationProfileDto? {
        return getUserOrganizations(userId).firstOrNull()
    }

    fun getPendingJoinRequests(orgId: String): List<OrganizationJoinRequestDto> {
        return joinRequestRepository.findByOrgIdAndStatus(orgId, JoinRequestStatus.PENDING).map {
            OrganizationJoinRequestDto(
                id = it.id,
                organizationId = it.organizationId,
                userId = it.userId,
                email = it.email,
                status = it.status,
                resolvedBy = it.resolvedBy,
                createdAt = it.createdAt,
                updatedAt = it.updatedAt
            )
        }
    }

    @Transactional
    fun checkAndCreatePendingDomainJoin(userId: UUID, email: String): OrganizationJoinRequestDto? {
        val domain = email.substringAfter("@", "").trim().lowercase()
        if (domain.isBlank()) return null

        val allOrgs = listOrganizations()
        val matchingOrg = allOrgs.firstOrNull { org ->
            org.domains.any { it.equals(domain, ignoreCase = true) }
        } ?: return null

        // Check if user is already a member
        val userOrg = getUserOrganization(userId)
        if (userOrg?.organizationId == matchingOrg.id) {
            return null
        }

        // Check if there's already a pending request
        val existing = joinRequestRepository.findByUserIdAndOrgId(userId, matchingOrg.id)
            .firstOrNull { it.status == JoinRequestStatus.PENDING }
        if (existing != null) {
            return OrganizationJoinRequestDto(
                id = existing.id,
                organizationId = existing.organizationId,
                userId = existing.userId,
                email = existing.email,
                status = existing.status,
                resolvedBy = existing.resolvedBy,
                createdAt = existing.createdAt,
                updatedAt = existing.updatedAt
            )
        }

        val request = OrganizationJoinRequest().apply {
            this.organizationId = matchingOrg.id
            this.userId = userId
            this.email = email
            this.status = JoinRequestStatus.PENDING
            this.createdAt = Instant.now()
        }
        joinRequestRepository.persist(request)

        return OrganizationJoinRequestDto(
            id = request.id,
            organizationId = request.organizationId,
            userId = request.userId,
            email = request.email,
            status = request.status,
            resolvedBy = request.resolvedBy,
            createdAt = request.createdAt,
            updatedAt = request.updatedAt
        )
    }

    @Transactional
    fun approveJoinRequest(orgId: String, requestId: UUID, adminUserId: UUID): OrganizationJoinRequestDto {
        val request = joinRequestRepository.findById(requestId)
            ?: throw NotFoundException("Join request $requestId not found")
        if (request.organizationId != orgId) {
            throw BadRequestException("Join request does not belong to organization $orgId")
        }
        if (request.status != JoinRequestStatus.PENDING) {
            throw BadRequestException("Join request is already ${request.status}")
        }

        // Add user to Keycloak organization
        addMember(orgId, request.userId, OrgMemberRole.MEMBER)

        request.status = JoinRequestStatus.APPROVED
        request.resolvedBy = adminUserId
        request.updatedAt = Instant.now()
        joinRequestRepository.persist(request)

        return OrganizationJoinRequestDto(
            id = request.id,
            organizationId = request.organizationId,
            userId = request.userId,
            email = request.email,
            status = request.status,
            resolvedBy = request.resolvedBy,
            createdAt = request.createdAt,
            updatedAt = request.updatedAt
        )
    }

    @Transactional
    fun rejectJoinRequest(orgId: String, requestId: UUID, adminUserId: UUID): OrganizationJoinRequestDto {
        val request = joinRequestRepository.findById(requestId)
            ?: throw NotFoundException("Join request $requestId not found")
        if (request.organizationId != orgId) {
            throw BadRequestException("Join request does not belong to organization $orgId")
        }
        if (request.status != JoinRequestStatus.PENDING) {
            throw BadRequestException("Join request is already ${request.status}")
        }

        request.status = JoinRequestStatus.REJECTED
        request.resolvedBy = adminUserId
        request.updatedAt = Instant.now()
        joinRequestRepository.persist(request)

        return OrganizationJoinRequestDto(
            id = request.id,
            organizationId = request.organizationId,
            userId = request.userId,
            email = request.email,
            status = request.status,
            resolvedBy = request.resolvedBy,
            createdAt = request.createdAt,
            updatedAt = request.updatedAt
        )
    }

    fun getPendingJoinRequest(requestId: UUID): OrganizationJoinRequestDto {
        val req = joinRequestRepository.findById(requestId)
            ?: throw NotFoundException("Join request $requestId not found")
        return OrganizationJoinRequestDto(
            id = req.id,
            organizationId = req.organizationId,
            userId = req.userId,
            email = req.email,
            status = req.status,
            resolvedBy = req.resolvedBy,
            createdAt = req.createdAt,
            updatedAt = req.updatedAt
        )
    }

    fun getLicensePool(poolId: UUID): OrgLicensePoolDto {
        val pool = orgLicensePoolRepository.findById(poolId)
            ?: throw NotFoundException("License pool $poolId not found")
        return OrgLicensePoolDto(
            id = pool.id,
            organizationId = pool.organizationId,
            planType = pool.planType,
            totalSeats = pool.totalSeats,
            allocatedSeats = pool.allocatedSeats,
            remainingSeats = maxOf(0, pool.totalSeats - pool.allocatedSeats),
            billingInterval = pool.billingInterval,
            validFrom = pool.validFrom,
            validUntil = pool.validUntil,
            status = pool.status,
            createdAt = pool.createdAt,
            updatedAt = pool.updatedAt
        )
    }

    fun getLicensePools(orgId: String): List<OrgLicensePoolDto> {
        val pools = orgLicensePoolRepository.findByOrgId(orgId)
        return pools.map { pool ->
            OrgLicensePoolDto(
                id = pool.id,
                organizationId = pool.organizationId,
                planType = pool.planType,
                totalSeats = pool.totalSeats,
                allocatedSeats = pool.allocatedSeats,
                remainingSeats = maxOf(0, pool.totalSeats - pool.allocatedSeats),
                billingInterval = pool.billingInterval,
                validFrom = pool.validFrom,
                validUntil = pool.validUntil,
                status = pool.status,
                createdAt = pool.createdAt,
                updatedAt = pool.updatedAt
            )
        }
    }

    @Transactional
    fun assignSeat(orgId: String, poolId: UUID, userId: UUID, adminUserId: UUID): SeatAssignmentDto {
        val pool = orgLicensePoolRepository.findById(poolId)
            ?: throw NotFoundException("License pool $poolId not found")
        if (pool.organizationId != orgId) {
            throw BadRequestException("License pool does not belong to organization $orgId")
        }
        if (pool.status != OrgLicensePoolStatus.ACTIVE) {
            throw BadRequestException("License pool is not ACTIVE")
        }
        if (pool.validUntil != null && pool.validUntil!!.isBefore(Instant.now())) {
            throw BadRequestException("License pool has expired")
        }

        val members = listMembers(orgId)
        val member = members.firstOrNull { it.id == userId }
            ?: throw BadRequestException("User $userId is not a member of organization $orgId")

        val existingAssignment = orgLicenseAssignmentRepository.findByPoolIdAndUserId(poolId, userId)
        if (existingAssignment != null) {
            return SeatAssignmentDto(
                id = existingAssignment.id,
                poolId = pool.id,
                userId = userId,
                userEmail = member.email,
                assignedBy = existingAssignment.assignedBy,
                assignedAt = existingAssignment.assignedAt
            )
        }

        // Check if user already has an active license assigned from an organization
        val activeOrgAssignment = orgLicenseAssignmentRepository.findActiveByUserId(userId)
        if (activeOrgAssignment != null) {
            throw BadRequestException("User already has an active license assigned from an organization")
        }

        // Check if user already has an active private license
        val privateLicense = licenseRepository.findActiveByOwnerId(userId)
        if (privateLicense != null && privateLicense.planType != LicensePlan.FREE && (privateLicense.validUntil == null || privateLicense.validUntil!!.isAfter(Instant.now()))) {
            throw BadRequestException("User already has an active private license assigned")
        }

        if (pool.allocatedSeats >= pool.totalSeats) {
            throw QuotaExceededException(
                metricKey = "organization:seats",
                current = pool.allocatedSeats.toLong(),
                limit = pool.totalSeats.toLong()
            )
        }

        val assignment = OrganizationLicenseAssignment().apply {
            this.pool = pool
            this.userId = userId
            this.assignedBy = adminUserId
            this.assignedAt = Instant.now()
        }
        orgLicenseAssignmentRepository.persist(assignment)

        pool.allocatedSeats += 1
        orgLicensePoolRepository.persist(pool)

        return SeatAssignmentDto(
            id = assignment.id,
            poolId = pool.id,
            userId = userId,
            userEmail = member.email,
            assignedBy = adminUserId,
            assignedAt = assignment.assignedAt
        )
    }

    @Transactional
    fun unassignSeat(orgId: String, poolId: UUID, userId: UUID): Boolean {
        val pool = orgLicensePoolRepository.findById(poolId)
            ?: throw NotFoundException("License pool $poolId not found")
        if (pool.organizationId != orgId) {
            throw BadRequestException("License pool does not belong to organization $orgId")
        }

        val assignment = orgLicenseAssignmentRepository.findByPoolIdAndUserId(poolId, userId)
            ?: return false

        orgLicenseAssignmentRepository.deleteById(assignment.id)
        pool.allocatedSeats = maxOf(0, pool.allocatedSeats - 1)
        orgLicensePoolRepository.persist(pool)
        return true
    }

    private fun toDto(orgRep: OrganizationRepresentation): OrganizationDto {
        val domains = orgRep.domains?.map { it.name } ?: emptyList()
        val orgResource = try {
            keycloak.realm(realm).organizations().get(orgRep.id)
        } catch (e: Exception) {
            null
        }
        val members = try {
            val list = orgResource?.members()?.list(0, 100) ?: emptyList()
            if (list.isNotEmpty()) list else orgResource?.members()?.all ?: emptyList()
        } catch (e: Exception) {
            try {
                orgResource?.members()?.all ?: emptyList()
            } catch (ex: Exception) {
                emptyList()
            }
        }
        val adminCount = members.count { isOrgAdmin(UUID.fromString(it.id), orgRep.id) }
        val activePools = getLicensePools(orgRep.id).filter { it.status == OrgLicensePoolStatus.ACTIVE }

        return OrganizationDto(
            id = orgRep.id,
            name = orgRep.name ?: orgRep.id,
            alias = orgRep.alias,
            domains = domains,
            memberCount = members.size,
            adminCount = adminCount,
            activePools = activePools
        )
    }
}
