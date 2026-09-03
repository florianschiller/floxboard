# Export, AI Services & Future-Proof Capabilities [PLANNED]

## Overview

> ⚠️ **Status: Planned / Roadmap**  
> The features detailed in this specification are currently **not implemented** in the application UI/backend runtime.
> However, the licensing subsystem (`PlanConfigurationService.kt`), entitlement resolvers, and CDI interceptors
> (`@RequireFeature`, `@RequireQuota`) are already pre-configured to provide **future-proof license toggles** and seamless
> gating when these capabilities are rolled out.

---

## Planned Capabilities & Feature Toggles

### 1. Whiteboard Diagram Asset Export [PLANNED]

- **SVG Export (`whiteboard:export:svg`):** Scalable vector graphic export of whiteboard canvas content utilizing dgm.js
  native SVG generation primitives (pre-configured for `FREE`, `PRO`, `TEAM`, `ENTERPRISE`).  
  *Current State:* Planned.
- **PNG Export (`whiteboard:export:png`):** High-resolution raster image export of current whiteboard canvas contents
  (pre-configured for `FREE`, `PRO`, `TEAM`, `ENTERPRISE`).  
  *Current State:* Planned. Only client-side JSON export/import is currently implemented.
- **PDF Export (`whiteboard:export:pdf`):** Vector PDF document export supporting single-page viewport capture or
  complete multi-page document export (`Doc.pages`) with diagram metadata and bookmarks (pre-configured for `PRO`,
  `TEAM`, and `ENTERPRISE` plans).  
  *Current State:* Planned.

### 2. AI Text-to-Diagram Generation [PLANNED]

- **Natural Language Prompting (`ai:text_to_diagram`):** Generation of flowcharts, architecture diagrams, and structured
  whiteboard shapes directly from textual descriptions.  
  *Current State:* Planned.
- **Quota Metering (`ai:monthly_credits`):**
    - Deducts generation credits based on prompt length and generated element complexity.
    - Quota limits pre-configured in `PlanConfigurationService.kt`: `PRO` (1,000/mo), `TEAM` (5,000/mo), `ENTERPRISE`
      (50,000/mo).
    - *Current State:* Planned. A stub resolver (`MonthlyAiCreditsUsageResolver` in `AiUsageResolvers.kt`) exists to
      demonstrate quota ledger integration.

### 3. Whiteboard Version History & Revisions [PLANNED]

- **Version History (`whiteboard:version_history`):** Point-in-time diagram snapshots and version rollbacks
  (pre-configured for `PRO`, `TEAM`, and `ENTERPRISE` plans; see full functional specification in [
  `whiteboard-advanced-features.md`](./whiteboard-advanced-features.md)).  
  *Current State:* Planned.

### 4. Workspace Security & Audit Logs [PLANNED]

- **Audit Logs (`workspace:audit_logs`):** Detailed organization-wide audit logs for security, board access, and user
  actions (pre-configured for `ENTERPRISE` plan).  
  *Current State:* Planned.

---

## Technical Scaffolding (Future-Proof Architecture)

### Backend Readiness

- **`PlanConfigurationService.kt`**: Contains default plan mappings and feature flag states for all planned features.
- **`RequireFeatureInterceptor.kt` & `@RequireFeature`**: Interceptor framework ready to guard future API endpoints once
  implemented.
- **`RequireQuotaInterceptor.kt` & `@RequireQuota`**: Interceptor framework ready to enforce AI generation credit
  quotas.
- **`AiUsageResolvers.kt`**: Stub metric resolver for `ai:monthly_credits`.

### Frontend Readiness

- **`FeatureGate.tsx`**: Declarative `<FeatureGate feature="..." />` component ready to conditionally show/hide UI
  triggers and show upgrade modals based on entitlements.
