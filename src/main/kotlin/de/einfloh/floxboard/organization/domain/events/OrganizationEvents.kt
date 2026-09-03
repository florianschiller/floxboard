package de.einfloh.floxboard.organization.domain.events

import de.einfloh.floxboard.organization.domain.OrgMemberRole

data class OrganizationMemberInvitedEvent(
    val organizationId: String,
    val organizationName: String,
    val recipientEmail: String,
    val recipientUsername: String,
    val role: OrgMemberRole
)
