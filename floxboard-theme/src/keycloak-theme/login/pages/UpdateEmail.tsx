import { useState } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../kcContext";
import type { I18n } from "../i18n";
import UserProfileFormFields from "keycloakify/login/UserProfileFormFields";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";

export default function UpdateEmail(
    props: PageProps<Extract<KcContext, { pageId: "update-email.ftl" }>, I18n> & {
        UserProfileFormFields?: typeof UserProfileFormFields;
        doMakeUserConfirmPassword?: boolean;
    }
) {
    const { kcContext, i18n, Template, doMakeUserConfirmPassword } = props;
    const { url, messagesPerField, isAppInitiatedAction } = kcContext;
    const { msg, msgStr } = i18n;

    const [isFormSubmittable, setIsFormSubmittable] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { kcClsx } = getKcClsx({
        doUseDefaultCss: false,
        classes: undefined
    });

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            displayMessage={messagesPerField.exists("global")}
            displayRequiredFields={true}
            headerNode={<span>{msg("updateEmailTitle")}</span>}
        >
            <form
                id="kc-update-email-form"
                action={url.loginAction}
                method="post"
                onSubmit={() => setIsSubmitting(true)}
            >
                <UserProfileFormFields
                    kcContext={kcContext}
                    i18n={i18n}
                    kcClsx={kcClsx}
                    onIsFormSubmittableValueChange={setIsFormSubmittable}
                    doMakeUserConfirmPassword={doMakeUserConfirmPassword}
                />

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
                            disabled={!isFormSubmittable || isSubmitting}
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
