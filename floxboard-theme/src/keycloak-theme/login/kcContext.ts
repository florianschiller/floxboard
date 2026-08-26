import { createGetKcContextMock } from "keycloakify/login/KcContext";

export type KcContext = import("keycloakify/login/KcContext").KcContext;

export const { getKcContextMock } = createGetKcContextMock({
    mockData: [
        {
            pageId: "login.ftl",
            locale: {
                currentLanguageTag: "en"
            }
        }
    ]
});

export const kcContext = typeof window !== "undefined" && typeof (window as any).kcContext !== "undefined"
    ? ((window as any).kcContext as KcContext)
    : undefined;
