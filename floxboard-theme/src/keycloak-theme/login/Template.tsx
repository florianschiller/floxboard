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
            backgroundColor: "#f8fafc",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}>
            <div style={{
                width: "100%",
                maxWidth: "440px",
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
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
                            backgroundColor: "#2563eb",
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
                            color: "#0f172a",
                            letterSpacing: "-0.5px"
                        }}>
                            floxBoard
                        </span>
                    </div>
                    {headerNode && (
                        <div style={{
                            fontSize: "15px",
                            color: "#64748b",
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
                            message.type === "success" ? "#ecfdf5" :
                            message.type === "warning" ? "#fffbeb" :
                            message.type === "error" ? "#fef2f2" : "#eff6ff",
                        border: `1px solid ${
                            message.type === "success" ? "#a7f3d0" :
                            message.type === "warning" ? "#fde68a" :
                            message.type === "error" ? "#fecaca" : "#bfdbfe"
                        }`,
                        color:
                            message.type === "success" ? "#065f46" :
                            message.type === "warning" ? "#92400e" :
                            message.type === "error" ? "#991b1b" : "#1e40af"
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
                        borderTop: "1px solid #e2e8f0",
                        fontSize: "14px",
                        color: "#64748b",
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
                color: "#94a3b8"
            }}>
                &copy; floxBoard &bull; Secure Authentication
            </div>
        </div>
    );
}
