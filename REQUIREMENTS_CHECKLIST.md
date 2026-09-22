# Revision 2 checklist

| Requirement | Implementation |
|---|---|
| Admin/User logins; Staff without login | Separate User and Staff models; legacy login role migration |
| Register Staff | Admin-only name and phone form |
| No seller selection on customer creation | Authenticated Saved By |
| Tables everywhere | Recent, History and document records |
| Multiple documents | Staff, upload time, eye link, Send, Replace, Saved By per document |
| Temporary Recent | In-memory list; upload/create moves customer to top |
| History | Pagination, newest/oldest order, date/time filters |
| Live search | Name/city dropdown opens record |
| Admin-only metrics | Hidden for Users and protected by API role check |
| Fixed sender, current actor receiver | Server derives recipient from authenticated User/Admin |
| Rolling retention | Hourly/startup job, calendar-month cutoff, failed deletions retried |

See UPGRADE-REVISION-2.md for configuration, migration and verification limits.
