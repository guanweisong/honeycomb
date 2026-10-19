# Admin render smoke tests

`render.spec.ts` adds 25 independent, read-only browser cases:

- Dashboard; post/page lists and both new/seeded edit forms; categories,
  comments, tags, users, links, media, menu, and site settings.
- All five account-security panels (Passkey, password, sessions, linked
  accounts, login history).
- The three redirect entries (`/admin`, `/admin/post`, `/admin/page`), login,
  and forbidden pages.

Run with the existing local migration/seed and Playwright setup. These tests
are included automatically in `test:e2e:development` and `test:e2e:smoke`.
No CI gates, workers, retries, or existing tests are removed or changed.

The seed's existing `E2E_SEED=1` and local `file:` database guard protects a
separate `page-smoke-admin` account. The existing guest is unchanged. Never
point the test server at a production database. The fixture additionally
requires the same seed opt-in/local database and rejects non-loopback browser
base URLs. The authenticated group runs in default (not serial) mode so it
reuses one login without weakening global workers or production rate limits.

Authentication uses the real username/password endpoint with the existing
Turnstile test token, then keeps storage state in memory once per worker.
Every case has a fresh browser context. Application reads use the real local
backend, not mocked ADMIN/session/tRPC responses. The test account and content
are disposable local fixtures; forms are never submitted. Existing post/page
seed IDs supply edit data, so cases need no creation/deletion or shared mutable
content. Authentication itself creates a session and login-history entry.

Assertions check route-specific content, loaded data/valid empty states, and
successful relevant API reads, not just HTTP 200 or a mounted shell. Uncaught
`pageerror` events fail the case; framework console diagnostics are distinct.
There are no fixed sleeps. Redirect entries check their destination; its
content is independently covered by the corresponding page case.

This is render coverage, not CRUD, production data, real CAPTCHA challenges,
email delivery, external OAuth, Passkey registration, or storage integration
coverage. Login UI rendering and real password API sign-in are covered, not
an interactive CAPTCHA/login submission flow. The media/link fixtures may
legitimately be empty. Modal dialogs and every post type/locale are not separate
routes and are not exhaustively exercised here.
