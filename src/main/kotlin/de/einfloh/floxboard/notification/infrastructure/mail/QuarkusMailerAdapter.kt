package de.einfloh.floxboard.notification.infrastructure.mail

import de.einfloh.floxboard.notification.application.port.out.EmailNotificationPort
import de.einfloh.floxboard.notification.infrastructure.templates.EmailTemplates
import io.quarkus.mailer.Mail
import io.quarkus.mailer.reactive.ReactiveMailer
import io.smallrye.mutiny.Uni
import jakarta.enterprise.context.ApplicationScoped
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.jboss.logging.Logger
import java.util.UUID

@ApplicationScoped
class QuarkusMailerAdapter(
    private val reactiveMailer: ReactiveMailer,
    @param:ConfigProperty(name = "floxboard.app.base-url", defaultValue = "http://localhost:8080")
    private val baseUrl: String
) : EmailNotificationPort {

    private val log = Logger.getLogger(QuarkusMailerAdapter::class.java)

    private fun isValidEmail(email: String): Boolean {
        return email.isNotBlank() && email.contains("@") && !email.contains(" ")
    }

    override fun sendCollaboratorInvite(
        recipientEmail: String,
        recipientUsername: String,
        whiteboardId: UUID,
        whiteboardName: String,
        role: String
    ): Uni<Void> {
        if (!isValidEmail(recipientEmail)) {
            log.warnf("Skipping collaborator invite email: invalid recipient email address '%s'", recipientEmail)
            return Uni.createFrom().voidItem()
        }

        val boardUrl = "$baseUrl/board/$whiteboardId"
        val htmlBody = EmailTemplates.collaboratorInvite(
            username = recipientUsername,
            whiteboardName = whiteboardName,
            role = role,
            boardUrl = boardUrl
        )

        val mail = try {
            Mail.withHtml(
                recipientEmail,
                "Invitation to collaborate on '$whiteboardName'",
                htmlBody
            )
        } catch (ex: Exception) {
            log.errorf(ex, "Failed to construct invite email for %s", recipientEmail)
            return Uni.createFrom().voidItem()
        }

        return reactiveMailer.send(mail)
            .onFailure().recoverWithItem { ex ->
                log.errorf(ex, "Failed to deliver invite email to %s", recipientEmail)
                null
            }
    }

    override fun sendAccessRequestNotification(
        recipientEmail: String,
        recipientUsername: String,
        whiteboardId: UUID,
        whiteboardName: String,
        approved: Boolean,
        role: String?
    ): Uni<Void> {
        if (!isValidEmail(recipientEmail)) {
            log.warnf("Skipping access request resolution email: invalid recipient email address '%s'", recipientEmail)
            return Uni.createFrom().voidItem()
        }

        val boardUrl = "$baseUrl/board/$whiteboardId"
        val htmlBody = EmailTemplates.accessRequestResolved(
            username = recipientUsername,
            whiteboardName = whiteboardName,
            approved = approved,
            role = role,
            boardUrl = boardUrl
        )

        val subject = if (approved) {
            "Access Request Approved: $whiteboardName"
        } else {
            "Access Request Rejected: $whiteboardName"
        }

        val mail = try {
            Mail.withHtml(
                recipientEmail,
                subject,
                htmlBody
            )
        } catch (ex: Exception) {
            log.errorf(ex, "Failed to construct access request email for %s", recipientEmail)
            return Uni.createFrom().voidItem()
        }

        return reactiveMailer.send(mail)
            .onFailure().recoverWithItem { ex ->
                log.errorf(ex, "Failed to deliver access request resolution email to %s", recipientEmail)
                null
            }
    }
}
