package de.einfloh.floxboard.whiteboard.domain

import jakarta.enterprise.context.ApplicationScoped
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

    fun searchUsers(query: String): List<UserInfo> {
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
}
