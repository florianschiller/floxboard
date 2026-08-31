package de.einfloh.floxboard.license.domain

import de.einfloh.floxboard.license.resolvers.CollaboratorCountUsageResolver
import de.einfloh.floxboard.license.resolvers.MonthlyAiCreditsUsageResolver
import de.einfloh.floxboard.license.resolvers.WhiteboardCountUsageResolver
import de.einfloh.floxboard.organization.domain.OrganizationLicenseAssignmentRepository
import de.einfloh.floxboard.organization.domain.OrganizationLicensePoolRepository
import jakarta.enterprise.context.ApplicationScoped
import jakarta.enterprise.inject.Instance
import jakarta.transaction.Transactional
import jakarta.ws.rs.BadRequestException
import java.time.Instant
import java.util.UUID

@ApplicationScoped
class EntitlementService(
    private val licenseRepository: LicenseRepository,
    private val orgLicenseAssignmentRepository: OrganizationLicenseAssignmentRepository,
    private val orgLicensePoolRepository: OrganizationLicensePoolRepository,
    private val whiteboardCountResolver: WhiteboardCountUsageResolver,
    private val collaboratorCountResolver: CollaboratorCountUsageResolver,
    private val monthlyAiCreditsResolver: MonthlyAiCreditsUsageResolver,
    @param:jakarta.enterprise.inject.Any private val customUsageResolvers: Instance<MetricUsageResolver>,
    private val planConfig: PlanConfigurationService,
    private val licenseValidator: LicenseValidator
) {
    private fun getResolverMap(): Map<String, MetricUsageResolver> {
        val map = HashMap<String, MetricUsageResolver>()
        map[whiteboardCountResolver.metricKey] = whiteboardCountResolver
        map[collaboratorCountResolver.metricKey] = collaboratorCountResolver
        map[monthlyAiCreditsResolver.metricKey] = monthlyAiCreditsResolver
        if (!customUsageResolvers.isUnsatisfied) {
            for (resolver in customUsageResolvers) {
                map[resolver.metricKey] = resolver
            }
        }
        return map
    }

    fun getActiveLicense(ownerId: UUID): License? {
        val orgAssignment = orgLicenseAssignmentRepository.findActiveByUserId(ownerId)
        if (orgAssignment != null) {
            val pool = orgAssignment.pool
            val syntheticLicense = License().apply {
                this.id = orgAssignment.id
                this.ownerId = ownerId
                this.licenseKey = "ORG-${pool.organizationId}-${orgAssignment.id}"
                this.planType = pool.planType
                this.validFrom = pool.validFrom
                this.validUntil = pool.validUntil
                this.status = LicenseStatus.ACTIVE
            }
            return syntheticLicense
        }

        val license = licenseRepository.findActiveByOwnerId(ownerId) ?: return null
        if (license.validUntil != null && license.validUntil!!.isBefore(Instant.now())) {
            return null
        }
        return license
    }

    fun hasFeature(ownerId: UUID, featureKey: String): Boolean {
        val license = getActiveLicense(ownerId)
        if (license != null) {
            if (license.features.containsKey(featureKey)) {
                return license.features[featureKey] == true
            }
            if (license.features["*"] == true) return true
            val prefix = featureKey.substringBefore(":") + ":*"
            if (license.features[prefix] == true) return true
        }
        val plan = license?.planType ?: LicensePlan.FREE
        return planConfig.getDefaultFeature(plan, featureKey)
    }

    fun assertFeature(ownerId: UUID, featureKey: String) {
        if (!hasFeature(ownerId, featureKey)) {
            throw FeatureNotAvailableException("Feature '$featureKey' is not available under your current plan.")
        }
    }

    fun checkQuota(
        ownerId: UUID,
        metricKey: String,
        requestedDelta: Long = 1,
        context: Map<String, Any> = emptyMap()
    ): QuotaStatus {
        val license = getActiveLicense(ownerId)
        val plan = license?.planType ?: LicensePlan.FREE

        val quotaDef = if (license != null && license.quotas.containsKey(metricKey)) {
            license.quotas[metricKey]!!
        } else {
            planConfig.getDefaultQuota(plan, metricKey)
        }

        val resolver = getResolverMap()[metricKey]
        val currentUsage = resolver?.getCurrentUsage(ownerId, context) ?: 0L

        if (quotaDef.isUnlimited) {
            return QuotaStatus(
                metricKey = metricKey,
                allowed = true,
                current = currentUsage,
                limit = null,
                remaining = null
            )
        }

        val allowed = (currentUsage + requestedDelta) <= quotaDef.limit

        return QuotaStatus(
            metricKey = metricKey,
            allowed = allowed,
            current = currentUsage,
            limit = quotaDef.limit,
            remaining = maxOf(0L, quotaDef.limit - currentUsage)
        )
    }

    fun assertQuota(
        ownerId: UUID,
        metricKey: String,
        requestedDelta: Long = 1,
        context: Map<String, Any> = emptyMap()
    ) {
        val status = checkQuota(ownerId, metricKey, requestedDelta, context)
        if (!status.allowed) {
            throw QuotaExceededException(
                metricKey = metricKey,
                current = status.current,
                limit = status.limit ?: 0L
            )
        }
    }

    fun getEntitlements(ownerId: UUID): EntitlementStatusResponse {
        val activeLicense = getActiveLicense(ownerId)
        val rawLicense = licenseRepository.findActiveByOwnerId(ownerId)
        val isExpired = rawLicense?.validUntil?.isBefore(Instant.now()) == true

        val plan = activeLicense?.planType ?: LicensePlan.FREE
        val status = when {
            rawLicense == null -> LicenseStatus.ACTIVE
            isExpired -> LicenseStatus.EXPIRED
            else -> rawLicense.status
        }

        val planDefaults = planConfig.getPlanDefaults(plan)

        val mergedFeatures = HashMap<String, Boolean>()
        mergedFeatures.putAll(planDefaults.features)
        if (activeLicense != null) {
            mergedFeatures.putAll(activeLicense.features)
        }

        val allMetricKeys = HashSet<String>()
        allMetricKeys.addAll(planDefaults.quotas.keys)
        if (activeLicense != null) {
            allMetricKeys.addAll(activeLicense.quotas.keys)
        }
        allMetricKeys.addAll(getResolverMap().keys)

        val quotaStatuses = HashMap<String, QuotaStatus>()
        for (metric in allMetricKeys) {
            quotaStatuses[metric] = checkQuota(ownerId, metric, requestedDelta = 0)
        }

        return EntitlementStatusResponse(
            plan = plan,
            status = status,
            features = mergedFeatures,
            quotas = quotaStatuses,
            validUntil = rawLicense?.validUntil,
            isExpired = isExpired
        )
    }

    @Transactional
    fun activateLicense(ownerId: UUID, licenseKey: String): License {
        val activeOrgAssignment = orgLicenseAssignmentRepository.findActiveByUserId(ownerId)
        if (activeOrgAssignment != null) {
            throw BadRequestException("User already has an active license assigned from an organization")
        }

        val payload = licenseValidator.parseAndValidate(licenseKey, expectedOwnerId = ownerId)

        // Deactivate existing active licenses
        val existing = licenseRepository.findByOwnerId(ownerId)
        for (l in existing) {
            if (l.status == LicenseStatus.ACTIVE) {
                l.status = LicenseStatus.REVOKED
                licenseRepository.persist(l)
            }
        }

        val newLicense = License().apply {
            this.ownerId = ownerId
            this.licenseKey = licenseKey.trim()
            this.planType = payload.plan
            this.features = payload.features
            this.quotas = payload.quotas
            this.validFrom = payload.validFrom ?: Instant.now()
            this.validUntil = payload.validUntil
            this.status = LicenseStatus.ACTIVE
        }

        licenseRepository.persist(newLicense)
        return newLicense
    }

    @Transactional
    fun assignLicense(
        ownerId: UUID,
        plan: LicensePlan,
        validUntil: Instant? = null,
        features: Map<String, Boolean>? = null,
        quotas: Map<String, QuotaDefinition>? = null
    ): License {
        if (plan != LicensePlan.FREE) {
            val activeOrgAssignment = orgLicenseAssignmentRepository.findActiveByUserId(ownerId)
            if (activeOrgAssignment != null) {
                throw BadRequestException("User already has an active license assigned from an organization")
            }
        }

        // Deactivate existing active licenses
        val existing = licenseRepository.findByOwnerId(ownerId)
        for (l in existing) {
            if (l.status == LicenseStatus.ACTIVE) {
                l.status = LicenseStatus.REVOKED
                licenseRepository.persist(l)
            }
        }

        if (plan == LicensePlan.FREE) {
            val freeLicense = License().apply {
                this.ownerId = ownerId
                this.licenseKey = "FREE-DEFAULT"
                this.planType = LicensePlan.FREE
                this.features = emptyMap()
                this.quotas = emptyMap()
                this.validFrom = Instant.now()
                this.validUntil = null
                this.status = LicenseStatus.ACTIVE
            }
            licenseRepository.persist(freeLicense)
            return freeLicense
        }

        val planDefaults = planConfig.getPlanDefaults(plan)
        val effectiveFeatures = features ?: planDefaults.features
        val effectiveQuotas = quotas ?: planDefaults.quotas

        val payload = LicensePayload(
            licenseId = UUID.randomUUID(),
            ownerId = ownerId,
            plan = plan,
            features = effectiveFeatures,
            quotas = effectiveQuotas,
            validFrom = Instant.now(),
            validUntil = validUntil
        )

        val signedKey = licenseValidator.generateSignedToken(payload)

        val newLicense = License().apply {
            this.ownerId = ownerId
            this.licenseKey = signedKey
            this.planType = plan
            this.features = effectiveFeatures
            this.quotas = effectiveQuotas
            this.validFrom = payload.validFrom ?: Instant.now()
            this.validUntil = validUntil
            this.status = LicenseStatus.ACTIVE
        }

        licenseRepository.persist(newLicense)
        return newLicense
    }

    @Transactional
    fun deactivateLicense(ownerId: UUID): Boolean {
        val existing = licenseRepository.findByOwnerId(ownerId)
        var modified = false
        for (l in existing) {
            if (l.status == LicenseStatus.ACTIVE) {
                l.status = LicenseStatus.REVOKED
                licenseRepository.persist(l)
                modified = true
            }
        }
        val orgAssignment = orgLicenseAssignmentRepository.findActiveByUserId(ownerId)
        if (orgAssignment != null) {
            val pool = orgAssignment.pool
            orgLicenseAssignmentRepository.deleteById(orgAssignment.id)
            pool.allocatedSeats = maxOf(0, pool.allocatedSeats - 1)
            orgLicensePoolRepository.persist(pool)
            modified = true
        }
        return modified
    }
}
