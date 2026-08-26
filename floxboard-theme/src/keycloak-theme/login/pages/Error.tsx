import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../kcContext";
import type { I18n } from "../i18n";
import { kcSanitize } from "keycloakify/lib/kcSanitize";

export default function Error(
    props: PageProps<Extract<KcContext, { pageId: "error.ftl" }>, I18n>
) {
    const { kcContext, i18n, Template } = props;
    const { message, client, skipLink, pageRedirectUri } = kcContext;
    const { msg } = i18n;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            displayMessage={false}
            headerNode={<span>{msg("errorTitle")}</span>}
        >
            <div id="kc-error-message">
                <p
                    className="instruction"
                    dangerouslySetInnerHTML={{
                        __html: kcSanitize(message.summary)
                    }}
                />
                {!skipLink && client !== undefined && client.baseUrl !== undefined && (
                    <div id="kc-form-buttons">
                        <a
                            href={pageRedirectUri ?? client.baseUrl}
                            className="kcButtonClass kcButtonPrimaryClass"
                        >
                            {msg("backToApplication")}
                        </a>
                    </div>
                )}
            </div>
        </Template>
    );
}
