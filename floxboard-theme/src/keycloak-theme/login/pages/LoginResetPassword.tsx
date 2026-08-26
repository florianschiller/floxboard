import { useState } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../kcContext";
import type { I18n } from "../i18n";
import { kcSanitize } from "keycloakify/lib/kcSanitize";

export default function LoginResetPassword(
    props: PageProps<Extract<KcContext, { pageId: "login-reset-password.ftl" }>, I18n>
) {
    const { kcContext, i18n, Template } = props;
    const { url, realm, auth, messagesPerField } = kcContext;
    const { msg, msgStr } = i18n;

    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            displayInfo={true}
            displayMessage={!messagesPerField.existsError("username")}
            infoNode={realm.duplicateEmailsAllowed ? msg("emailInstructionUsername") : msg("emailInstruction")}
            headerNode={<span>{msg("emailForgotTitle")}</span>}
        >
            <form
                id="kc-reset-password-form"
                action={url.loginAction}
                method="post"
                onSubmit={() => setIsSubmitting(true)}
            >
                <div className="form-group">
                    <label htmlFor="username" className="kcLabelClass">
                        {!realm.loginWithEmailAllowed
                            ? msg("username")
                            : !realm.registrationEmailAsUsername
                            ? msg("usernameOrEmail")
                            : msg("email")}
                    </label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        className="kcInputClass"
                        autoFocus
                        defaultValue={auth.attemptedUsername ?? ""}
                        aria-invalid={messagesPerField.existsError("username")}
                    />
                    {messagesPerField.existsError("username") && (
                        <span
                            id="input-error-username"
                            className="kcInputErrorMessageClass"
                            aria-live="polite"
                            dangerouslySetInnerHTML={{
                                __html: kcSanitize(messagesPerField.get("username") ?? "")
                            }}
                        />
                    )}
                </div>

                <div id="kc-form-buttons">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="kcButtonClass kcButtonPrimaryClass"
                    >
                        {isSubmitting ? "Sending..." : msgStr("doSubmit")}
                    </button>
                    <a
                        href={url.loginUrl}
                        className="kcButtonDefaultClass"
                    >
                        {msg("backToLogin")}
                    </a>
                </div>
            </form>
        </Template>
    );
}
