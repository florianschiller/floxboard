package de.einfloh.floxboard.payment.domain

import de.einfloh.floxboard.license.domain.LicensePlan
import de.einfloh.floxboard.license.domain.QuotaDefinition
import java.time.Instant
import java.util.UUID

data class MockCheckoutRequest(
    val plan: LicensePlan,
    val billingInterval: BillingInterval = BillingInterval.MONTHLY,
    val paymentMethod: String? = null,
    val cardholderName: String? = null
)

data class MockCheckoutResponse(
    val transactionId: UUID,
    val receiptNumber: String,
    val plan: LicensePlan,
    val billingInterval: BillingInterval,
    val amountCents: Long,
    val currency: String,
    val status: PaymentStatus,
    val validUntil: Instant?,
    val createdAt: Instant,
    val message: String
)

data class PaymentTransactionDto(
    val id: UUID,
    val plan: LicensePlan,
    val billingInterval: BillingInterval,
    val amountCents: Long,
    val currency: String,
    val status: PaymentStatus,
    val paymentMethod: String,
    val receiptNumber: String,
    val licenseId: UUID?,
    val createdAt: Instant
)

data class PlanPricingDto(
    val plan: LicensePlan,
    val name: String,
    val description: String,
    val monthlyPriceCents: Long,
    val yearlyPriceCents: Long,
    val currency: String = "USD",
    val features: Map<String, Boolean>,
    val quotas: Map<String, QuotaDefinition>,
    val popular: Boolean = false
)
