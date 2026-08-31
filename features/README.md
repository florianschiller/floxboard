# floxBoard Features Catalog

Welcome to the **floxBoard Feature Collection**. This directory contains comprehensive documentation and architectural specifications for all currently implemented features across the backend (Quarkus / Kotlin) and frontend (React / TypeScript) of floxBoard.

---

## 📚 Feature Matrix & Documentation Index

| Module | Feature Document | Key Capabilities | Status | Primary Tech & Components |
| :--- | :--- | :--- | :---: | :--- |
| **01. Whiteboard & Collaboration** | [`whiteboard-collaboration.md`](./whiteboard-collaboration.md) | Real-time infinite canvas, CRDT sync, shapes, multiplayer cursors, board sharing & access requests, JSON import/export | **Implemented** | Yjs, WebSockets, `Whiteboard.tsx`, `WhiteboardCollabSocket.kt` |
| **02. Licensing & Entitlements** | [`licensing-and-entitlements.md`](./licensing-and-entitlements.md) | Multi-tier plans (FREE, PRO, TEAM, ENTERPRISE), cryptographically signed license keys, feature flags, quota metering | **Implemented** | `PlanConfigurationService.kt`, `EntitlementService.kt`, `FeatureGate.tsx` |
| **03. Organization Management** | [`organization-management.md`](./organization-management.md) | Multi-tenant organization support, domain verification, member invitation, org roles, license pools | **Implemented** | Keycloak Organizations, `OrganizationResource.kt`, `OrganizationConsole.tsx` |
| **04. User & Access Management** | [`user-and-access-management.md`](./user-and-access-management.md) | OIDC authentication, RBAC (`user`, `org-admin`, `admin`), custom theme, profile management, admin console | **Implemented** | Keycloak 26, `floxboard-theme`, `AdminConsole.tsx`, `UserResource.kt` |
| **05. Billing & Mock Payments** | [`billing-and-payments.md`](./billing-and-payments.md) | Checkout flows, subscription upgrades, payment transaction logging, automated license issuance | **Implemented** | `PaymentResource.kt`, `PaymentService.kt`, `MockCheckoutModal.tsx` |
| **06. Notifications & Mailer** | [`notifications.md`](./notifications.md) | Asynchronous whiteboard event notifications, access request emails, Quarkus mailer / Mailpit | **Implemented** | Quarkus Mailer, `WhiteboardNotificationListener.kt`, `EmailTemplates.kt` |
| **07. Export & AI Services** | [`export-and-ai-services.md`](./export-and-ai-services.md) | PNG/PDF diagram export, AI text-to-diagram generation, version history, and audit logs (future-proof license toggles) | **Planned** | `PlanConfigurationService.kt`, `RequireFeature`, `AiUsageResolvers.kt` |

---

## 🏛 Architectural Principles

- **Separation of Concerns:** Business logic is decoupled across specialized domain services with JPA/Hibernate Panache persistence.
- **Entitlement Enforced:** Features and quotas are guarded at both API boundaries (`@RequireFeature`, `@RequireQuota`) and UI layers (`<FeatureGate />`).
- **Real-Time Synergy:** State synchronization uses Conflict-free Replicated Data Types (Yjs) over WebSockets with minimal latency.
- **Enterprise-Ready IAM:** Full Keycloak integration supporting OIDC, RBAC, fine-grained client scopes, and organization multi-tenancy.
