package de.einfloh.floxboard.whiteboard.domain

import de.einfloh.floxboard.organization.domain.OrganizationMemberRoleRepository
import de.einfloh.floxboard.user.api.UserProfileDto
import jakarta.enterprise.context.ApplicationScoped
import jakarta.ws.rs.WebApplicationException
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.keycloak.admin.client.Keycloak
import org.keycloak.representations.idm.UserRepresentation
import java.util.UUID

data class UserInfo(
    val id: UUID,
    val email: String,
    val username: String
)

@ApplicationScoped
class UserService(
    private val keycloak: Keycloak,
    private val orgMemberRoleRepository: OrganizationMemberRoleRepository,
    @param:ConfigProperty(name = "quarkus.keycloak.admin-client.realm", defaultValue = "quarkus")
    private val realm: String
) {
    fun findUserByEmailOrUsername(query: String): UserInfo? {
        val fromKeycloak = try {
            val usersResource = keycloak.realm(realm).users()
            val list = try {
                usersResource.search(query, 0, 10)
            } catch (e: Exception) {
                emptyList()
            }
            val user = list.firstOrNull { 
                (it.username != null && it.username.equals(query, ignoreCase = true)) || 
                (it.email != null && it.email.equals(query, ignoreCase = true)) ||
                it.id.equals(query, ignoreCase = true)
            } ?: list.firstOrNull() ?: try {
                usersResource.searchByUsername(query, true).firstOrNull()
            } catch (e: Exception) {
                null
            } ?: try {
                usersResource.searchByEmail(query, true).firstOrNull()
            } catch (e: Exception) {
                null
            }

            user?.let {
                UserInfo(
                    id = UUID.fromString(it.id),
                    email = it.email ?: it.username ?: query,
                    username = it.username ?: it.email ?: query
                )
            }
        } catch (e: Exception) {
            null
        }

        if (fromKeycloak != null) return fromKeycloak

        // Fallback: Check if query is a UUID
        return try {
            val uuid = UUID.fromString(query)
            UserInfo(id = uuid, email = query, username = query)
        } catch (ex: Exception) {
            null
        }
    }

    fun searchUsers(query: String, callerUserId: UUID? = null): List<UserInfo> {
        if (callerUserId != null) {
            val callerRoles = orgMemberRoleRepository.findByUserId(callerUserId)
            val callerOrgIds = if (callerRoles.isNotEmpty()) {
                callerRoles.map { it.organizationId }.distinct()
            } else {
                try {
                    val keycloakOrgs = keycloak.realm(realm).organizations().members().getOrganizations(callerUserId.toString())
                    if (keycloakOrgs.isNotEmpty()) {
                        keycloakOrgs.mapNotNull { it.id }
                    } else {
                        val allOrgs = keycloak.realm(realm).organizations().list(0, 100)
                        allOrgs.filter { orgRep ->
                            val members = try {
                                val orgResource = keycloak.realm(realm).organizations().get(orgRep.id)
                                val list = orgResource.members().list(0, 100)
                                if (list.isNotEmpty()) list else orgResource.members().all
                            } catch (e: Exception) {
                                emptyList()
                            }
                            members.any { it.id == callerUserId.toString() || it.username == callerUserId.toString() }
                        }.mapNotNull { it.id }
                    }
                } catch (e: Exception) {
                    emptyList()
                }
            }

            if (callerOrgIds.isNotEmpty()) {
                val allMembers = mutableListOf<UserRepresentation>()
                for (orgId in callerOrgIds) {
                    val orgMembers = try {
                        val orgResource = keycloak.realm(realm).organizations().get(orgId)
                        val list = orgResource.members().list(0, 100)
                        if (list.isNotEmpty()) list else orgResource.members().all
                    } catch (e: Exception) {
                        emptyList()
                    }
                    allMembers.addAll(orgMembers)
                }

                val distinctMembers = allMembers.distinctBy { it.id ?: it.username ?: it.email }
                val q = query.trim().lowercase()
                val filtered = if (q.isBlank()) {
                    distinctMembers
                } else {
                    distinctMembers.filter { member ->
                        member.username?.lowercase()?.contains(q) == true ||
                        member.email?.lowercase()?.contains(q) == true ||
                        member.firstName?.lowercase()?.contains(q) == true ||
                        member.lastName?.lowercase()?.contains(q) == true ||
                        member.id?.lowercase()?.contains(q) == true
                    }
                }

                return filtered.mapNotNull { userRep ->
                    try {
                        UserInfo(
                            id = UUID.fromString(userRep.id),
                            email = userRep.email ?: userRep.username ?: userRep.id,
                            username = userRep.username ?: userRep.email ?: userRep.id
                        )
                    } catch (e: Exception) {
                        null
                    }
                }
            }
        }

        if (query.isBlank()) return emptyList()
        val q = query.trim().lowercase()
        return try {
            val usersResource = keycloak.realm(realm).users()
            val list = mutableListOf<UserRepresentation>()
            try {
                list.addAll(usersResource.searchByUsername(query, false))
            } catch (e: Exception) {
                // ignore
            }
            try {
                list.addAll(usersResource.search(query, 0, 20))
            } catch (e: Exception) {
                // ignore
            }
            try {
                list.addAll(usersResource.searchByEmail(query, false))
            } catch (e: Exception) {
                // ignore
            }
            if (list.isEmpty()) {
                try {
                    val all = usersResource.list(0, 100)
                    list.addAll(all.filter {
                        it.username?.lowercase()?.contains(q) == true ||
                        it.email?.lowercase()?.contains(q) == true ||
                        it.id?.lowercase()?.contains(q) == true
                    })
                } catch (e: Exception) {
                    // ignore
                }
            }
            list.distinctBy { it.id }.mapNotNull { userRep ->
                try {
                    UserInfo(
                        id = UUID.fromString(userRep.id),
                        email = userRep.email ?: userRep.username ?: userRep.id,
                        username = userRep.username ?: userRep.email ?: userRep.id
                    )
                } catch (e: Exception) {
                    null
                }
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun findUserById(id: UUID): UserInfo? {
        return try {
            val user = keycloak.realm(realm).users().get(id.toString()).toRepresentation()
            UserInfo(
                id = UUID.fromString(user.id),
                email = user.email ?: user.username ?: id.toString(),
                username = user.username ?: user.email ?: id.toString()
            )
        } catch (e: Exception) {
            try {
                val all = keycloak.realm(realm).users().list(0, 100)
                val user = all.firstOrNull { it.id.equals(id.toString(), ignoreCase = true) }
                if (user != null) {
                    UserInfo(
                        id = UUID.fromString(user.id),
                        email = user.email ?: user.username ?: id.toString(),
                        username = user.username ?: user.email ?: id.toString()
                    )
                } else null
            } catch (ex: Exception) {
                null
            }
        }
    }

    fun getUserProfile(userId: UUID): UserProfileDto {
        val userResource = try {
            keycloak.realm(realm).users().get(userId.toString())
        } catch (e: Exception) {
            throw WebApplicationException("User not found", 404)
        }
        val user = try {
            userResource.toRepresentation()
        } catch (e: Exception) {
            val all = try {
                keycloak.realm(realm).users().list(0, 100)
            } catch (ex: Exception) {
                emptyList<UserRepresentation>()
            }
            all.firstOrNull { it.id.equals(userId.toString(), ignoreCase = true) }
                ?: throw WebApplicationException("User not found", 404)
        }
        val roles = try {
            userResource.roles().realmLevel().listAll().map { it.name }
        } catch (e: Exception) {
            user.realmRoles ?: emptyList()
        }
        return UserProfileDto(
            id = UUID.fromString(user.id),
            username = user.username ?: "",
            email = user.email ?: "",
            firstName = user.firstName,
            lastName = user.lastName,
            emailVerified = user.isEmailVerified ?: false,
            roles = roles
        )
    }

    fun updateUserProfile(userId: UUID, firstName: String?, lastName: String?): UserProfileDto {
        val userResource = try {
            keycloak.realm(realm).users().get(userId.toString())
        } catch (e: Exception) {
            throw WebApplicationException("User not found", 404)
        }
        val user = try {
            userResource.toRepresentation()
        } catch (e: Exception) {
            throw WebApplicationException("User not found", 404)
        }
        user.firstName = firstName?.trim()
        user.lastName = lastName?.trim()
        try {
            userResource.update(user)
        } catch (e: Exception) {
            throw WebApplicationException("Failed to update user profile: ${e.message}", 500)
        }
        return getUserProfile(userId)
    }
}
