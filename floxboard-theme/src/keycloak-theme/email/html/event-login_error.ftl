<#import "template.ftl" as layout>
<@layout.emailLayout>
    <p>Hello ${user.firstName!user.username},</p>
    <p>A failed login attempt to your floxBoard account was detected on ${event.date} from IP address ${event.ipAddress}.</p>
    <p>If this was not you, we strongly recommend that you reset your password immediately.</p>
</@layout.emailLayout>
