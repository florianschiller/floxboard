# floxBoard

floxBoard is a collaborative real-time whiteboard application built with **Quarkus (Kotlin)** on the backend, **React & TypeScript** on the frontend, **Keycloak** for authentication and authorization, and **PostgreSQL** for persistence.

---

## Tech Stack & Architecture

- **Backend:** [Quarkus 3](https://quarkus.io/) (Kotlin, Gradle Kotlin DSL, Hibernate ORM with Panache, Liquibase, WebSockets, OIDC Security)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Quinoa (seamlessly built and served by Quarkus from `src/main/webui/`), Yjs (CRDTs for real-time collaboration)
- **Identity & Access Management:** [Keycloak 26](https://www.keycloak.org/) with custom branded theme `floxboard-theme` (built with [Keycloakify](https://keycloakify.dev/))
- **Database:** PostgreSQL 17
- **Mail Testing:** Mailpit (local SMTP server & web UI)

---

## Prerequisites

Ensure you have the following installed on your machine:

- **Java JDK 21+**
- **Node.js 20+** and **npm**
- **Docker** and **Docker Compose**

---

## Quick Start Guide

### 1. Build the Keycloak Custom Theme (Optional / Initial Setup)

The Keycloak instance mounts a custom theme provider JAR built from `floxboard-theme/`. If you are setting up the repository for the first time or modified the theme:

```bash
cd floxboard-theme
npm install
npm run build-keycloak-theme
cd ..
```

This compiles the React login UI and transactional FreeMarker email templates into `floxboard-theme/dist_keycloak/floxboard-theme.jar`.

### 2. Start Infrastructure Services

Start PostgreSQL, Keycloak (pre-configured with the `quarkus` realm and custom theme), and Mailpit using Docker Compose:

```bash
docker compose up -d
```

> **Tip:** If you ever need to reset Keycloak or the database to a clean state, run `docker compose down -v` followed by `docker compose up -d`.

### 3. Run the Application in Development Mode

Run Quarkus live-reload dev mode:

**On Linux/macOS:**
```bash
./gradlew quarkusDev
```

**On Windows (PowerShell):**
```powershell
.\gradlew.bat quarkusDev
```

Quarkus will automatically build and bundle the frontend UI (`src/main/webui/`) via Quinoa, start WebSocket endpoints, and apply Liquibase database migrations on startup.

---

## Service Endpoints & Tools

| Service | URL | Credentials / Notes |
| :--- | :--- | :--- |
| **floxBoard Application** | [http://localhost:8080](http://localhost:8080) | Main web application |
| **Keycloak Admin Console** | [http://localhost:8090](http://localhost:8090) | Username: `admin` / Password: `admin` |
| **Mailpit Web UI** | [http://localhost:8025](http://localhost:8025) | Local inbox for verification & notification emails |
| **Quarkus Dev UI** | [http://localhost:8080/q/dev/](http://localhost:8080/q/dev/) | Quarkus extension inspector & dev tools |
| **Swagger UI / OpenAPI** | [http://localhost:8080/q/swagger-ui/](http://localhost:8080/q/swagger-ui/) | Interactive REST API documentation |

---

## Pre-configured Demo Accounts

The imported Keycloak realm (`quarkus`) includes ready-to-use demo accounts:

| Email / Username | Password | Roles |
| :--- | :--- | :--- |
| `alice@floxboard.io` | `alice` | `user` |
| `bob@floxboard.io` | `bob` | `user` |
| `charlie@floxboard.io` | `charlie` | `user` |
| `admin@floxboard.io` | `admin` | `user`, `admin` |

---

## Testing & Verification

### Running Backend Tests
Execute the Gradle test suite:

```bash
./gradlew test
```

### Running Frontend Tests
Run Vitest tests in the frontend directory:

```bash
cd src/main/webui
npm test
```

---

## Packaging & Production Build

### Standard Fast-Jar Package
Build the production package:

```bash
./gradlew build
```

The application can then be executed via:

```bash
java -jar build/quarkus-app/quarkus-run.jar
```

### Native Executable
Build a native binary with GraalVM or Docker container:

```bash
./gradlew build -Dquarkus.native.enabled=true -Dquarkus.native.container-build=true
```

Run the resulting executable:

```bash
./build/floxboard-1.0.0-SNAPSHOT-runner
```
