import { useState } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../kcContext";
import type { I18n } from "../i18n";
import { kcSanitize } from "keycloakify/lib/kcSanitize";

export default function LoginUpdatePassword(
    props: PageProps<Extract<KcContext, { pageId: "login-update-password.ftl" }>, I18n>
) {
    const { kcContext, i18n, Template } = props;
    const { url, messagesPerField, isAppInitiatedAction } = kcContext;
    const { msg, msgStr } = i18n;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPasswordNew, setShowPasswordNew] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            displayMessage={!messagesPerField.existsError("password", "password-confirm")}
            headerNode={<span>{msg("updatePasswordTitle")}</span>}
        >
            <form
                id="kc-passwd-update-form"
                action={url.loginAction}
                method="post"
                onSubmit={() => setIsSubmitting(true)}
            >
                <div className="form-group">
                    <label htmlFor="password-new" className="kcLabelClass">
                        {msg("passwordNew")}
                    </label>
                    <div className="kcInputGroup">
                        <input
                            type={showPasswordNew ? "text" : "password"}
                            id="password-new"
                            name="password-new"
                            className="kcInputClass"
                            autoFocus
                            autoComplete="new-password"
                            aria-invalid={messagesPerField.existsError("password", "password-confirm")}
                        />
                        <button
                            type="button"
                            className="kcFormPasswordVisibilityButtonClass"
                            aria-label={msgStr(showPasswordNew ? "hidePassword" : "showPassword")}
                            onClick={() => setShowPasswordNew(!showPasswordNew)}
                        >
                            <i className={showPasswordNew ? "kcFormPasswordVisibilityIconHide" : "kcFormPasswordVisibilityIconShow"} />
                        </button>
                    </div>
                    {messagesPerField.existsError("password") && (
                        <span
                            id="input-error-password"
                            className="kcInputErrorMessageClass"
                            aria-live="polite"
                            dangerouslySetInnerHTML={{
                                __html: kcSanitize(messagesPerField.get("password") ?? "")
                            }}
                        />
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="password-confirm" className="kcLabelClass">
                        {msg("passwordConfirm")}
                    </label>
                    <div className="kcInputGroup">
                        <input
                            type={showPasswordConfirm ? "text" : "password"}
                            id="password-confirm"
                            name="password-confirm"
                            className="kcInputClass"
                            autoComplete="new-password"
                            aria-invalid={messagesPerField.existsError("password", "password-confirm")}
                        />
                        <button
                            type="button"
                            className="kcFormPasswordVisibilityButtonClass"
                            aria-label={msgStr(showPasswordConfirm ? "hidePassword" : "showPassword")}
                            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                        >
                            <i className={showPasswordConfirm ? "kcFormPasswordVisibilityIconHide" : "kcFormPasswordVisibilityIconShow"} />
                        </button>
                    </div>
                    {messagesPerField.existsError("password-confirm") && (
                        <span
                            id="input-error-password-confirm"
                            className="kcInputErrorMessageClass"
                            aria-live="polite"
                            dangerouslySetInnerHTML={{
                                __html: kcSanitize(messagesPerField.get("password-confirm") ?? "")
                            }}
                        />
                    )}
                </div>

                <div className="form-group">
                    <div className="checkbox">
                        <label htmlFor="logout-sessions">
                            <input
                                type="checkbox"
                                id="logout-sessions"
                                name="logout-sessions"
                                value="on"
                                defaultChecked
                            />
                            {msg("logoutOtherSessions")}
                        </label>
                    </div>

                    <div id="kc-form-buttons">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="kcButtonClass kcButtonPrimaryClass"
                        >
                            {isSubmitting ? "Updating..." : msgStr("doSubmit")}
                        </button>
                        {isAppInitiatedAction && (
                            <button
                                type="submit"
                                name="cancel-aia"
                                value="true"
                                className="kcButtonDefaultClass"
                            >
                                {msg("doCancel")}
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </Template>
    );
}
