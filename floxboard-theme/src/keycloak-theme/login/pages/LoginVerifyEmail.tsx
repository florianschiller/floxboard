import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../kcContext";
import type { I18n } from "../i18n";

export default function LoginVerifyEmail(
    props: PageProps<Extract<KcContext, { pageId: "login-verify-email.ftl" }>, I18n>
) {
    const { kcContext, i18n, Template } = props;
    const { msg } = i18n;
    const { url, user } = kcContext;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={false}
            displayMessage={false}
            headerNode={<span>{msg("emailVerifyTitle")}</span>}
        >
            <div id="kc-info-message">
                <p className="instruction">
                    {msg("emailVerifyInstruction1", user?.email ?? "")}
                </p>
                <p className="instruction">
                    {msg("emailVerifyInstruction2")}{" "}
                    <a
                        href={url.loginAction}
                        style={{
                            color: "var(--primary)",
                            fontWeight: 500,
                            textDecoration: "none"
                        }}
                    >
                        {msg("doClickHere")}
                    </a>{" "}
                    {msg("emailVerifyInstruction3")}
                </p>
            </div>
        </Template>
    );
}
