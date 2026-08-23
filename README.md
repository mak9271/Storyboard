# Storyboard Shot Builder v2

Version 2 includes:

- Full English interface
- Mobile-friendly shot builder
- Dedicated **Storyboard Sheet** view
- View all shots as paginated storyboard sheets
- Select **4 / 6 / 8 / 9 / 12 shots per page**
- Print / Save storyboard sheets as PDF
- Shot images, metadata and one-line descriptions included in each storyboard card
- JSON export/import
- Automatic browser storage
- Mobile bottom navigation
- Ready for the next phase: AI storyboard generation

## Updating the existing Cloudflare deployment

Upload these three replacement files to the same Cloudflare Worker static deployment:

- `index.html`
- `styles.css`
- `app.js`

`README.md` is optional.

If Cloudflare's direct static upload creates a new deployment, use the same Worker name (`storyboard`) so the public URL remains associated with that Worker.

## AI phase
The next step is to add an AI generation layer that turns shot settings + description into a storyboard image while preserving:
- character consistency
- costume consistency
- aspect ratio
- shot size
- camera angle
- lighting
- recurring location/set style

For a zero-owner-cost architecture, the safest approach is a **Bring Your Own API Key** mode or a local/open-source generation option.
