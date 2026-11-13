# Authentication & Users

Servobill keeps its own user list. Every user is either an **administrator** or a
**regular user**:

| | Regular user | Administrator |
|---|---|---|
| Invoices, offers, expenses, customers, products, inventory, reports | ✅ | ✅ |
| Change settings, templates, categories, danger zone | ❌ | ✅ |
| Create, edit, disable and delete users | ❌ | ✅ |

Users can sign in with any combination of:

- **Local password** (email + password, stored as a salted scrypt hash)
- **Google** (the original sign in, needs only `OAUTH_CLIENT_ID`)
- **Any OpenID Connect provider** such as Zitadel, Keycloak, Authentik or Authelia

All settings are environment variables and work the same in the serverless
(AWS/SST) and the dockerized deployment.

## General settings

| Variable | Description |
|---|---|
| `JWT_SECRET` | Required. Secret used to sign session cookies. |
| `ALLOWED_EMAILS` | Comma separated emails. A person with one of these (verified) emails who signs in with Google/OIDC for the first time gets a user automatically. |
| `ADMIN_EMAILS` | Comma separated emails that are always administrators (also a recovery path if you lock yourself out). |

When the first user is created from `ALLOWED_EMAILS` and no administrator exists
yet, that user becomes administrator. Existing single-user installations
therefore keep working without changes: the owner signs in again and is admin.

## Local users

| Variable | Description |
|---|---|
| `LOCAL_AUTH_ENABLED` | `true` shows the email/password form and lets administrators set passwords. |
| `INITIAL_ADMIN_EMAIL` | Bootstrap: email of the first administrator. |
| `INITIAL_ADMIN_PASSWORD` | Bootstrap: password of the first administrator (min. 10 characters). |
| `INITIAL_ADMIN_NAME` | Optional display name, defaults to `Administrator`. |

The initial administrator is created on the first successful sign in with these
credentials, and only while no active administrator exists. Change the password
under *My Account* afterwards and remove `INITIAL_ADMIN_PASSWORD` from your
environment.

Administrators manage users under *Users* (user menu → Users). A user can have a
password, linked providers or both. Users without a password sign in through a
provider whose verified email matches their email address; the provider account
is linked on the first sign in.

Failed password sign ins are rate limited per email address in memory (per
container/Lambda instance). Put a rate limiting reverse proxy or WAF in front of
public instances.

## OpenID Connect providers (e.g. Zitadel)

Servobill uses the authorization code flow with PKCE and validates ID tokens
against the provider's published keys (discovery via
`<issuer>/.well-known/openid-configuration`).

List the providers in `OIDC_PROVIDERS` and configure each with
`OIDC_<ID>_*` variables (`<ID>` upper-cased, `-` becomes `_`):

| Variable | Description |
|---|---|
| `OIDC_PROVIDERS` | Comma separated provider ids, e.g. `zitadel` or `zitadel,company-sso`. |
| `OIDC_<ID>_ISSUER` | Issuer URL, e.g. `https://auth.example.com`. Required. |
| `OIDC_<ID>_CLIENT_ID` | Client id. Required. |
| `OIDC_<ID>_CLIENT_SECRET` | Client secret. Leave empty for public (PKCE only) clients. |
| `OIDC_<ID>_TOKEN_AUTH_METHOD` | `client_secret_basic` (default with secret), `client_secret_post` or `none` (default without secret). |
| `OIDC_<ID>_NAME` | Button label ("Sign in with …"). Defaults to the id. |
| `OIDC_<ID>_SCOPES` | Defaults to `openid email profile`. |
| `OIDC_<ID>_AUTO_PROVISION` | `true` creates a regular user for everyone who can sign in at this provider. Default `false`: only existing users, `ALLOWED_EMAILS` and `ADMIN_EMAILS`. |
| `OIDC_<ID>_REQUIRE_VERIFIED_EMAIL` | Default `true`. Unverified emails are never matched to users. |
| `OIDC_<ID>_ROLES_CLAIM` | Optional claim with the user's roles. Plain names and dot paths (`realm_access.roles`) work. |
| `OIDC_<ID>_ADMIN_ROLES` | Comma separated role values that make a user administrator. When set together with the roles claim, the role is synced on every sign in. |

For a single provider you can also drop the id: `OIDC_ISSUER`, `OIDC_CLIENT_ID`,
`OIDC_CLIENT_SECRET`, … (the provider id is then `oidc`).

The redirect URI to register at the provider is:

```
https://<your-api-host>/api/auth/oidc-callback
```

In the dockerized deployment that is the app's URL. In the serverless deployment
it is `https://api.<SITE_DOMAIN>/api/auth/oidc-callback`.

### Example: Zitadel

1. In Zitadel create a project and inside it an application of type **Web**.
   Choose **PKCE** (no secret) or **Code** (client secret, method *Basic*).
2. Add the redirect URI from above. Optionally add the post logout URI of your app.
3. Enable *User roles inside ID token* / *User Info inside ID Token* in the
   application's token settings, or rely on Servobill's userinfo lookup.
4. Optionally create a project role such as `servobill-admin` and assign it.

```bash
OIDC_PROVIDERS=zitadel
OIDC_ZITADEL_NAME=Zitadel
OIDC_ZITADEL_ISSUER=https://auth.example.com
OIDC_ZITADEL_CLIENT_ID=123456789@servobill
# OIDC_ZITADEL_CLIENT_SECRET=...            # only for "Code" applications
OIDC_ZITADEL_SCOPES="openid email profile urn:zitadel:iam:org:project:roles"
OIDC_ZITADEL_ROLES_CLAIM=urn:zitadel:iam:org:project:roles
OIDC_ZITADEL_ADMIN_ROLES=servobill-admin
# OIDC_ZITADEL_AUTO_PROVISION=true          # everyone in the Zitadel project may sign in
```

### Google as generic OIDC provider

The original Google sign in (`OAUTH_CLIENT_ID`) keeps working and uses the
redirect URI `/api/auth/callback`. Alternatively configure Google like any other
provider with `OIDC_GOOGLE_*`… except that `google` is reserved: use an id such as
`gmail` with issuer `https://accounts.google.com` and a client secret.

## Sessions

After sign in you get a short-lived session cookie (30 minutes) and a long-lived
refresh cookie. On every refresh the user is loaded from the database, so role
changes, disabling and deleting users take effect within 30 minutes.

Upgrading from a version without user management invalidates existing refresh
tokens once: everyone signs in again and is provisioned as described above.
