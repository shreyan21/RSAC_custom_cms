// Site-wide UI toggles. Flip a value here to change behaviour everywhere at
// once — no other file needs editing.

// Breadcrumb trails ("Home / Section / Page") near the top of content pages.
// Turned OFF for a cleaner look; the Back button handles up-navigation instead.
// To bring every breadcrumb back, set this to `true` — both the shared
// PageTrail component and the OfficialContentPage breadcrumbs read this flag,
// and every page still passes its breadcrumb data, so nothing else changes.
export const SHOW_BREADCRUMBS = false;
