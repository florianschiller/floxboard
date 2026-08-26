# Plan: User Context Menu & Account Management (Hybrid Approach)

## Requirements

### Overview & Goals
Provide a centralized, intuitive **User Context Menu** and **Account Management Modal** within floxBoard. Authenticated users can view and manage their account details, update their personal profile (first name and last name directly via backend endpoint), initiate secure Keycloak authentication flows directly in the frontend (password reset and email change via Keycloak OIDC `kc_action` redirect flows), and inspect/update their license subscription and quota entitlements.

---

### Scope
- **In Scope:**
  - **User Context Menu Dropdown**: Interactive menu triggered from the user avatar/pill in the top navigation bar across all views (main dashboard and whiteboard canvas).
  - **Account & Profile Modal**:
    - **Profile Overview & Direct Editing**: Display user details (username, user ID, email address, email verification status, roles) and allow inline editing of `firstName` and `lastName` saved directly via backend API.
    - **Security & Keycloak Action Redirects (Hybrid Approach)**: Direct frontend triggers via Keycloak OIDC flows (`kc_action=UPDATE_PASSWORD` and `kc_action=UPDATE_EMAIL`), navigating the user to Keycloak's dedicated action forms and redirecting back seamlessly.
    - **License & Entitlements Management**: Integrated view of current subscription tier (`FREE`, `PRO`, `TEAM`, `ENTERPRISE`), validity period, quota usages (whiteboards, collaborators, AI credits), feature entitlements, and ability to activate/deactivate license keys.
  - **Backend REST API (`UserResource.kt`)**:
    - `GET /api/v1/user/me`: Fetch authenticated user's profile details.
    - `PUT /api/v1/user/me`: Update first and last name in Keycloak via Keycloak Admin Client.
  - **Backend Service Extensions (`UserService.kt`)**:
    - Integration with Keycloak Admin Client (`UsersResource`) to fetch and update user profile fields (`firstName`, `lastName`).
  - **Frontend Integration (`auth.tsx`, `api.ts`, UI)**:
    - Helper methods in `auth.tsx` for `triggerPasswordReset()` and `triggerEmailChange()` using `signinRedirect` with `extraQueryParams: { kc_action: ... }`.
    - New `UserContextMenu.tsx` component.
    - New `AccountModal.tsx` component with tabbed navigation ("Profile & Account", "License & Subscription").
    - Integration with `useAuth` (`auth.tsx`) and `useEntitlements` (`entitlementContext.tsx`).
    - Update `WhiteboardHeader.tsx` and `App.tsx` to mount the user context menu.
- **Out of Scope:**
  - Backend proxying for password/email action emails (replaced by direct Keycloak OIDC action flows).
  - Administrative user impersonation or managing other users' credentials.
  - Self-service account deletion (managed via Keycloak realm policies).

---

### User Stories
- **US-1: Context Menu Access**: As an authenticated user, I want to click on my profile pill/avatar in the header to view a quick summary and access settings or log out.
- **US-2: View Account Details**: As a user, I want to view my account details (username, ID, email, verification status) in a dedicated dialog so that I know my current account status.
- **US-3: Direct Profile Update**: As a user, I want to edit my first name and last name directly in floxBoard so that my display name stays current across collaborative boards.
- **US-4: Password Update via Keycloak Flow**: As a user, I want to click "Change Password" in floxBoard and be redirected to Keycloak's secure password change form, returning back to floxBoard upon completion.
- **US-5: Email Update via Keycloak Flow**: As a user, I want to click "Change Email" and complete Keycloak's verified email change workflow directly.
- **US-6: License & Subscription Management**: As a user, I want to view my plan quotas and activate a new license key directly from my account settings so that I can upgrade my workspace.

---

### Functional Requirements
- **FR-1: User Context Menu UI**:
  - Displays user avatar, full name/username, email, and current subscription plan badge.
  - Menu actions:
    - **"Account & Profile"**: Opens the Account Modal (Profile tab).
    - **"License & Subscription"**: Opens the Account Modal (License tab).
    - **"Log Out"**: Calls OIDC sign-out redirect.
  - Smooth open/close behavior, keyboard navigation (`Escape` to close), and outside click dismissal.
- **FR-2: Profile & Account Management**:
  - `GET /api/v1/user/me` returns: `id`, `username`, `email`, `firstName`, `lastName`, `emailVerified`, `realmRoles`.
  - Editable fields: `firstName` and `lastName` (validated for length and characters).
  - Saving sends `PUT /api/v1/user/me`, updating Keycloak user representation and refreshing local user display without requiring full re-login.
- **FR-3: Password Reset Keycloak Action Flow (Frontend Direct)**:
  - Action button: "Change Password".
  - Triggers OIDC redirect with `kc_action=UPDATE_PASSWORD` and returns to `window.location.href`.
- **FR-4: Email Change Keycloak Action Flow (Frontend Direct)**:
  - Action button: "Change Email".
  - Triggers OIDC redirect with `kc_action=UPDATE_EMAIL` and returns to `window.location.href`.
- **FR-5: License & Subscription Management Tab**:
  - Integrates existing `LicenseModal` capabilities into the unified Account Modal.
  - Displays tier badge (`FREE`, `PRO`, `TEAM`, `ENTERPRISE`), validity date, quota usage bars (`whiteboards`, `collaborators_per_board`, `ai:monthly_credits`), and feature toggles.
  - Input field for entering and activating signed license keys (`POST /api/v1/license/activate`).
  - Button to deactivate custom license and revert to default Free plan (`DELETE /api/v1/license`).

---

### Non-Functional Requirements
- **Security**: All backend endpoints protected by `@Authenticated` and JWT subject verification (users can only access/modify their own profile). Credential updates (password/email) remain protected under Keycloak's secure lifecycle.
- **Responsiveness**: Modals and dropdowns adapt to mobile and desktop screens with dark-themed Tailwind CSS styling matching floxBoard's design system.
- **Resilience**: Clear error reporting when backend or Keycloak is temporarily unreachable.

---

## Technical Design

### Architecture Overview

```mermaid
graph TD
  UI[User Context Menu / Account Modal] -->|PUT /api/v1/user/me (Profile Edit)| Backend[Quarkus Backend: UserResource]
  UI -->|OIDC kc_action Redirect (Password/Email)| KC[(Keycloak Server)]
  UI -->|License REST API| BackendLic[LicenseResource]
  Backend -->|Admin REST API| KC
  Backend -->|Panache ORM| DB[(PostgreSQL)]
  KC -->|OIDC Tokens & Return Redirect| UI
```

---

### Backend Design

#### 1. Endpoints (`de.einfloh.floxboard.user.api.UserResource.kt`)
- `@Path("/api/v1/user/me")`
  - `GET`: Returns `UserProfileDto`.
  - `PUT`: Accepts `UpdateProfileRequest(firstName, lastName)` and returns updated `UserProfileDto`.

#### 2. DTO Models
```kotlin
data class UserProfileDto(
    val id: UUID,
    val username: String,
    val email: String,
    val firstName: String?,
    val lastName: String?,
    val emailVerified: Boolean,
    val roles: List<String>
)

data class UpdateProfileRequest(
    val firstName: String?,
    val lastName: String?
)
```

#### 3. Service Layer (`de.einfloh.floxboard.whiteboard.domain.UserService.kt`)
Extend `UserService` with:
- `getUserProfile(userId: UUID): UserProfileDto`
- `updateUserProfile(userId: UUID, firstName: String?, lastName: String?): UserProfileDto`
  ```kotlin
  val userResource = keycloak.realm(realm).users().get(userId.toString())
  val user = userResource.toRepresentation()
  user.firstName = firstName
  user.lastName = lastName
  userResource.update(user)
  ```

---

### Frontend Design

#### 1. Auth Hook Extensions (`src/main/webui/src/lib/auth.tsx`)
Expose Keycloak action redirect handlers:
```typescript
triggerPasswordReset: () => auth.signinRedirect({
  redirect_uri: window.location.href,
  extraQueryParams: { kc_action: 'UPDATE_PASSWORD' }
}),
triggerEmailChange: () => auth.signinRedirect({
  redirect_uri: window.location.href,
  extraQueryParams: { kc_action: 'UPDATE_EMAIL' }
})
```

#### 2. API Client (`src/main/webui/src/lib/api.ts`)
Add methods:
- `getUserProfile(): Promise<UserProfile>`
- `updateUserProfile(firstName: string, lastName: string): Promise<UserProfile>`

#### 3. Components
- `src/main/webui/src/components/UserContextMenu.tsx`:
  - Avatar trigger with user initials or image.
  - Dropdown containing user identity summary, plan badge, links to "Account & Profile", "License & Subscription", and "Log Out".
- `src/main/webui/src/components/AccountModal.tsx`:
  - Tab 1: **Profile & Security**
    - User details (Username, Email, Email Verified status).
    - Editable First Name and Last Name with validation and Save button.
    - Security section with "Change Password" and "Change Email" redirect action buttons.
  - Tab 2: **License & Quotas**
    - Plan tier, expiration date, quota meters, license key activation form, and license deactivation.
- Update `WhiteboardHeader.tsx` and `App.tsx` to replace standalone logout/license buttons with the unified `UserContextMenu`.

---

## Step-by-Step Implementation Plan

### Phase 1: Backend Implementation
- [ ] Create `UserProfileDto` and `UpdateProfileRequest` in `de.einfloh.floxboard.user.api.Models.kt`.
- [ ] Extend `UserService.kt` with `getUserProfile` and `updateUserProfile`.
- [ ] Implement `UserResource.kt` exposing `GET /api/v1/user/me` and `PUT /api/v1/user/me`.
- [ ] Write Quarkus integration tests in `UserResourceTest.kt` verifying profile fetch and name updates.

### Phase 2: Frontend API & Auth Extension
- [ ] Extend `AuthContextType` and `auth.tsx` with `triggerPasswordReset` and `triggerEmailChange` using `extraQueryParams: { kc_action: ... }`.
- [ ] Define `UserProfile` interface and user API functions (`getUserProfile`, `updateUserProfile`) in `src/main/webui/src/lib/api.ts`.

### Phase 3: UI Components
- [ ] Implement `AccountModal.tsx` with Profile tab (details + name editing + Keycloak action triggers) and License tab (quotas + key activation/deactivation).
- [ ] Implement `UserContextMenu.tsx` with avatar trigger, plan badge, navigation links, and logout.
- [ ] Update `WhiteboardHeader.tsx` and `App.tsx` to integrate `UserContextMenu` and `AccountModal`.

### Phase 4: Verification & Testing
- [ ] Test user profile fetching and editing in web UI.
- [ ] Verify password reset and email change redirect to Keycloak flows and return to floxBoard.
- [ ] Verify license inspection and key activation within the Account modal.
- [ ] Run backend tests (`./gradlew test`) and frontend tests (`npm test`).
