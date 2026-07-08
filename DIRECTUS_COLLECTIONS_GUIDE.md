# Directus Collections Guide

Use this as a map from website area to Directus collection.

## Start Here

| Website Area | Directus Collection |
|---|---|
| "Where do I edit this?" help | Start Here -> Editing Map |
| Homepage text, labels, buttons, footer wording | Homepage -> Website Text Editor |
| Hero video / poster | Homepage -> Homepage Video |
| Header logos and future extra logos | Homepage -> Header Logos |
| PM / CM homepage portraits | Homepage -> Homepage Leaders |
| Homepage tabs | Homepage -> Homepage Sections |
| Find the Centre, Institution stats, Operational Domain sphere cards | Homepage -> Homepage Sections |
| Quick links/cards | Homepage -> Homepage Quick Links |
| Website pages | Pages and Navigation -> Website Pages |
| Page photos / Map-Photos images | Pages and Navigation -> Page Photos |
| Scientific division cards | Pages and Navigation -> Scientific Divisions |
| Facility cards | Pages and Navigation -> Facilities |
| Geo-portal cards | Pages and Navigation -> Geo-Portal Services |
| Hamburger menu | Pages and Navigation -> Main Menu |
| Organisation chart | People and Organisation -> Organisation Chart |
| People/scientists/former scientists | People and Organisation -> People Profiles |
| Notices, circulars, tenders PDFs | Public Information -> Notices and Circulars |
| Flood report PDFs | Public Information -> Flood Reports |
| Photo gallery | Public Information -> Photo Gallery |
| RTI, feedback, public pages | Public Information -> Public Information Pages |
| Policy/help pages | Public Information -> Policies and Help |
| Contact details | Public Information -> Contact Details |

## Field Rules

- Text fields are safe for normal editors.
- Image/file picker fields are safe for normal editors.
- `Status` controls whether a row appears publicly.
- `Display Order` controls manual order.
- IDs, keys, raw JSON, raw HTML, and file paths are not daily editing fields.

## Flexible Homepage Sections

Use **Homepage -> Homepage Sections** for the homepage sections that need
day-to-day item editing without JSON:

- Rows whose `Internal Key` starts with `impact-stat-` create statistic cards.
- Rows whose `Internal Key` starts with `operational-domain-` create cards
  around the satellite sphere.
- The row whose `Internal Key` is `location-card` controls the location/map
  card.

Set `Status = Archived` to hide one card from a multi-card section. For a
single-card section like `Find the Centre map card`, clear the fields instead
of archiving the only row. Directus blank text stays blank; fallback text is
used only when Directus/the collection is missing or no managed homepage row
exists yet.

## Simple Hindi

सबसे पहले **Start Here -> Editing Map** खोलें। वहां website area search करें।
जिस collection का नाम आए, वही खोलें। Image/PDF हमेशा उसी row में attach करें।
सिर्फ File Library में upload करने से website नहीं बदलेगी।
