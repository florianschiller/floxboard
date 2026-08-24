package de.einfloh.util

import io.restassured.module.kotlin.extensions.Extract
import io.restassured.module.kotlin.extensions.Given
import io.restassured.module.kotlin.extensions.Then
import io.restassured.module.kotlin.extensions.When
import jakarta.enterprise.context.ApplicationScoped
import org.eclipse.microprofile.config.inject.ConfigProperty

@ApplicationScoped
class KeycloakUserProvider(
    @param:ConfigProperty(name = "quarkus.keycloak.admin-client.server-url") private val authServerUrl: String,
    @param:ConfigProperty(name = "quarkus.keycloak.admin-client.client-id") private val clientId: String,
    @param:ConfigProperty(name = "quarkus.keycloak.admin-client.client-secret") private val clientSecret: String,
    @param:ConfigProperty(name = "quarkus.keycloak.admin-client.realm") private val realm: String
) {

    fun getAccessToken(email: String, password: String): String =
        Given {
            contentType("application/x-www-form-urlencoded")
            formParams(
                mapOf<String, String>(
                    "username" to email,
                    "password" to password,
                    "grant_type" to "password",
                    "client_id" to clientId,
                    "client_secret" to clientSecret,
                    "scope" to "openid email profile"
                )
            )
            baseUri(authServerUrl)
        } When {
            post("/realms/${realm}/protocol/openid-connect/token")
        } Then {
            statusCode(200)
        } Extract {
            path("access_token")
        }
}

