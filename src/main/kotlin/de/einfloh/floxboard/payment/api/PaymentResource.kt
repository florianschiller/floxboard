package de.einfloh.floxboard.payment.api

import de.einfloh.floxboard.payment.domain.MockCheckoutRequest
import de.einfloh.floxboard.payment.domain.PaymentService
import io.quarkus.security.Authenticated
import jakarta.annotation.security.PermitAll
import jakarta.ws.rs.*
import jakarta.ws.rs.core.MediaType
import jakarta.ws.rs.core.Response
import org.eclipse.microprofile.jwt.JsonWebToken
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.tags.Tag
import java.util.UUID

@Path("/api/v1/payment")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
@Tag(name = "Payment", description = "Mocked Payment and Subscription Checkout APIs")
class PaymentResource(
    private val paymentService: PaymentService,
    private val jwt: JsonWebToken
) {
    private fun getUserId(): UUID {
        val subject = jwt.subject ?: throw WebApplicationException("Subject is missing", 401)
        return UUID.fromString(subject)
    }

    @GET
    @Path("/plans")
    @Operation(summary = "Get available pricing plans and feature comparisons")
    fun getPlans(): Response {
        val plans = paymentService.getPricingPlans()
        return Response.ok(plans).build()
    }

    @POST
    @Path("/checkout")
    @Operation(summary = "Process a simulated mock payment and upgrade user subscription")
    fun checkout(request: MockCheckoutRequest): Response {
        val result = paymentService.processCheckout(getUserId(), request)
        return Response.ok(result).build()
    }

    @GET
    @Path("/history")
    @Operation(summary = "Get payment transaction history and receipts for current user")
    fun getHistory(): Response {
        val history = paymentService.getPaymentHistory(getUserId())
        return Response.ok(history).build()
    }
}
