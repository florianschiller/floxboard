<#import "template.ftl" as layout>
<@layout.emailLayout>
    <p>Hello ${user.firstName!user.username},</p>
    <p>We received a request to reset your floxBoard password. Click the button below to choose a new password:</p>
    <p>
        <a href="${link}" class="button">Reset Password</a>
    </p>
    <p>This link will expire in ${linkExpirationFormatter(linkExpiration)}.</p>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
</@layout.emailLayout>
