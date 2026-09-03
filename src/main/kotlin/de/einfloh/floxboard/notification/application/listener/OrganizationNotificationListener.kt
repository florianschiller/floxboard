package de.einfloh.floxboard.notification.application.listener

import de.einfloh.floxboard.notification.application.port.out.EmailNotificationPort
import de.einfloh.floxboard.organization.domain.events.OrganizationMemberInvitedEvent
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.event.ObservesAsync
import org.jboss.logging.Logger

@ApplicationScoped
class OrganizationNotificationListener(
    private val emailNotificationPort: EmailNotificationPort
) {
    private val log = Logger.getLogger(OrganizationNotificationListener::class.java)

    fun onOrganizationMemberInvited(@ObservesAsync event: OrganizationMemberInvitedEvent) {
        log.infof("Processing OrganizationMemberInvitedEvent for %s in organization %s", event.recipientEmail, event.organizationId)
        emailNotificationPort.sendOrganizationInvite(
            recipientEmail = event.recipientEmail,
            recipientUsername = event.recipientUsername,
            organizationId = event.organizationId,
            organizationName = event.organizationName,
            role = event.role.name
        ).subscribe().with(
            { log.debugf("Organization invite sent to %s", event.recipientEmail) },
            { ex -> log.errorf(ex, "Failed to send organization invite to %s", event.recipientEmail) }
        )
    }
}
