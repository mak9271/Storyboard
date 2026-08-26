# Storyboard Shot Builder v3.8.2.1 — Cache Fix

This is the same v3.8.2 feature build, repackaged with corrected asset versioning.

Important fix:
- `index.html` now loads `styles.css?v=3821`
- `index.html` now loads `app.js?v=3821`
- `index.html` now loads `config.js?v=3821`
- added no-cache metadata and `_headers`
- God View toast moved outside Camera View so it can display from either view

Why this was needed:
The previous v3.8.2 package still referenced `styles.css?v=381` and `app.js?v=381`, so a browser/CDN could keep serving the old v3.8.1 CSS and JavaScript even after the GitHub files were replaced.

No new Supabase SQL is required.
