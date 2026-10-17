# Personal password login — current setup

The app now uses a single personal password instead of Supabase email links.
The generated password is stored only in `.imports/private-login.txt` on this
laptop. That directory is excluded from Git and Vercel uploads. The production
server stores a salted scrypt hash and a separate session-signing secret in
Vercel environment variables. Sessions use Secure, HttpOnly, SameSite=Strict
cookies and expire after 30 days. Rotating the hash or signing secret invalidates
existing sessions. The login route has best-effort per-instance throttling.

No email address, email delivery, or magic-link redirect is needed to sign in.

The app's catalog APIs check the signed cookie on every request. The existing
public catalog in Supabase is unchanged. **Before applying the database access
migration, configure `SUPABASE_SERVICE_ROLE_KEY` as a server-only variable.**
The previous email-based RLS migration expects a Supabase user JWT, which the
password cookie does not issue. Without a service-role server key, enabling
those old policies would prevent this app from reading the catalog.

Collection, wishlist and confirmed-match history remain browser-local, with
backup export and restore. Camera input is ready; automatic matching still
requires AI_GATEWAY_API_KEY and SCAN_MODEL. eBay uses external sold-search links;
live in-app sold data still needs an approved source.

## Previous email sign-in setup (historical)

# Pinfolio personal app setup

## What works now

- Supabase email sign-in, restricted in the app API to `connorc1232@icloud.com`.
- Mobile-first Home, Explore, Scan, Collection and History views.
- Authenticated catalog search, details and source-linked images.
- Owned pins, wishlist and confirmed scan history saved in this browser.
- Collection and history export/restore.
- Pin-specific eBay sold-listing searches, clearly separate from live sold data.
- Camera/gallery input with local image resizing; photos are not persisted.

## Finish Supabase setup

The available project credentials are the public anon key, not database admin
credentials. Application routes enforce sign-in already, but this alone does
not change direct Supabase database access. Run this prepared migration in the
Supabase SQL editor to restrict catalog access at the database layer:

`supabase/migrations/20261017_personal_access.sql`

In Authentication → URL Configuration, add:

- Site URL: `https://disney-pin-db.vercel.app`
- Redirect URL: `https://disney-pin-db.vercel.app/auth/callback`
- For local testing: `http://localhost:3017/auth/callback`

Email sign-in must be enabled. Request a sign-in email from the app. If the email
redirect is not configured, choose **Already have a sign-in link?** in the app
and paste either the original email link or the entire failed localhost URL
from Safari's address bar, including its # fragment, into the verification
field. An already-verified redirect includes a session and can be recovered
without verifying the same one-time email token again. Do not share that link; it grants a session.

The app checks the user with Supabase Auth on every catalog API call and rejects
all emails except the configured owner. Public catalog access remains as it was
until the migration is applied. Collection/history are browser-local, not cloud
synchronized. Export before clearing browser data or changing devices.

## Enable photo matching

Configure server-only Vercel environment variables:

- `AI_GATEWAY_API_KEY`: your Vercel AI Gateway key.
- `SCAN_MODEL`: a current Gateway model supporting image input and structured
  output. Verify the model in the Gateway catalog before choosing it.

Redeploy after setting these. No AI calls are made when these settings are absent.
The feature makes up to two model calls per submitted photo: image description
and search phrases, then visual comparison against up to 12 catalog candidates.
The app always asks the user to confirm a match. This is a candidate retrieval
prototype, not a trained pin-recognition model; validation on real photos is
still needed. Photographs go to the configured AI provider during matching but
are not stored in this app or Supabase.

No extra Brave calls are used. The previous import's spend checkpoint is intact.

## Live eBay sales

The app opens eBay with sold/completed filters for each selected pin. It does not
scrape eBay, connect to the other app's backend, or fabricate sale prices. Actual
in-app sales history requires an approved data source and separate credentials.
Marketplace Insights access is restricted; a standard Browse API token is not
proof of access to sold sales history.

## Database demo and eBay

The home page's demo selection loads twelve distinct, image-linked catalog records from Supabase through the authenticated `/api/demo-pins` endpoint. These are actual catalog pins; opening or saving them does not create duplicate rows or fake scan history.

Set server-only `EBAY_CLIENT_ID` (production App ID) and `EBAY_CLIENT_SECRET` (production Cert ID) locally and in Vercel Production. The `/api/ebay?id=<catalog UUID>` endpoint resolves the title from Supabase, obtains an app OAuth token, and searches eBay US Browse for up to six newly listed Disney pin offers. OAuth tokens and results stay server-side; successful results cache for five minutes per instance. No purchases are made. The panel labels asking prices/current bids separately from sales and retains active/sold website searches when eBay is unavailable.

Production Browse access must be enabled for the keyset. Sold history is a separate, restricted eBay Marketplace Insights capability and is not supplied by Browse. Current sold links open eBay's website; no simulated sale prices are displayed.

Validation: `node --experimental-strip-types --test scripts/ebay.test.mjs`, `npm run lint`, `npm run build`.
