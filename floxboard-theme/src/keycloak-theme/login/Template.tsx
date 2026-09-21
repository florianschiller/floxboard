import { useEffect } from "react";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import { useInitialize } from "keycloakify/login/Template.useInitialize";
import type { KcContext } from "./kcContext";
import type { I18n } from "./i18n";
import "../../main.css";

export function Template(props: TemplateProps<KcContext, I18n>) {
    const {
        kcContext,
        children,
        displayMessage = true,
        headerNode,
        socialProvidersNode,
        infoNode,
        documentTitle,
        bodyClassName
    } = props;

    const { message } = kcContext;

    useEffect(() => {
        document.title = documentTitle ?? "floxBoard - Sign in";
        if (bodyClassName) {
            document.body.className = bodyClassName;
        }
    }, [documentTitle, bodyClassName]);

    const { isReadyToRender } = useInitialize({
        kcContext,
        doUseDefaultCss: false
    });

    if (!isReadyToRender) {
        return null;
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 16px",
            backgroundColor: "var(--bg-color)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-family)"
        }}>
            <div style={{
                width: "100%",
                maxWidth: "440px",
                backgroundColor: "var(--card-bg)",
                borderRadius: "12px",
                border: "1px solid var(--card-border)",
                boxShadow: "var(--card-shadow)",
                padding: "36px 32px",
                boxSizing: "border-box"
            }}>
                {/* Brand Header */}
                <div style={{ textAlign: "center", marginBottom: "28px" }}>
                    <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "12px"
                    }}>
                        <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            backgroundColor: "var(--primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff",
                            fontWeight: "bold",
                            fontSize: "20px"
                        }}>
                            f
                        </div>
                        <span style={{
                            fontSize: "24px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            letterSpacing: "-0.5px"
                        }}>
                            floxBoard
                        </span>
                    </div>
                    {headerNode && (
                        <div style={{
                            fontSize: "15px",
                            color: "var(--text-secondary)",
                            marginTop: "4px"
                        }}>
                            {headerNode}
                        </div>
                    )}
                </div>

                {/* Feedback Message */}
                {displayMessage && message !== undefined && (message.type !== "warning" || !props.displayRequiredFields) && (
                    <div style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        marginBottom: "20px",
                        fontSize: "14px",
                        lineHeight: 1.5,
                        backgroundColor:
                            message.type === "success" ? "var(--success-bg)" :
                            message.type === "warning" ? "var(--warning-bg)" :
                            message.type === "error" ? "var(--error-bg)" : "var(--info-bg)",
                        border: `1px solid ${
                            message.type === "success" ? "var(--success-border)" :
                            message.type === "warning" ? "var(--warning-border)" :
                            message.type === "error" ? "var(--error-border)" : "var(--info-border)"
                        }`,
                        color:
                            message.type === "success" ? "var(--success-text)" :
                            message.type === "warning" ? "var(--warning-text)" :
                            message.type === "error" ? "var(--error-text)" : "var(--info-text)"
                    }}>
                        {message.summary}
                    </div>
                )}

                {/* Content */}
                <div>
                    {children}
                </div>

                {/* Social Providers */}
                {socialProvidersNode && (
                    <div style={{ marginTop: "24px" }}>
                        {socialProvidersNode}
                    </div>
                )}

                {/* Info Node */}
                {infoNode && (
                    <div style={{
                        marginTop: "24px",
                        paddingTop: "20px",
                        borderTop: "1px solid var(--border-light)",
                        fontSize: "14px",
                        color: "var(--text-secondary)",
                        textAlign: "center"
                    }}>
                        {infoNode}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                marginTop: "24px",
                fontSize: "13px",
                color: "var(--text-muted)"
            }}>
                &copy; floxBoard &bull; Secure Authentication
            </div>
        </div>
    );
}
