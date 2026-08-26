import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { KcPage } from "./keycloak-theme/login/KcPage";
import { kcContext } from "./keycloak-theme/login/kcContext";
import "./main.css";

const rootElement = document.getElementById("root");

if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            {(() => {
                if (kcContext !== undefined) {
                    return <KcPage kcContext={kcContext} />;
                }
                return (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100vh",
                        fontFamily: "sans-serif"
                    }}>
                        <h1>floxBoard Keycloak Theme</h1>
                    </div>
                );
            })()}
        </StrictMode>
    );
}
