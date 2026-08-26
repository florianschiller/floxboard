package de.einfloh.floxboard.license.domain

open class LicenseException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

class FeatureNotAvailableException(message: String) : LicenseException(message)

class QuotaExceededException(
    val metricKey: String,
    val current: Long,
    val limit: Long,
    message: String = "Quota limit exceeded for '$metricKey'. Current: $current, Limit: $limit"
) : LicenseException(message)

class InvalidLicenseException(message: String, cause: Throwable? = null) : LicenseException(message, cause)
