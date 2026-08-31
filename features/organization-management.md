# Organization & Multi-Tenancy Management

## Overview
The Organization module provides multi-tenancy support integrated directly with Keycloak's Organization feature (`KC_FEATURES: organization`). It enables enterprise workspaces, custom domain routing, member lifecycle management, role delegation, and pooled seat licensing.

---

## Key Capabilities

### 1. Keycloak Organization Integration
- **DevServices & Server Configuration:** Configured in `application.yaml` with Keycloak 26 organization extensions enabled.
- **Realm Pre-seeding (`quarkus-realm.json`):** Pre-loaded with demo organizations:
  - **Acme Corp (`acme-corp`)**: Managed domain `acme.com` (Members: Dave [Admin], Frank [Admin], Bob [User]).
  - **Stark Industries (`stark-industries`)**: Managed domain `stark.com` (Members: Eve [Admin], Frank [Admin], Charlie [User]).

### 2. Organization Administration & Lifecycles
- **Organization Provisioning:** Create organizations with unique slugs/aliases, descriptions, and verified email domains.
- **Domain Verification:** Auto-linking and SSO onboarding for users authenticating with company domain emails.
- **Member Management:**
  - Invitation workflow with role selection (`org-admin` vs. standard member).
  - Member search, invitation revoking, role promotion/demotion, and removal.
  - Pending invitations tab and audit list.

### 3. Organization License Pools
- **Shared Seat Allocation:** Assign enterprise/team subscription licenses to organizations rather than individual users.
- **Seat Utilization Tracking:** Real-time visibility into allocated vs. available collaborator seats across organization boards.

---

## Technical Architecture

### Backend Components
- **`AdminOrganizationResource.kt`**: REST endpoints for platform administrators to manage tenant organizations (`/api/v1/admin/organizations/*`).
- **`OrganizationResource.kt`**: REST endpoints for organization admins to manage their own org settings, domains, and members (`/api/v1/organizations/*`).
- **`OrganizationService.kt`**: Keycloak Admin Client integration handling organization entities, domain bindings, and member memberships.
- **`Entities.kt` & `Models.kt`**: Domain models representing Organization, OrgMember, OrgInvitation, and LicensePool entities.

### Frontend Components
- **`OrganizationConsole.tsx`**: Main organization management dashboard.
- **`OrganizationsTab.tsx`**: Overview list of managed organizations.
- **`OrgMembersTab.tsx`**: Member roster with role management and removal actions.
- **`OrgPendingTab.tsx`**: Outstanding member invitations.
- **`OrgLicensePoolsTab.tsx`**: License allocation and seat usage metrics.
- **`CreateOrganizationModal.tsx` & `InviteMemberModal.tsx`**: Creation and invitation dialogs.
- **`OrganizationDetailDrawer.tsx`**: Drawer showing deep organization metadata and configuration.
