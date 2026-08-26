package de.einfloh.floxboard.license.domain

import com.fasterxml.jackson.databind.ObjectMapper
import jakarta.enterprise.context.ApplicationScoped
import org.eclipse.microprofile.config.inject.ConfigProperty
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.time.Instant
import java.util.*
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

data class LicensePayload(
    var licenseId: UUID = UUID.randomUUID(),
    var ownerId: UUID? = null,
    var subjectId: UUID? = null,
    var plan: LicensePlan = LicensePlan.PRO,
    var features: Map<String, Boolean> = emptyMap(),
    var quotas: Map<String, QuotaDefinition> = emptyMap(),
    var validFrom: Instant? = null,
    var validUntil: Instant? = null
)

@ApplicationScoped
class LicenseValidator(
    private val objectMapper: ObjectMapper,
    @ConfigProperty(name = "floxboard.licensing.secret", defaultValue = "floxboard-default-licensing-secret-key-2026")
    private val licensingSecret: String,
    @ConfigProperty(name = "floxboard.licensing.public-key")
    private val publicKeyPem: Optional<String>
) {
    fun parseAndValidate(licenseKey: String, expectedOwnerId: UUID? = null): LicensePayload {
        val trimmed = licenseKey.trim()
        if (trimmed.isEmpty()) {
            throw InvalidLicenseException("License key cannot be empty")
        }

        val parts = trimmed.split(".")
        if (parts.size != 2 && parts.size != 3) {
            throw InvalidLicenseException("Invalid license key format: expected token with signature")
        }

        val payloadJson = try {
            val payloadBase64 = if (parts.size == 3) parts[1] else parts[0]
            String(Base64.getUrlDecoder().decode(payloadBase64), StandardCharsets.UTF_8)
        } catch (e: Exception) {
            try {
                val payloadBase64 = if (parts.size == 3) parts[1] else parts[0]
                String(Base64.getDecoder().decode(payloadBase64), StandardCharsets.UTF_8)
            } catch (ex: Exception) {
                throw InvalidLicenseException("Failed to decode license payload", ex)
            }
        }

        val signatureBase64 = if (parts.size == 3) parts[2] else parts[1]
        val contentToVerify = if (parts.size == 3) "${parts[0]}.${parts[1]}" else parts[0]

        val isValidSignature = verifySignature(contentToVerify, signatureBase64)
        if (!isValidSignature) {
            throw InvalidLicenseException("Invalid license key signature")
        }

        val payload = try {
            objectMapper.readValue(payloadJson, LicensePayload::class.java)
        } catch (e: Exception) {
            throw InvalidLicenseException("Malformed license key payload JSON", e)
        }

        val effectiveOwner = payload.ownerId ?: payload.subjectId
        if (expectedOwnerId != null && effectiveOwner != null && effectiveOwner != expectedOwnerId) {
            throw InvalidLicenseException("License key was issued to a different subject/owner")
        }

        if (payload.validUntil != null && payload.validUntil!!.isBefore(Instant.now())) {
            throw InvalidLicenseException("License key has expired on ${payload.validUntil}")
        }

        return payload
    }

    private fun verifySignature(content: String, signatureBase64: String): Boolean {
        // 1. Try HMAC-SHA256 with licensingSecret
        if (verifyHmac(content, signatureBase64, licensingSecret)) {
            return true
        }

        // 2. If public key PEM is configured, try RSA/ECDSA verification
        if (publicKeyPem.isPresent && publicKeyPem.get().isNotBlank()) {
            if (verifyAsymmetric(content, signatureBase64, publicKeyPem.get())) {
                return true
            }
        }

        return false
    }

    private fun verifyHmac(content: String, signatureBase64: String, secret: String): Boolean {
        return try {
            val mac = Mac.getInstance("HmacSHA256")
            val secretKey = SecretKeySpec(secret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256")
            mac.init(secretKey)
            val expectedBytes = mac.doFinal(content.toByteArray(StandardCharsets.UTF_8))
            val expectedBase64Url = Base64.getUrlEncoder().withoutPadding().encodeToString(expectedBytes)
            val expectedBase64 = Base64.getEncoder().encodeToString(expectedBytes)

            val cleanSig = signatureBase64.trimEnd('=')
            cleanSig == expectedBase64Url || cleanSig == expectedBase64.trimEnd('=') || signatureBase64 == expectedBase64
        } catch (e: Exception) {
            false
        }
    }

    private fun verifyAsymmetric(content: String, signatureBase64: String, pem: String): Boolean {
        return try {
            val cleanPem = pem.replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace("\\s+".toRegex(), "")
            val keyBytes = Base64.getDecoder().decode(cleanPem)
            val spec = X509EncodedKeySpec(keyBytes)
            val kf = KeyFactory.getInstance("RSA")
            val publicKey = kf.generatePublic(spec)

            val sigBytes = try {
                Base64.getUrlDecoder().decode(signatureBase64)
            } catch (e: Exception) {
                Base64.getDecoder().decode(signatureBase64)
            }

            val signature = Signature.getInstance("SHA256withRSA")
            signature.initVerify(publicKey)
            signature.update(content.toByteArray(StandardCharsets.UTF_8))
            signature.verify(sigBytes)
        } catch (e: Exception) {
            false
        }
    }

    fun generateSignedToken(payload: LicensePayload, secret: String? = null): String {
        val effectiveSecret = secret ?: licensingSecret
        val payloadJson = objectMapper.writeValueAsString(payload)
        val payloadBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.toByteArray(StandardCharsets.UTF_8))
        val headerJson = """{"alg":"HS256","typ":"JWT"}"""
        val headerBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(headerJson.toByteArray(StandardCharsets.UTF_8))
        val content = "$headerBase64.$payloadBase64"

        val mac = Mac.getInstance("HmacSHA256")
        val secretKey = SecretKeySpec(effectiveSecret.toByteArray(StandardCharsets.UTF_8), "HmacSHA256")
        mac.init(secretKey)
        val sigBytes = mac.doFinal(content.toByteArray(StandardCharsets.UTF_8))
        val sigBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(sigBytes)

        return "$content.$sigBase64"
    }
}
