import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../kcContext";
import type { I18n } from "../i18n";
import { kcSanitize } from "keycloakify/lib/kcSanitize";

export default function Info(
    props: PageProps<Extract<KcContext, { pageId: "info.ftl" }>, I18n>
) {
    const { kcContext, i18n, Template } = props;
    const { advancedMsgStr, msg } = i18n;
    const { messageHeader, message, requiredActions, skipLink, pageRedirectUri, actionUri, client } = kcContext;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            displayMessage={false}
            headerNode={
                <span>
                    {messageHeader ? advancedMsgStr(messageHeader) : message.summary}
                </span>
            }
        >
            <div id="kc-info-message">
                <p
                    className="instruction"
                    dangerouslySetInnerHTML={{
                        __html: kcSanitize((() => {
                            let html = message.summary?.trim() ?? "";
                            if (requiredActions) {
                                html += " <b>";
                                html += requiredActions.map(requiredAction => advancedMsgStr(`requiredAction.${requiredAction}`)).join(", ");
                                html += "</b>";
                            }
                            return html;
                        })())
                    }}
                />
                {!skipLink && (
                    <div id="kc-form-buttons">
                        {pageRedirectUri && (
                            <a href={pageRedirectUri} className="kcButtonClass kcButtonPrimaryClass">
                                {msg("backToApplication")}
                            </a>
                        )}
                        {actionUri && (
                            <a href={actionUri} className="kcButtonClass kcButtonPrimaryClass">
                                {msg("proceedWithAction")}
                            </a>
                        )}
                        {client.baseUrl && !pageRedirectUri && !actionUri && (
                            <a href={client.baseUrl} className="kcButtonClass kcButtonPrimaryClass">
                                {msg("backToApplication")}
                            </a>
                        )}
                    </div>
                )}
            </div>
        </Template>
    );
}
