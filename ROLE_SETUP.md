# ARF CRM — shared cloud data and role setup

## Shared data
ARF CRM reads and writes the shared Firestore collections `leads`, `machines`, and `docs`. Any authorized employee signing in from another browser or device sees the same cloud records. New records also record the creator's UID, email, and display name where available.

## Roles
- **Admin** — all modules, all write actions, permanent delete, and team role management.
- **Sales** — dashboard/leads and create quotations, proforma invoices, and delivery challans.
- **Accounts** — dashboard, billing, tax invoices, and invoice-related stock deductions; inventory is read-only.
- **Inventory** — inventory catalog and stock updates; no billing module.
- **View Only** — read-only dashboard, inventory, and billing.

The initial administrator email configured in the app and rules is `mdkhurshidalam401@gmail.com`. Change it in both `index.html` and `firestore.rules` if the Firebase owner account is different.

## Required one-time setup
1. Open Firebase Console for project `arf-crm-75bdf`.
2. Go to **Authentication → Users → Add user** and create each employee's email/password account. Do not share passwords.
3. Copy the new user's UID from Authentication.
4. Sign in to ARF CRM as the administrator, open **Team & Roles**, and enter that exact UID, email, name, and role.
5. Deploy the Firestore rules from the repository root so role checks are enforced by the database, not just the UI:

```powershell
firebase login
firebase deploy --only firestore:rules --project arf-crm-75bdf
```

If you use a different Firebase CLI account, ensure it has permission to deploy rules to this project. Do not leave permissive/test Firestore rules enabled.

## Important
The role-based UI is not a substitute for Firestore security rules. Until `firestore.rules` is deployed, the new database-level role restrictions are not active. GitHub Pages deployment only publishes the website; it does not deploy Firestore rules.
