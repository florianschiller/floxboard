import { useState } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../kcContext";
import type { I18n } from "../i18n";
import UserProfileFormFields from "keycloakify/login/UserProfileFormFields";
import { getKcClsx } from "keycloakify/login/lib/kcClsx";

export default function Register(
    props: PageProps<Extract<KcContext, { pageId: "register.ftl" }>, I18n>
) {
    const { kcContext, i18n, Template, doMakeUserConfirmPassword } = props;
    const { url, messagesPerField } = kcContext;
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
            headerNode={<span>{msg("registerTitle")}</span>}
            infoNode={
                <div>
                    <span>{msg("alreadyHaveAccount")} </span>
                    <a href={url.loginUrl}>{msg("doLogIn")}</a>
                </div>
            }
        >
            <form
                id="kc-register-form"
                action={url.registrationAction}
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

                <div id="kc-form-buttons">
                    <button
                        type="submit"
                        disabled={!isFormSubmittable || isSubmitting}
                        className="kcButtonClass kcButtonPrimaryClass"
                    >
                        {isSubmitting ? "Registering..." : msgStr("doRegister")}
                    </button>
                </div>
            </form>
        </Template>
    );
}
