package de.einfloh.floxboard.payment

import de.einfloh.floxboard.license.domain.LicensePlan
import de.einfloh.floxboard.payment.domain.BillingInterval
import de.einfloh.floxboard.payment.domain.MockCheckoutRequest
import de.einfloh.floxboard.payment.domain.PaymentStatus
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.hamcrest.CoreMatchers.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@QuarkusTest
class PaymentResourceTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @BeforeEach
    fun cleanUp() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/license")

        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")
        given().auth().oauth2(bobToken).`when`().delete("/api/v1/license")
    }

    @Test
    fun testPricingPlansEndpoint() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/payment/plans")
            .then()
            .statusCode(200)
            .body("size()", `is`(3))
            .body("[0].plan", `is`("FREE"))
            .body("[0].monthlyPriceCents", `is`(0))
            .body("[1].plan", `is`("PRO"))
            .body("[1].monthlyPriceCents", `is`(1200))
            .body("[1].yearlyPriceCents", `is`(12000))
            .body("[2].plan", `is`("ENTERPRISE"))
            .body("[2].monthlyPriceCents", `is`(4900))
    }

    @Test
    fun testMockCheckoutProMonthly() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        // Alice is currently FREE
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/license/status")
            .then()
            .statusCode(200)
            .body("plan", `is`("FREE"))

        // Process Mock Checkout for PRO
        val checkoutRequest = MockCheckoutRequest(
            plan = LicensePlan.PRO,
            billingInterval = BillingInterval.MONTHLY,
            paymentMethod = "Mock Visa (•••• 4242)",
            cardholderName = "Alice Doe"
        )

        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(checkoutRequest)
            .`when`().post("/api/v1/payment/checkout")
            .then()
            .statusCode(200)
            .body("plan", `is`("PRO"))
            .body("billingInterval", `is`("MONTHLY"))
            .body("amountCents", `is`(1200))
            .body("currency", `is`("USD"))
            .body("status", `is`("SUCCEEDED"))
            .body("receiptNumber", startsWith("REC-"))

        // Verify license is immediately updated to PRO
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/license/status")
            .then()
            .statusCode(200)
            .body("plan", `is`("PRO"))
    }

    @Test
    fun testMockCheckoutEnterpriseYearlyAndHistory() {
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")

        val checkoutRequest = MockCheckoutRequest(
            plan = LicensePlan.ENTERPRISE,
            billingInterval = BillingInterval.YEARLY,
            paymentMethod = "Mock Mastercard (•••• 5555)",
            cardholderName = "Bob Smith"
        )

        val receiptNumber = given()
            .auth().oauth2(bobToken)
            .contentType(ContentType.JSON)
            .body(checkoutRequest)
            .`when`().post("/api/v1/payment/checkout")
            .then()
            .statusCode(200)
            .body("plan", `is`("ENTERPRISE"))
            .body("billingInterval", `is`("YEARLY"))
            .body("amountCents", `is`(49000))
            .body("status", `is`("SUCCEEDED"))
            .extract().path<String>("receiptNumber")

        // Bob checks history
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/payment/history")
            .then()
            .statusCode(200)
            .body("size()", not(0))
            .body("[0].receiptNumber", `is`(receiptNumber))
            .body("[0].plan", `is`("ENTERPRISE"))
            .body("[0].billingInterval", `is`("YEARLY"))
            .body("[0].amountCents", `is`(49000))
    }

    @Test
    fun testUnauthorizedCheckout() {
        val checkoutRequest = MockCheckoutRequest(
            plan = LicensePlan.PRO,
            billingInterval = BillingInterval.MONTHLY
        )

        given()
            .contentType(ContentType.JSON)
            .body(checkoutRequest)
            .`when`().post("/api/v1/payment/checkout")
            .then()
            .statusCode(401)
    }
}
