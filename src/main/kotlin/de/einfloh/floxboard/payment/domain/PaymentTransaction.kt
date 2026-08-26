package de.einfloh.floxboard.payment.domain

import de.einfloh.floxboard.license.domain.LicensePlan
import io.quarkus.hibernate.orm.panache.kotlin.PanacheRepositoryBase
import jakarta.enterprise.context.ApplicationScoped
import jakarta.persistence.*
import org.hibernate.annotations.CreationTimestamp
import java.time.Instant
import java.util.UUID

enum class BillingInterval {
    MONTHLY,
    YEARLY
}

enum class PaymentStatus {
    SUCCEEDED,
    FAILED,
    REFUNDED
}

@Entity
@Table(name = "payment_transaction")
class PaymentTransaction {
    @Id
    @Column(name = "id", nullable = false)
    var id: UUID = UUID.randomUUID()

    @Column(name = "owner_id", nullable = false)
    var ownerId: UUID = UUID.randomUUID()

    @Enumerated(EnumType.STRING)
    @Column(name = "plan", nullable = false)
    var plan: LicensePlan = LicensePlan.FREE

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_interval", nullable = false)
    var billingInterval: BillingInterval = BillingInterval.MONTHLY

    @Column(name = "amount_cents", nullable = false)
    var amountCents: Long = 0L

    @Column(name = "currency", nullable = false)
    var currency: String = "USD"

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    var status: PaymentStatus = PaymentStatus.SUCCEEDED

    @Column(name = "payment_method", nullable = false)
    var paymentMethod: String = "Mock Card (•••• 4242)"

    @Column(name = "receipt_number", nullable = false)
    var receiptNumber: String = ""

    @Column(name = "license_id")
    var licenseId: UUID? = null

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
}

@ApplicationScoped
class PaymentTransactionRepository : PanacheRepositoryBase<PaymentTransaction, UUID> {
    fun findByOwnerIdOrderByCreatedAtDesc(ownerId: UUID): List<PaymentTransaction> =
        list("ownerId = ?1 order by createdAt desc", ownerId)
}
