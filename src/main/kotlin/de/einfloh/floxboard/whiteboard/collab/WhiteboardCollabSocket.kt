package de.einfloh.floxboard.whiteboard.collab

import com.fasterxml.jackson.databind.ObjectMapper
import de.einfloh.floxboard.whiteboard.domain.CollaboratorRole
import de.einfloh.floxboard.whiteboard.domain.WhiteboardService
import io.quarkus.websockets.next.*
import io.vertx.core.buffer.Buffer
import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import org.jboss.logging.Logger
import java.time.Instant
import java.util.*
import java.util.concurrent.ConcurrentHashMap

data class UserSessionMeta(
    val userId: UUID,
    val userEmail: String,
    val username: String,
    val role: CollaboratorRole,
    val whiteboardId: UUID
)

@WebSocket(path = "/ws/whiteboards/{id}")
@ApplicationScoped
class WhiteboardCollabSocket {
    private val log = Logger.getLogger(WhiteboardCollabSocket::class.java)

    @Inject
    lateinit var whiteboardService: WhiteboardService

    @Inject
    lateinit var objectMapper: ObjectMapper

    // whiteboardId -> (connectionId -> (WebSocketConnection, UserSessionMeta))
    private val rooms = ConcurrentHashMap<UUID, ConcurrentHashMap<String, Pair<WebSocketConnection, UserSessionMeta>>>()

    @OnOpen
    fun onOpen(connection: WebSocketConnection, @PathParam("id") boardIdStr: String) {
        val boardId = try {
            UUID.fromString(boardIdStr)
        } catch (e: Exception) {
            connection.closeAndAwait(CloseReason(4400, "Invalid whiteboard ID"))
            return
        }

        // Extract token
        val token = extractToken(connection)
        if (token == null) {
            log.warn("WebSocket connection rejected: Missing token")
            connection.closeAndAwait(CloseReason(4401, "Unauthorized: Missing token"))
            return
        }

        val meta = try {
            val parts = token.split(".")
            if (parts.size < 2) throw IllegalArgumentException("Malformed JWT token")
            val payloadBytes = Base64.getUrlDecoder().decode(parts[1])
            val json = objectMapper.readTree(payloadBytes)

            val exp = json.get("exp")?.asLong()
            if (exp != null && exp < Instant.now().epochSecond) {
                throw IllegalArgumentException("Token has expired")
            }

            val userIdStr = json.get("sub")?.asText() ?: throw IllegalArgumentException("Missing subject in token")
            val userId = UUID.fromString(userIdStr)
            val email = json.get("email")?.asText() ?: json.get("preferred_username")?.asText() ?: userIdStr
            val username = json.get("preferred_username")?.asText() ?: json.get("name")?.asText() ?: email

            val role = whiteboardService.getRoleForUser(userId, boardId)
            if (role == null) {
                log.warn("User $userId has no access to whiteboard $boardId")
                connection.closeAndAwait(CloseReason(4403, "Access Denied"))
                return
            }

            UserSessionMeta(
                userId = userId,
                userEmail = email,
                username = username,
                role = role,
                whiteboardId = boardId
            )
        } catch (e: Exception) {
            log.warn("WebSocket authentication failed", e)
            connection.closeAndAwait(CloseReason(4401, "Unauthorized: Invalid token"))
            return
        }

        val room = rooms.computeIfAbsent(boardId) { ConcurrentHashMap() }
        room[connection.id()] = Pair(connection, meta)
        log.info("User ${meta.username} (${meta.userId}, ${meta.role}) joined whiteboard room $boardId (total connections: ${room.size})")
    }

    @OnClose
    fun onClose(connection: WebSocketConnection, @PathParam("id") boardIdStr: String) {
        val boardId = try { UUID.fromString(boardIdStr) } catch (e: Exception) { return }
        val room = rooms[boardId]
        val removed = room?.remove(connection.id())
        if (removed != null) {
            log.info("User ${removed.second.username} left whiteboard room $boardId (remaining: ${room?.size ?: 0})")
            if (room?.isEmpty() == true) {
                rooms.remove(boardId)
            }
        }
    }

    @OnBinaryMessage
    fun onBinaryMessage(message: Buffer, connection: WebSocketConnection, @PathParam("id") boardIdStr: String) {
        val boardId = try { UUID.fromString(boardIdStr) } catch (e: Exception) { return }
        val room = rooms[boardId] ?: return
        val sender = room[connection.id()] ?: return

        // Relay binary message to all other connected clients in room
        for ((connId, pair) in room) {
            if (connId != connection.id() && pair.first.isOpen) {
                try {
                    pair.first.sendBinaryAndAwait(message)
                } catch (e: Exception) {
                    log.error("Failed to relay binary message to ${pair.second.username}", e)
                }
            }
        }
    }

    @OnTextMessage
    fun onTextMessage(message: String, connection: WebSocketConnection, @PathParam("id") boardIdStr: String) {
        val boardId = try { UUID.fromString(boardIdStr) } catch (e: Exception) { return }
        val room = rooms[boardId] ?: return
        val sender = room[connection.id()] ?: return

        // Relay text/JSON message (presence, focus commands, awareness) to all other connected clients in room
        for ((connId, pair) in room) {
            if (connId != connection.id() && pair.first.isOpen) {
                try {
                    pair.first.sendTextAndAwait(message)
                } catch (e: Exception) {
                    log.error("Failed to relay text message to ${pair.second.username}", e)
                }
            }
        }
    }

    fun evictUser(boardId: UUID, userId: UUID) {
        val room = rooms[boardId] ?: return
        for ((connId, pair) in room) {
            if (pair.second.userId == userId) {
                log.info("Evicting user $userId from whiteboard room $boardId")
                try {
                    pair.first.closeAndAwait(CloseReason(4403, "Access Revoked"))
                } catch (e: Exception) {
                    log.error("Error closing connection during eviction", e)
                }
                room.remove(connId)
            }
        }
    }

    fun getActiveUsers(boardId: UUID): List<UserSessionMeta> {
        val room = rooms[boardId] ?: return emptyList()
        return room.values.map { it.second }.distinctBy { it.userId }
    }

    private fun extractToken(connection: WebSocketConnection): String? {
        val req = connection.handshakeRequest()

        val authHeader = req.header("Authorization")
        if (!authHeader.isNullOrBlank() && authHeader.startsWith("Bearer ", ignoreCase = true)) {
            return authHeader.substring(7).trim()
        }

        val q = req.query()
        if (!q.isNullOrBlank()) {
            val tokenParam = q.split("&")
                .map { it.split("=") }
                .firstOrNull { it.size >= 2 && it[0] == "token" }
            if (tokenParam != null) {
                return java.net.URLDecoder.decode(tokenParam[1], java.nio.charset.StandardCharsets.UTF_8)
            }
        }

        return null
    }
}
