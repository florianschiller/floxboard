package de.einfloh.floxboard.admin.api

import de.einfloh.floxboard.license.domain.*
import io.quarkus.security.Authenticated
import jakarta.annotation.security.RolesAllowed
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import org.keycloak.admin.client.Keycloak
import org.keycloak.representations.idm.UserRepresentation
import java.time.Instant
import java.util.*

data class AdminUserDto(
    val id: UUID,
    val username: String,
    val email: String,
    val firstName: String? = null,
    val lastName: String? = null,
    val emailVerified: Boolean = false,
    val roles: List<String> = emptyList(),
    val license: EntitlementStatusResponse? = null
)

data class AssignLicenseRequest(
    val plan: LicensePlan,
    val validUntil: Instant? = null,
    val features: Map<String, Boolean>? = null,
    val quotas: Map<String, QuotaDefinition>? = null
)

@Path("/api/v1/admin")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("admin")
@Tag(name = "Admin", description = "Admin Console APIs")
class AdminResource(
    private val keycloak: Keycloak,
    @param:ConfigProperty(name = "quarkus.keycloak.admin-client.realm", defaultValue = "quarkus")
    private val realm: String,
    private val entitlementService: EntitlementService,
    private val planConfigurationService: PlanConfigurationService
) {

    @GET
    @Path("/users")
    @Operation(summary = "Search or list users with their license entitlements")
    fun searchUsers(@QueryParam("query") query: String?): List<AdminUserDto> {
        val usersResource = keycloak.realm(realm).users()
        val userList: List<UserRepresentation> = if (!query.isNullOrBlank()) {
            val q = query.trim()
            val results = mutableListOf<UserRepresentation>()
            try {
                results.addAll(usersResource.search(q, 0, 50))
            } catch (e: Exception) {
                // ignore
            }
            if (results.isEmpty()) {
                try {
                    val all = usersResource.list(0, 100)
                    results.addAll(all.filter {
                        it.username?.contains(q, ignoreCase = true) == true ||
                        it.email?.contains(q, ignoreCase = true) == true ||
                        it.firstName?.contains(q, ignoreCase = true) == true ||
                        it.lastName?.contains(q, ignoreCase = true) == true ||
                        it.id?.contains(q, ignoreCase = true) == true
                    })
                } catch (e: Exception) {
                    // ignore
                }
            }
            results.distinctBy { it.id }
        } else {
            try {
                usersResource.list(0, 100)
            } catch (e: Exception) {
                emptyList()
            }
        }

        return userList.mapNotNull { userRep ->
            try {
                val userId = UUID.fromString(userRep.id)
                val roles = try {
                    usersResource.get(userRep.id).roles().realmLevel().listAll().map { it.name }
                } catch (e: Exception) {
                    userRep.realmRoles ?: emptyList()
                }
                val licenseStatus = entitlementService.getEntitlements(userId)
                AdminUserDto(
                    id = userId,
                    username = userRep.username ?: "",
                    email = userRep.email ?: userRep.username ?: "",
                    firstName = userRep.firstName,
                    lastName = userRep.lastName,
                    emailVerified = userRep.isEmailVerified ?: false,
                    roles = roles,
                    license = licenseStatus
                )
            } catch (e: Exception) {
                null
            }
        }
    }

    @GET
    @Path("/users/{userId}")
    @Operation(summary = "Get detailed user info and license entitlements")
    fun getUser(@PathParam("userId") userId: UUID): AdminUserDto {
        val usersResource = keycloak.realm(realm).users()
        val userRep = try {
            usersResource.get(userId.toString()).toRepresentation()
        } catch (e: Exception) {
            val all = usersResource.list(0, 100)
            all.firstOrNull { it.id.equals(userId.toString(), ignoreCase = true) }
                ?: throw WebApplicationException("User not found", 404)
        }

        val roles = try {
            usersResource.get(userRep.id).roles().realmLevel().listAll().map { it.name }
        } catch (e: Exception) {
            userRep.realmRoles ?: emptyList()
        }
        val licenseStatus = entitlementService.getEntitlements(userId)

        return AdminUserDto(
            id = userId,
            username = userRep.username ?: "",
            email = userRep.email ?: userRep.username ?: "",
            firstName = userRep.firstName,
            lastName = userRep.lastName,
            emailVerified = userRep.isEmailVerified ?: false,
            roles = roles,
            license = licenseStatus
        )
    }

    @POST
    @Path("/users/{userId}/license")
    @Operation(summary = "Assign or update a license for a specific user")
    fun assignLicense(
        @PathParam("userId") userId: UUID,
        request: AssignLicenseRequest
    ): Response {
        val license = entitlementService.assignLicense(
            ownerId = userId,
            plan = request.plan,
            validUntil = request.validUntil,
            features = request.features,
            quotas = request.quotas
        )
        val status = entitlementService.getEntitlements(userId)
        return Response.ok(
            mapOf(
                "message" to "License assigned successfully",
                "plan" to license.planType.name,
                "entitlements" to status
            )
        ).build()
    }

    @DELETE
    @Path("/users/{userId}/license")
    @Operation(summary = "Revoke / reset a user's license to default FREE plan")
    fun revokeLicense(@PathParam("userId") userId: UUID): Response {
        val deactivated = entitlementService.deactivateLicense(userId)
        val status = entitlementService.getEntitlements(userId)
        return Response.ok(
            mapOf(
                "message" to if (deactivated) "License revoked" else "No active license to revoke",
                "entitlements" to status
            )
        ).build()
    }

    @GET
    @Path("/plans")
    @Operation(summary = "Get default plan configurations")
    fun getPlans(): Map<LicensePlan, PlanDefaults> {
        return LicensePlan.entries.associateWith { planConfigurationService.getPlanDefaults(it) }
    }
}
