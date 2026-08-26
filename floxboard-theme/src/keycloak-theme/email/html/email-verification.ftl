<#import "template.ftl" as layout>
<@layout.emailLayout>
    <p>Hello ${user.firstName!user.username},</p>
    <p>Please verify your email address for your floxBoard account by clicking the button below:</p>
    <p>
        <a href="${link}" class="button">Verify Email</a>
    </p>
    <p>This link will expire in ${linkExpirationFormatter(linkExpiration)}.</p>
    <p>If you did not create a floxBoard account, please ignore this email.</p>
</@layout.emailLayout>
