package de.einfloh.floxboard.ai.api

import de.einfloh.floxboard.ai.domain.AiCreditEstimateRequest
import de.einfloh.floxboard.ai.domain.AiDiagramRequest
import de.einfloh.floxboard.ai.domain.AiDiagramService
import de.einfloh.floxboard.license.interceptors.RequireFeature
import io.quarkus.security.Authenticated
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.UUID

@Path("/api/v1/ai")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "AI Services", description = "AI text-to-diagram synthesis and quota metering")
class AiDiagramResource(
    private val aiDiagramService: AiDiagramService,
    private val jwt: JsonWebToken
) {

    private fun getUserId(): UUID {
        val subject = jwt.subject ?: throw WebApplicationException("Subject is missing", 401)
        return UUID.fromString(subject)
    }

    @POST
    @Path("/text-to-diagram")
    @RequireFeature("ai:text_to_diagram")
    @Operation(summary = "Generate structured whiteboard diagram shapes from prompt")
    fun generateDiagram(request: AiDiagramRequest): Response {
        val response = aiDiagramService.generateDiagram(getUserId(), request)
        return Response.ok(response).build()
    }

    @POST
    @Path("/credits/estimate")
    @RequireFeature("ai:text_to_diagram")
    @Operation(summary = "Estimate credit consumption for AI diagram generation")
    fun estimateCredits(request: AiCreditEstimateRequest): Response {
        val response = aiDiagramService.estimateCredits(getUserId(), request)
        return Response.ok(response).build()
    }

    @GET
    @Path("/credits/balance")
    @Operation(summary = "Get current monthly AI credit balance and quota status")
    fun getCreditBalance(): Response {
        val response = aiDiagramService.getQuotaBalance(getUserId())
        return Response.ok(response).build()
    }
}
