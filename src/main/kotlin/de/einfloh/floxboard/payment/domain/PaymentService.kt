package de.einfloh.floxboard.payment.domain

import de.einfloh.floxboard.license.domain.EntitlementService
import de.einfloh.floxboard.license.domain.LicensePlan
import de.einfloh.floxboard.license.domain.PlanConfigurationService
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.BadRequestException
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@ApplicationScoped
class PaymentService(
    private val paymentTransactionRepository: PaymentTransactionRepository,
    private val entitlementService: EntitlementService,
    private val planConfig: PlanConfigurationService
) {
    companion object {
        private val PRICING_MAP = mapOf(
            LicensePlan.FREE to Pair(0L, 0L),
            LicensePlan.PRO to Pair(1200L, 12000L),
            LicensePlan.TEAM to Pair(2900L, 29000L),
            LicensePlan.ENTERPRISE to Pair(4900L, 49000L)
        )
    }

    fun getPricingPlans(): List<PlanPricingDto> {
        val freeDefaults = planConfig.getPlanDefaults(LicensePlan.FREE)
        val proDefaults = planConfig.getPlanDefaults(LicensePlan.PRO)
        val enterpriseDefaults = planConfig.getPlanDefaults(LicensePlan.ENTERPRISE)

        return listOf(
            PlanPricingDto(
                plan = LicensePlan.FREE,
                name = "Free",
                description = "Essential features for individuals and casual visual thinkers.",
                monthlyPriceCents = 0L,
                yearlyPriceCents = 0L,
                currency = "USD",
                features = freeDefaults.features,
                quotas = freeDefaults.quotas,
                popular = false
            ),
            PlanPricingDto(
                plan = LicensePlan.PRO,
                name = "Pro",
                description = "Unlimited whiteboards, AI diagram generation, and export capabilities for creators.",
                monthlyPriceCents = 1200L,
                yearlyPriceCents = 12000L,
                currency = "USD",
                features = proDefaults.features,
                quotas = proDefaults.quotas,
                popular = true
            ),
            PlanPricingDto(
                plan = LicensePlan.ENTERPRISE,
                name = "Enterprise",
                description = "Advanced security, audit logs, and maximum team collaboration capacity.",
                monthlyPriceCents = 4900L,
                yearlyPriceCents = 49000L,
                currency = "USD",
                features = enterpriseDefaults.features,
                quotas = enterpriseDefaults.quotas,
                popular = false
            )
        )
    }

    @Transactional
    fun processCheckout(ownerId: UUID, request: MockCheckoutRequest): MockCheckoutResponse {
        val pricing = PRICING_MAP[request.plan]
            ?: throw BadRequestException("Unsupported subscription plan: ${request.plan}")

        val amountCents = if (request.billingInterval == BillingInterval.YEARLY) {
            pricing.second
        } else {
            pricing.first
        }

        val validUntil = when {
            request.plan == LicensePlan.FREE -> null
            request.billingInterval == BillingInterval.YEARLY -> Instant.now().plus(365, ChronoUnit.DAYS)
            else -> Instant.now().plus(30, ChronoUnit.DAYS)
        }

        val assignedLicense = entitlementService.assignLicense(
            ownerId = ownerId,
            plan = request.plan,
            validUntil = validUntil
        )

        val receiptNumber = "REC-${Instant.now().epochSecond}-${UUID.randomUUID().toString().take(6).uppercase()}"
        val paymentMethod = request.paymentMethod?.ifBlank { null } ?: "Mock Visa (•••• 4242)"

        val tx = PaymentTransaction().apply {
            this.ownerId = ownerId
            this.plan = request.plan
            this.billingInterval = request.billingInterval
            this.amountCents = amountCents
            this.currency = "USD"
            this.status = PaymentStatus.SUCCEEDED
            this.paymentMethod = paymentMethod
            this.receiptNumber = receiptNumber
            this.licenseId = assignedLicense.id
            this.createdAt = Instant.now()
        }

        paymentTransactionRepository.persist(tx)

        return MockCheckoutResponse(
            transactionId = tx.id,
            receiptNumber = receiptNumber,
            plan = tx.plan,
            billingInterval = tx.billingInterval,
            amountCents = tx.amountCents,
            currency = tx.currency,
            status = tx.status,
            validUntil = validUntil,
            createdAt = tx.createdAt,
            message = "Payment simulated successfully. Plan upgraded to ${request.plan}."
        )
    }

    fun getPaymentHistory(ownerId: UUID): List<PaymentTransactionDto> {
        return paymentTransactionRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId).map { tx ->
            PaymentTransactionDto(
                id = tx.id,
                plan = tx.plan,
                billingInterval = tx.billingInterval,
                amountCents = tx.amountCents,
                currency = tx.currency,
                status = tx.status,
                paymentMethod = tx.paymentMethod,
                receiptNumber = tx.receiptNumber,
                licenseId = tx.licenseId,
                createdAt = tx.createdAt
            )
        }
    }
}
