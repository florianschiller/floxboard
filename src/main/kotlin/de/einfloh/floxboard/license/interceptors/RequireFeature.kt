package de.einfloh.floxboard.license.interceptors

import jakarta.interceptor.InterceptorBinding

@InterceptorBinding
@Target(AnnotationTarget.FUNCTION, AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class RequireFeature(val value: String = "")
