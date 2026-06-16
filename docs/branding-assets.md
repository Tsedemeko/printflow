# Finesse Branding Assets — where to drop the files

The platform is fully wired to use the Finesse logo + app icon. You just need to save the
two supplied images to the exact paths below (the code already references them).

## Two source images
- **App icon** — black rounded tile with the gold needle "F" monogram → use for mobile app icon + splash.
- **Logo wordmark** — gold "FINESSE FASHION DESIGN" with the needle, transparent background → use across the web.

## 1. Mobile apps (Expo) — app icon + splash
Save the **app-icon (monogram tile)** as a **1024×1024 PNG** named `icon.png` in each app's `assets/` folder:

- `apps/kiosk/assets/icon.png`
- `apps/store/assets/icon.png`
- `apps/manager/assets/icon.png`

(The same file powers the home-screen icon, the Android adaptive icon, and the splash screen — splash background is set to black `#000000` to match the tile.)

## 2. Web (Next.js) — header logo + favicon
Save to `apps/web/public/`:

- `finesse-logo.png` — the **wordmark** (gold on transparent). Used in: portal sidebar, all public page headers, the staff login screen.
- `finesse-icon.png` — the **monogram tile**. Used in: home hero badge, invoice/quotation letterhead.

Save the favicon (browser tab) — the **monogram tile**, ideally 512×512 PNG:

- `apps/web/app/icon.png`  (Next.js picks this up automatically; no code change needed)

## Recommended sizes
| File | Size |
|------|------|
| `apps/*/assets/icon.png` | 1024×1024 PNG |
| `apps/web/public/finesse-logo.png` | ~1600×900 PNG, transparent |
| `apps/web/public/finesse-icon.png` | 512×512 PNG |
| `apps/web/app/icon.png` | 512×512 PNG |

Once these files are in place, the icons/logo appear everywhere automatically — no further code changes.
