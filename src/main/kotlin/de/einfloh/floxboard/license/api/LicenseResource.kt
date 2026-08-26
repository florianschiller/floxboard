package de.einfloh.floxboard.license.api

import de.einfloh.floxboard.license.domain.EntitlementService
import de.einfloh.floxboard.license.domain.EntitlementStatusResponse
import io.quarkus.security.Authenticated
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.*

data class ActivateLicenseRequest(
    val licenseKey: String
)

@Path("/api/v1/license")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "License", description = "Licensing and Entitlement APIs")
class LicenseResource(
    private val entitlementService: EntitlementService,
    private val jwt: JsonWebToken
) {
    private fun getUserId(): UUID {
        val subject = jwt.subject ?: throw WebApplicationException("Subject is missing", 401)
        return UUID.fromString(subject)
    }

    @GET
    @Path("/status")
    @Operation(summary = "Get active entitlement status, plan, quotas and features for current user")
    fun getStatus(): EntitlementStatusResponse {
        return entitlementService.getEntitlements(getUserId())
    }

    @POST
    @Path("/activate")
    @Operation(summary = "Activate a signed license key for current user")
    fun activate(request: ActivateLicenseRequest): Response {
        val license = entitlementService.activateLicense(getUserId(), request.licenseKey)
        val status = entitlementService.getEntitlements(getUserId())
        return Response.ok(
            mapOf(
                "message" to "License activated successfully",
                "plan" to license.planType.name,
                "entitlements" to status
            )
        ).build()
    }

    @DELETE
    @Operation(summary = "Deactivate/revoke current active license")
    fun deactivate(): Response {
        val deactivated = entitlementService.deactivateLicense(getUserId())
        val status = entitlementService.getEntitlements(getUserId())
        return Response.ok(
            mapOf(
                "message" to if (deactivated) "License deactivated" else "No active license to deactivate",
                "entitlements" to status
            )
        ).build()
    }
}
