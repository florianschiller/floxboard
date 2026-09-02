import { lazy, Suspense } from "react";
import type { KcContext } from "./kcContext";
import { useI18n } from "./i18n";
import { Template } from "./Template";
import DefaultPage from "keycloakify/login/DefaultPage";
import UserProfileFormFields from "keycloakify/login/UserProfileFormFields";

const Login = lazy(() => import("./pages/Login"));
const LoginUpdatePassword = lazy(() => import("./pages/LoginUpdatePassword"));
const UpdateEmail = lazy(() => import("./pages/UpdateEmail"));
const LoginResetPassword = lazy(() => import("./pages/LoginResetPassword"));
const LoginUpdateProfile = lazy(() => import("./pages/LoginUpdateProfile"));
const Register = lazy(() => import("./pages/Register"));
const LoginVerifyEmail = lazy(() => import("./pages/LoginVerifyEmail"));
const Info = lazy(() => import("./pages/Info"));
const Error = lazy(() => import("./pages/Error"));

export function KcPage(props: { kcContext: KcContext }) {
    const { kcContext } = props;
    const { i18n } = useI18n({ kcContext });

    return (
        <Suspense>
            {(() => {
                switch (kcContext.pageId) {
                    case "login.ftl":
                        return (
                            <Login
                                {...{ kcContext, i18n, Template }}
                                doUseDefaultCss={false}
                            />
                        );
                    case "login-update-password.ftl":
                        return (
                            <LoginUpdatePassword
                                {...{ kcContext, i18n, Template }}
                                doUseDefaultCss={false}
                            />
                        );
                    case "update-email.ftl":
                        return (
                            <UpdateEmail
                                {...{ kcContext, i18n, Template, UserProfileFormFields }}
                                doUseDefaultCss={false}
                                doMakeUserConfirmPassword={false}
                            />
                        );
                    case "login-reset-password.ftl":
                        return (
                            <LoginResetPassword
                                {...{ kcContext, i18n, Template }}
                                doUseDefaultCss={false}
                            />
                        );
                    case "login-update-profile.ftl":
                        return (
                            <LoginUpdateProfile
                                {...{ kcContext, i18n, Template, UserProfileFormFields }}
                                doUseDefaultCss={false}
                                doMakeUserConfirmPassword={false}
                            />
                        );
                    case "register.ftl":
                        return (
                            <Register
                                {...{ kcContext, i18n, Template, UserProfileFormFields }}
                                doUseDefaultCss={false}
                                doMakeUserConfirmPassword={false}
                            />
                        );
                    case "login-verify-email.ftl":
                        return (
                            <LoginVerifyEmail
                                {...{ kcContext, i18n, Template }}
                                doUseDefaultCss={false}
                            />
                        );
                    case "info.ftl":
                        return (
                            <Info
                                {...{ kcContext, i18n, Template }}
                                doUseDefaultCss={false}
                            />
                        );
                    case "error.ftl":
                        return (
                            <Error
                                {...{ kcContext, i18n, Template }}
                                doUseDefaultCss={false}
                            />
                        );
                    default:
                        return (
                            <DefaultPage
                                kcContext={kcContext}
                                i18n={i18n}
                                classes={undefined}
                                Template={Template}
                                doUseDefaultCss={false}
                                UserProfileFormFields={UserProfileFormFields}
                                doMakeUserConfirmPassword={false}
                            />
                        );
                }
            })()}
        </Suspense>
    );
}
