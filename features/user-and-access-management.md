# User & Access Management (IAM / RBAC)

## Overview
User and Access Management in floxBoard leverages Keycloak as an OpenID Connect (OIDC) identity provider and provides role-based access control (RBAC), user profile management, administrative tooling, and custom theming.

---

## Key Capabilities

### 1. Authentication & OpenID Connect (OIDC)
- **OIDC Flow:** Secured via Keycloak client configurations (`flox-frontend` for public SPA access, `flox-backend` with client credentials for service accounts).
- **Session & Token Management:** JWT access tokens containing user subject, email, names, and realm access roles (`realm_access.roles`).
- **Required Actions & Security:**
  - `CONFIGURE_TOTP`: Two-factor authentication configuration.
  - `UPDATE_PASSWORD`: Password reset and forced credential update.
  - `UPDATE_PROFILE`: First-login profile completion.
  - `VERIFY_EMAIL` & `UPDATE_EMAIL`: Email verification workflows.

### 2. Role-Based Access Control (RBAC)
- **`user`**: Standard authenticated user capable of creating whiteboards, collaborating, managing personal licenses.
- **`org-admin`**: Organization administrator capable of managing tenant members, domain settings, and organization license pools.
- **`admin`**: Platform administrator with full access to global tenant management, user directories, and system configuration.

### 3. Custom FloxBoard Keycloak Theme
- **`floxboard-theme/`**: Built with [Keycloakify](https://keycloakify.dev/) and React/Tailwind.
- **Components & Templates:**
  - Custom branded login, registration, password reset, and account management screens.
  - Transactional FreeMarker email templates branded with floxBoard design tokens.

### 4. Admin Console & User Management
- **`AdminConsole.tsx` & `UsersTab.tsx`**: Platform administration interface for listing registered users, inspecting roles, and searching users.
- **`AssignLicenseModal.tsx`**: Direct manual assignment of custom plan tiers and license keys to specific users.
- **`AccountModal.tsx`**: End-user account settings dialog for viewing personal details and identity info.

---

## Technical Architecture

### Backend Components
- **`UserResource.kt`**: Current user profile and lookup endpoints (`/api/v1/users/*`).
- **`AdminResource.kt`**: Administrative user listing and role management endpoints (`/api/v1/admin/*`).
- **`UserService.kt`**: Domain service for querying user details and synchronizing profile changes.
- **`application.yaml`**: Keycloak OIDC and Admin Client properties.

### Frontend Components
- **`auth.tsx`**: React authentication provider, OIDC token storage, and login/logout handlers.
- **`AdminConsole.tsx`**: Platform management dashboard.
- **`AccountModal.tsx`**: User profile and account dialog.
- **`UsersTab.tsx` & `AssignLicenseModal.tsx`**: Admin user inspection and license assignment UI.
