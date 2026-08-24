package de.einfloh.floxboard.whiteboard.api

import jakarta.ws.rs.container.ContainerRequestContext
import jakarta.ws.rs.container.ContainerRequestFilter
import jakarta.ws.rs.container.ContainerResponseContext
import jakarta.ws.rs.container.ContainerResponseFilter
import org.jboss.logging.Logger
import java.io.ByteArrayInputStream
import java.nio.charset.StandardCharsets

//@Provider
class LoggingFilter : ContainerRequestFilter, ContainerResponseFilter {

    private val log = Logger.getLogger(LoggingFilter::class.java)

    override fun filter(requestContext: ContainerRequestContext) {
        val method = requestContext.method
        val path = requestContext.uriInfo.path
        val body = if (requestContext.hasEntity()) {
            val bytes = requestContext.entityStream.readAllBytes()
            requestContext.entityStream = ByteArrayInputStream(bytes)
            String(bytes, StandardCharsets.UTF_8)
        } else {
            null
        }

        log.info("Request: $method $path\nHeader: ${requestContext.headers}" + (body?.let { "\nBody: $it" } ?: ""))
    }

    override fun filter(requestContext: ContainerRequestContext, responseContext: ContainerResponseContext) {
        val status = responseContext.status
        val body = if (responseContext.hasEntity()) {
            responseContext.entity.toString()
        } else {
            null
        }

        log.info("Response: $status" + (body?.let { "\nBody: $it" } ?: ""))
    }
}
