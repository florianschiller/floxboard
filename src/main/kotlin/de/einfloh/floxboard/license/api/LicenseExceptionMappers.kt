package de.einfloh.floxboard.license.api

import de.einfloh.floxboard.license.domain.FeatureNotAvailableException
import de.einfloh.floxboard.license.domain.InvalidLicenseException
import de.einfloh.floxboard.license.domain.QuotaExceededException
import jakarta.enterprise.context.ApplicationScoped
import jakarta.ws.rs.core.Response
import jakarta.ws.rs.ext.Provider
import org.jboss.resteasy.reactive.server.ServerExceptionMapper

@Provider
@ApplicationScoped
class LicenseExceptionMappers {
    @ServerExceptionMapper(QuotaExceededException::class)
    fun mapQuotaExceeded(ex: QuotaExceededException): Response {
        return Response.status(402)
            .entity(
                mapOf(
                    "error" to (ex.message ?: "Quota exceeded"),
                    "metricKey" to ex.metricKey,
                    "current" to ex.current,
                    "limit" to ex.limit
                )
            )
            .build()
    }

    @ServerExceptionMapper(FeatureNotAvailableException::class)
    fun mapFeatureNotAvailable(ex: FeatureNotAvailableException): Response {
        return Response.status(Response.Status.FORBIDDEN)
            .entity(mapOf("error" to (ex.message ?: "Feature not available")))
            .build()
    }

    @ServerExceptionMapper(InvalidLicenseException::class)
    fun mapInvalidLicense(ex: InvalidLicenseException): Response {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(mapOf("error" to (ex.message ?: "Invalid license key")))
            .build()
    }

    @ServerExceptionMapper(Exception::class)
    fun mapGeneralException(ex: Exception): Response? {
        var cause: Throwable? = ex
        while (cause != null) {
            if (cause is QuotaExceededException) return mapQuotaExceeded(cause)
            if (cause is FeatureNotAvailableException) return mapFeatureNotAvailable(cause)
            if (cause is InvalidLicenseException) return mapInvalidLicense(cause)
            cause = cause.cause
        }
        return null
    }
}
