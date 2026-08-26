package de.einfloh.floxboard.license.interceptors

import de.einfloh.floxboard.license.domain.EntitlementService
import jakarta.annotation.Priority
import jakarta.interceptor.AroundInvoke
import jakarta.interceptor.Interceptor
import jakarta.interceptor.InvocationContext
import org.eclipse.microprofile.jwt.JsonWebToken
import java.util.UUID

@RequireFeature
@Interceptor
@Priority(Interceptor.Priority.APPLICATION + 10)
class RequireFeatureInterceptor(
    private val entitlementService: EntitlementService,
    private val jwt: JsonWebToken
) {
    @AroundInvoke
    fun intercept(context: InvocationContext): Any? {
        val annotation = context.method.getAnnotation(RequireFeature::class.java)
            ?: context.target.javaClass.getAnnotation(RequireFeature::class.java)

        if (annotation != null && annotation.value.isNotBlank()) {
            val subject = jwt.subject ?: throw SecurityException("User not authenticated")
            val ownerId = UUID.fromString(subject)
            entitlementService.assertFeature(ownerId, annotation.value)
        }

        return context.proceed()
    }
}
