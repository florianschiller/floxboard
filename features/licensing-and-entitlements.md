# Licensing, Plans & Entitlements

## Overview
The Licensing & Entitlement system manages tier-based subscription plans, feature gating, quota enforcement, usage ledger tracking, and cryptographically signed license keys.

---

## Subscription Plans & Feature Matrix

| Feature / Limit Key | Description | Status | `FREE` | `PRO` | `TEAM` | `ENTERPRISE` |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `whiteboard:export:svg` | Export board as SVG vector | **Planned** (Toggle Ready) | ✅ | ✅ | ✅ | ✅ |
| `whiteboard:export:png` | Export board as PNG image | **Planned** (Toggle Ready) | ✅ | ✅ | ✅ | ✅ |
| `whiteboard:export:pdf` | Export board as PDF document | **Planned** (Toggle Ready) | ❌ | ✅ | ✅ | ✅ |
| `ai:text_to_diagram` | AI-assisted text-to-diagram generation | **Planned** (Toggle Ready) | ❌ | ✅ | ✅ | ✅ |
| `whiteboard:version_history` | Access board revision history | **Planned** (Toggle Ready) | ❌ | ✅ | ✅ | ✅ |
| `workspace:audit_logs` | Detailed workspace & security audit logs | **Planned** (Toggle Ready) | ❌ | ❌ | ❌ | ✅ |
| **`whiteboards` (Quota)** | Maximum active boards allowed | **Implemented** | 3 | Unlimited (`-1`) | Unlimited (`-1`) | Unlimited (`-1`) |
| **`collaborators_per_board` (Quota)** | Max collaborators on a single board | **Implemented** | 2 | 10 | 50 | Unlimited (`-1`) |
| **`ai:monthly_credits` (Quota)** | Monthly AI generation credits | **Planned** (Toggle Ready) | 0 | 1,000 | 5,000 | 50,000 |

> **Note on Future-Proof Feature Toggles:**  
> The license configuration service (`PlanConfigurationService.kt`) pre-configures feature flags and quota limits for several upcoming capabilities (`whiteboard:export:png`, `whiteboard:export:pdf`, `ai:text_to_diagram`, `whiteboard:version_history`, `workspace:audit_logs`, and `ai:monthly_credits`). These license toggles and entitlement evaluation logic are fully functional and future-proof, but the underlying application features themselves are currently **planned** for future releases.

---

## Key Capabilities

### 1. Entitlement Interceptors & Declarative Security
- **`@RequireFeature("featureKey")`**: CDI interceptor (`RequireFeatureInterceptor.kt`) validating user entitlements before executing backend API methods. Throws `FeatureNotEntitledException` (HTTP 403) on violation.
- **`@RequireQuota("metricKey")`**: CDI interceptor (`RequireQuotaInterceptor.kt`) verifying dynamic usage limits via resolvers (`MetricUsageResolver.kt`) against plan defaults before method execution. Throws `QuotaExceededException` (HTTP 429) on violation.

### 2. Cryptographic License Verification
- **Signed License Keys:** License payloads encoded with cryptographic signatures (HMAC SHA-256 / RSA) containing userId/orgId, plan tier, validity windows, and quota overrides.
- **`LicenseValidator.kt`**: Validates signature authenticity, expiration dates, and key revocation.
- **Activation API (`/api/v1/license/activate` & `/api/v1/license/deactivate`):** Allows users and organizations to apply and revoke license keys.

### 3. Usage Metering & Quota Ledger
- **`UsageLedgerService.kt`**: Records and queries resource consumption events (`QuotaUsageEvent.kt`).
- **Dynamic Usage Resolvers:**
  - `WhiteboardUsageResolvers.kt`: Resolves active board counts and collaborator totals.
  - `AiUsageResolvers.kt`: Tracks credit deductions for AI operations over monthly sliding windows.

### 4. Frontend Feature Gating & Context
- **`entitlementContext.tsx`**: React context providing real-time entitlement state, plan info, active quotas, and feature flags.
- **`<FeatureGate feature="featureKey" fallback={...}>`**: Declarative UI wrapper preventing access to disabled features and rendering upgrade prompts.
- **`LicenseModal.tsx`**: UI dialog for reviewing active plan status and activating new license keys.

---

## Technical Architecture

### Backend Components
- **`PlanConfigurationService.kt`**: Source of truth for default plan definitions, features, and quotas.
- **`EntitlementService.kt`**: Computes consolidated user entitlements merging default plan benefits, license overrides, and usage statistics.
- **`LicenseResource.kt`**: REST endpoints for querying status, activating, and deactivating licenses (`/api/v1/license/*`).
- **`RequireFeature.kt` & `RequireQuota.kt`**: Interceptor binding annotations.

### Frontend Components
- **`FeatureGate.tsx`**: Conditional component rendering based on current user plan.
- **`entitlementContext.tsx`**: Global React provider and `useEntitlement()` hook.
- **`LicenseModal.tsx`**: User-facing license management modal.
