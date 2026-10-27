# Website UI verification — 14 October 2026

For the latest follow-up, see [27 October end-to-end verification](E2E_VERIFICATION_2026-10-27.md). The record below describes the 14 October work.

This records the UI fixes and checks for the custom CMS project. It is a bounded verification, not a claim that every possible defect has been eliminated. See [DEVELOPER_HANDOVER.md](DEVELOPER_HANDOVER.md) for setup and maintenance.

## Fixed issues

| Issue | Result |
| --- | --- |
| Blocked browser storage could crash language/header initialization | Preferences are optional; the website and controls continue working without storage. |
| Invalid/out-of-range saved text-size values made buttons ineffective | Invalid values recover to the default; increase/decrease controls respond. |
| Failed content-cache writes could throw again during cleanup | Both write and cleanup failures are contained; loaded CMS content still renders. |
| Gallery/dialog/search keyboard focus could leave the open modal | Opening focuses modal controls; Tab/Shift+Tab stay inside and Escape closes; closing returns focus. |
| Gallery cleanup discarded a previous page scroll lock | The previous overflow value is restored. An empty gallery does not freeze the page. |
| Changing/removing gallery images could leave an invalid selected index | The selected image is kept within the available range. |
| Display Options could extend below a short viewport | The panel has a viewport height limit and internal vertical scrolling. |
| Long image captions could crowd a short viewer | Images can shrink; captions have a bounded scroll area. |

The code uses `src/utils/browserStorage.js` and `src/hooks/useModalFocus.js` so future controls can share the same behaviour.

## Checks completed

- The six mounted regression scenarios reproduced failures against the original source and pass against the corrected source.
- `npm run test:ui` runs actual React components with a synthetic fixture and mocked browser APIs. It needs no database, API, uploads or email.
- The isolated full suite passed **31 checks**, including the UI scenarios, CMS audits, bilingual write-through/visibility, media smoke tests and both production builds.
- Focused ESLint passed for the changed public components/helpers.
- The CMS suite was updated to test shared-body ownership and to audit editable alias metadata without expecting the immutable Academic body to act as a second editor.
- Live website, CMS and API were checked at their existing addresses. Installation preserves server/shared source, private configuration and complete English/Hindi content responses.

The existing large CMS JavaScript chunk notice is informational; the builds passed.

## Visual-testing limit

No browser surface was connected to the automation tool in this session. The mounted tests do **not** measure actual CSS layout, image geometry, touch scrolling or responsive breakpoints. The height/scroll fixes were inspected in source and compiled into the build. Do not treat this record as a completed manual mobile-browser audit.

Before a public release, use an available browser to check phone portrait/landscape, tablet and desktop; both languages; larger text; menu/search keyboard navigation; gallery captions; long tables and documents; and Display Options on a short screen. Check console/network errors. Record browser/version, viewport and result in the release notes.

## Repeat the checks

```cmd
npm run test:ui
npm run build:all
```

For the full CMS checks, first configure an isolated development database/API and disable outgoing email, then run:

```cmd
npm run cms:verify-all
```

Some full-suite tests temporarily write users/content/media/feedback. Do not run that suite against production just because the UI test is read-only.
