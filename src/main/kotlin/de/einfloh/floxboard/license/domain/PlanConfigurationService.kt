package de.einfloh.floxboard.license.domain

import jakarta.enterprise.context.ApplicationScoped

@ApplicationScoped
class PlanConfigurationService {
    private val defaultPlans: Map<LicensePlan, PlanDefaults> = mapOf(
        LicensePlan.FREE to PlanDefaults(
            features = mapOf(
                "whiteboard:export:png" to true,
                "whiteboard:export:pdf" to false,
                "ai:text_to_diagram" to false,
                "whiteboard:version_history" to false,
                "whiteboard:image_upload" to true
            ),
            quotas = mapOf(
                "whiteboards" to QuotaDefinition(limit = 3, period = QuotaPeriod.LIFETIME),
                "collaborators_per_board" to QuotaDefinition(limit = 2, period = QuotaPeriod.LIFETIME),
                "ai:monthly_credits" to QuotaDefinition(limit = 0, period = QuotaPeriod.MONTHLY),
                "storage:user_storage_bytes" to QuotaDefinition(limit = 10L * 1024 * 1024, period = QuotaPeriod.LIFETIME),
                "storage:max_file_size_bytes" to QuotaDefinition(limit = 2L * 1024 * 1024, period = QuotaPeriod.LIFETIME)
            )
        ),
        LicensePlan.PRO to PlanDefaults(
            features = mapOf(
                "whiteboard:export:png" to true,
                "whiteboard:export:pdf" to true,
                "ai:text_to_diagram" to true,
                "whiteboard:version_history" to true,
                "whiteboard:image_upload" to true
            ),
            quotas = mapOf(
                "whiteboards" to QuotaDefinition(limit = -1, period = QuotaPeriod.LIFETIME),
                "collaborators_per_board" to QuotaDefinition(limit = 10, period = QuotaPeriod.LIFETIME),
                "ai:monthly_credits" to QuotaDefinition(limit = 1000, period = QuotaPeriod.MONTHLY),
                "storage:user_storage_bytes" to QuotaDefinition(limit = 500L * 1024 * 1024, period = QuotaPeriod.LIFETIME),
                "storage:max_file_size_bytes" to QuotaDefinition(limit = 10L * 1024 * 1024, period = QuotaPeriod.LIFETIME)
            )
        ),
        LicensePlan.TEAM to PlanDefaults(
            features = mapOf(
                "whiteboard:export:png" to true,
                "whiteboard:export:pdf" to true,
                "ai:text_to_diagram" to true,
                "whiteboard:version_history" to true,
                "whiteboard:image_upload" to true
            ),
            quotas = mapOf(
                "whiteboards" to QuotaDefinition(limit = -1, period = QuotaPeriod.LIFETIME),
                "collaborators_per_board" to QuotaDefinition(limit = 50, period = QuotaPeriod.LIFETIME),
                "ai:monthly_credits" to QuotaDefinition(limit = 5000, period = QuotaPeriod.MONTHLY),
                "storage:user_storage_bytes" to QuotaDefinition(limit = 5000L * 1024 * 1024, period = QuotaPeriod.LIFETIME),
                "storage:max_file_size_bytes" to QuotaDefinition(limit = 25L * 1024 * 1024, period = QuotaPeriod.LIFETIME)
            )
        ),
        LicensePlan.ENTERPRISE to PlanDefaults(
            features = mapOf(
                "whiteboard:export:png" to true,
                "whiteboard:export:pdf" to true,
                "ai:text_to_diagram" to true,
                "whiteboard:version_history" to true,
                "workspace:audit_logs" to true,
                "whiteboard:image_upload" to true
            ),
            quotas = mapOf(
                "whiteboards" to QuotaDefinition(limit = -1, period = QuotaPeriod.LIFETIME),
                "collaborators_per_board" to QuotaDefinition(limit = -1, period = QuotaPeriod.LIFETIME),
                "ai:monthly_credits" to QuotaDefinition(limit = 50000, period = QuotaPeriod.MONTHLY),
                "storage:user_storage_bytes" to QuotaDefinition(limit = -1, period = QuotaPeriod.LIFETIME),
                "storage:max_file_size_bytes" to QuotaDefinition(limit = -1, period = QuotaPeriod.LIFETIME)
            )
        )
    )

    fun getPlanDefaults(plan: LicensePlan): PlanDefaults =
        defaultPlans[plan] ?: defaultPlans[LicensePlan.FREE]!!

    fun getDefaultFeature(plan: LicensePlan, featureKey: String): Boolean {
        val planDef = getPlanDefaults(plan)
        if (planDef.features.containsKey(featureKey)) {
            return planDef.features[featureKey] == true
        }
        if (planDef.features["*"] == true) return true
        val prefix = featureKey.substringBefore(":") + ":*"
        return planDef.features[prefix] == true
    }

    fun getDefaultQuota(plan: LicensePlan, metricKey: String): QuotaDefinition {
        val planDef = getPlanDefaults(plan)
        return planDef.quotas[metricKey] ?: QuotaDefinition(limit = 0, period = QuotaPeriod.LIFETIME)
    }
}
