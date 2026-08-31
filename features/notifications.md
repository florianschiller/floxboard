# Notifications & Email System

## Overview
The Notification system provides asynchronous event-driven email notifications for board collaboration events, access requests, user invitations, and system alerts.

---

## Key Capabilities

### 1. Asynchronous Event-Driven Architecture
- **CDI Domain Events:** Decoupled whiteboard lifecycle events dispatched through CDI event publishers:
  - `WhiteboardCreatedEvent`
  - `CollaboratorAddedEvent`
  - `AccessRequestedEvent`
  - `AccessApprovedEvent`
- **`WhiteboardNotificationListener.kt`**: Observes whiteboard events asynchronously to prepare and dispatch notifications without blocking active HTTP or WebSocket requests.

### 2. Transactional Email Delivery
- **Quarkus Mailer Integration:** Built on Vert.x Mail Client with reactive non-blocking delivery.
- **Development & Testing:** Integrated with **Mailpit** (`http://localhost:8025`) for zero-configuration local SMTP testing without sending real external emails.
- **Production Support:** Configurable TLS/STARTTLS SMTP parameters (SendGrid, Postmark, AWS SES) in `application.yaml`.

### 3. Branded Email Templates
- **`EmailTemplates.kt`**: HTML and plain text email templates formatted with floxBoard branding and direct action links.
- **`floxboard-theme/`**: FreeMarker email templates for Keycloak auth actions (email verification, password reset, login confirmation).

---

## Technical Architecture

### Backend Components
- **`WhiteboardNotificationListener.kt`**: CDI event listener observing whiteboard actions.
- **`EmailNotificationPort.kt`**: Outbound port interface for notification dispatching.
- **`QuarkusMailerAdapter.kt`**: Infrastructure adapter implementing email sending via Quarkus Mailer.
- **`EmailTemplates.kt`**: Template builders for transactional notification emails.
- **`WhiteboardEvents.kt`**: Event payload definitions.
