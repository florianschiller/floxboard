import { useState } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../kcContext";
import type { I18n } from "../i18n";

export default function Login(props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>) {
    const { kcContext, i18n, Template } = props;
    const { realm, url, usernameHidden, login, auth, registrationDisabled, messagesPerField } = kcContext;
    const { msg } = i18n;

    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            headerNode={<span>Sign in to your account</span>}
            infoNode={
                realm.password && realm.registrationAllowed && !registrationDisabled ? (
                    <div>
                        <span>Don&apos;t have an account? </span>
                        <a
                            href={url.registrationUrl}
                            style={{
                                color: "#2563eb",
                                fontWeight: 500,
                                textDecoration: "none"
                            }}
                        >
                            Sign up
                        </a>
                    </div>
                ) : undefined
            }
        >
            <form
                id="kc-form-login"
                onSubmit={() => setIsSubmitting(true)}
                action={url.loginAction}
                method="post"
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
                {!usernameHidden && (
                    <div>
                        <label
                            htmlFor="username"
                            style={{
                                display: "block",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#334155",
                                marginBottom: "6px"
                            }}
                        >
                            {!realm.loginWithEmailAllowed
                                ? msg("username")
                                : !realm.registrationEmailAsUsername
                                ? msg("usernameOrEmail")
                                : msg("email")}
                        </label>
                        <input
                            id="username"
                            name="username"
                            defaultValue={login.username ?? ""}
                            type="text"
                            autoFocus
                            autoComplete="username"
                            aria-invalid={messagesPerField.existsError("username", "password")}
                            disabled={auth?.selectedCredential !== undefined}
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontSize: "15px",
                                color: "#0f172a",
                                backgroundColor: "#ffffff",
                                boxSizing: "border-box",
                                outline: "none",
                                transition: "border-color 0.15s ease-in-out"
                            }}
                        />
                    </div>
                )}

                <div>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "6px"
                    }}>
                        <label
                            htmlFor="password"
                            style={{
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "#334155"
                            }}
                        >
                            {msg("password")}
                        </label>
                        {realm.resetPasswordAllowed && (
                            <a
                                href={url.loginResetCredentialsUrl}
                                style={{
                                    fontSize: "13px",
                                    color: "#2563eb",
                                    textDecoration: "none",
                                    fontWeight: 500
                                }}
                            >
                                Forgot password?
                            </a>
                        )}
                    </div>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        aria-invalid={messagesPerField.existsError("username", "password")}
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "15px",
                            color: "#0f172a",
                            backgroundColor: "#ffffff",
                            boxSizing: "border-box",
                            outline: "none",
                            transition: "border-color 0.15s ease-in-out"
                        }}
                    />
                </div>

                {realm.rememberMe && !usernameHidden && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                            id="rememberMe"
                            name="rememberMe"
                            type="checkbox"
                            defaultChecked={!!login.rememberMe}
                            style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                accentColor: "#2563eb"
                            }}
                        />
                        <label
                            htmlFor="rememberMe"
                            style={{
                                fontSize: "14px",
                                color: "#475569",
                                cursor: "pointer"
                            }}
                        >
                            Remember me
                        </label>
                    </div>
                )}

                <div style={{ marginTop: "8px" }}>
                    <input
                        type="hidden"
                        id="id-hidden-input"
                        name="credentialId"
                        value={auth?.selectedCredential}
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: "100%",
                            padding: "10px 16px",
                            backgroundColor: isSubmitting ? "#93c5fd" : "#2563eb",
                            color: "#ffffff",
                            fontSize: "15px",
                            fontWeight: 600,
                            border: "none",
                            borderRadius: "6px",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            transition: "background-color 0.15s ease-in-out"
                        }}
                    >
                        {isSubmitting ? "Signing in..." : "Sign In"}
                    </button>
                </div>
            </form>
        </Template>
    );
}
