# Watch Supreme — agent guide

Storefront for a small used-watch shop (originals, mostly Rolex; 5–10 items). Russian-language UI.

- Plain static site, no build step: `index.html`, `assets/css/style.css`, `assets/js/app.js`, `config.js`.
- Catalog data: Google Sheet «Watch Supreme — учёт» (id 1-vAnHSq7GuFNFfnYNLmUqNNaWXAt39atc5m-usRYltY, locale ru_RU: formulas use `;`) served by `apps-script/Code.gs` (`sheetUrl` in config); `data/watches.json` is the fallback. `normalize()` in `app.js` must keep accepting sheet-style strings ("да", "1 450 000").
- Never expose private columns (purchase price, supplier links) to the site; the Apps Script must return public fields only.
- Reservation v1: Telegram deep links with prefilled text. v2 (planned): form + Apps Script + Telegram bot, 48 h hold.
- Design tokens live on `:root` in `style.css`, with a dark-mode override; `.night` sections (header, hero, steps, footer) redefine the same tokens in black-green and gold. Logo is an inline SVG crest (shield, dial, tiara, laurels) in both header and footer; avoid anything resembling the Rolex coronet. Motion is subtle and off under prefers-reduced-motion.
- Check changes with Playwright screenshots at 1440 and 390 px widths, light and dark.
