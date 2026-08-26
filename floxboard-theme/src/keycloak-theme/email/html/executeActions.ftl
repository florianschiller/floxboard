<#import "template.ftl" as layout>
<@layout.emailLayout>
    <p>Hello ${user.firstName!user.username},</p>
    <p>Your floxBoard administrator has requested that you update your account by completing the following actions:</p>
    <p>
        <a href="${link}" class="button">Update Account</a>
    </p>
    <p>This link will expire in ${linkExpirationFormatter(linkExpiration)}.</p>
    <p>If you are unaware of this request, please contact your administrator.</p>
</@layout.emailLayout>
