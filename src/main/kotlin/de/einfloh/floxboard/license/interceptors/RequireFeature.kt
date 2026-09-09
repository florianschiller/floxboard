package de.einfloh.floxboard.license.interceptors

import jakarta.enterprise.util.Nonbinding
import jakarta.interceptor.InterceptorBinding
import java.lang.annotation.Inherited

@Inherited
@InterceptorBinding
@Target(AnnotationTarget.FUNCTION, AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class RequireFeature(
    @get:Nonbinding
    val value: String = ""
)
