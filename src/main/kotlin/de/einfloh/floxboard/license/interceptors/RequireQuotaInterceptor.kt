package de.einfloh.floxboard.license.interceptors

import de.einfloh.floxboard.license.domain.EntitlementService
import jakarta.annotation.Priority
import jakarta.interceptor.AroundInvoke
import jakarta.interceptor.Interceptor
import jakarta.interceptor.InvocationContext
import org.eclipse.microprofile.jwt.JsonWebToken
import java.util.UUID

@RequireQuota
@Interceptor
@Priority(Interceptor.Priority.APPLICATION + 10)
class RequireQuotaInterceptor(
    private val entitlementService: EntitlementService,
    private val jwt: JsonWebToken
) {
    @AroundInvoke
    fun intercept(context: InvocationContext): Any? {
        val annotation = context.method.getAnnotation(RequireQuota::class.java)
            ?: context.target.javaClass.getAnnotation(RequireQuota::class.java)

        if (annotation != null && annotation.metric.isNotBlank()) {
            val subject = jwt.subject ?: throw SecurityException("User not authenticated")
            val ownerId = UUID.fromString(subject)
            entitlementService.assertQuota(ownerId, annotation.metric, annotation.delta)
        }

        return context.proceed()
    }
}
