package de.einfloh.floxboard.notification.infrastructure.templates

import kotlinx.html.*
import kotlinx.html.stream.createHTML

object EmailTemplates {

    private const val DEFAULT_STYLES = """
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }
        .header {
            margin-bottom: 24px;
        }
        .header h1 {
            color: #0f172a;
            font-size: 24px;
            margin: 0;
        }
        .content {
            margin-bottom: 28px;
            font-size: 16px;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            font-size: 16px;
        }
        .footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            font-size: 13px;
            color: #64748b;
        }
    """

    fun collaboratorInvite(
        username: String,
        whiteboardName: String,
        role: String,
        boardUrl: String
    ): String = "<!DOCTYPE html>\n" + createHTML().html {
        head {
            meta(charset = "utf-8")
            meta(name = "viewport", content = "width=device-width, initial-scale=1.0")
            title { +"Invitation to collaborate on $whiteboardName" }
            style {
                unsafe {
                    +DEFAULT_STYLES
                }
            }
        }
        body {
            div(classes = "container") {
                div(classes = "header") {
                    h1 { +"floxBoard" }
                }
                div(classes = "content") {
                    p { +"Hello, $username!" }
                    p {
                        +"You have been invited as a "
                        strong { +role }
                        +" on the whiteboard "
                        strong { +"'$whiteboardName'" }
                        +"."
                    }
                    p {
                        a(href = boardUrl, classes = "button") {
                            +"Open Whiteboard"
                        }
                    }
                }
                div(classes = "footer") {
                    p { +"This is an automated notification from floxBoard." }
                }
            }
        }
    }

    fun accessRequestResolved(
        username: String,
        whiteboardName: String,
        approved: Boolean,
        role: String?,
        boardUrl: String
    ): String = "<!DOCTYPE html>\n" + createHTML().html {
        head {
            meta(charset = "utf-8")
            meta(name = "viewport", content = "width=device-width, initial-scale=1.0")
            title {
                if (approved) {
                    +"Access Request Approved: $whiteboardName"
                } else {
                    +"Access Request Rejected: $whiteboardName"
                }
            }
            style {
                unsafe {
                    +DEFAULT_STYLES
                }
            }
        }
        body {
            div(classes = "container") {
                div(classes = "header") {
                    h1 { +"floxBoard" }
                }
                div(classes = "content") {
                    p { +"Hello, $username!" }
                    if (approved) {
                        p {
                            +"Your request to access the whiteboard "
                            strong { +"'$whiteboardName'" }
                            +" has been "
                            strong { +"approved" }
                            +"."
                        }
                        if (role != null) {
                            p {
                                +"You have been granted "
                                strong { +role }
                                +" access."
                            }
                        }
                        p {
                            a(href = boardUrl, classes = "button") {
                                +"Open Whiteboard"
                            }
                        }
                    } else {
                        p {
                            +"Your request to access the whiteboard "
                            strong { +"'$whiteboardName'" }
                            +" was rejected."
                        }
                    }
                }
                div(classes = "footer") {
                    p { +"This is an automated notification from floxBoard." }
                }
            }
        }
    }
}
