# Billing & Mock Payments

## Overview
The Billing & Payments module handles subscription upgrades, simulated checkout processing, payment transaction recording, and automated license provisioning upon successful transactions.

---

## Key Capabilities

### 1. Subscription Checkout Flow
- **Plan Selection:** Upgrades from `FREE` to `PRO`, `TEAM`, or `ENTERPRISE` plans.
- **Payment Processing Simulation:** Mock checkout supporting immediate authorization, decline handling, and currency configuration.
- **`MockCheckoutModal.tsx`**: Interactive checkout dialog with card validation, plan summary, and billing terms.

### 2. Automated License Generation & Entitlement Provisioning
- **Transaction Fulfillment:** Upon successful payment confirmation, `PaymentService.kt` automatically issues a signed license key matching the chosen plan tier and associates it with the paying user.
- **Immediate Activation:** The client entitlement context is automatically updated without requiring manual license key entry.

### 3. Payment Transaction Ledger
- **`PaymentTransaction.kt`**: Persistent entity recording transaction ID, user ID, plan type, amount, currency, payment status (`PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`), and timestamp.
- **Billing History API:** REST endpoints allowing users to query past payments and invoices.

---

## Technical Architecture

### Backend Components
- **`PaymentResource.kt`**: REST API endpoints for initiating checkout, processing payments, and querying payment history (`/api/v1/payments/*`).
- **`PaymentService.kt`**: Orchestrates transaction lifecycle, mock payment gateway integration, and automatic license creation.
- **`PaymentTransaction.kt` & `Models.kt`**: JPA Panache entity and DTO definitions.

### Frontend Components
- **`MockCheckoutModal.tsx`**: Checkout dialog with plan pricing and payment form.
- **`lib/api/payment.ts`**: API client for billing endpoints.
