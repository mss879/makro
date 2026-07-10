# Fonts — single source of truth

Both brand faces are **self-hosted** and loaded via `next/font/local` in
`app/layout.tsx`. The site uses **only** these files in this folder.

| File | Face | Sourced from |
|------|------|--------------|
| `TANGarland.woff2` / `.ttf` | TAN Garland (display / headings) | `Font/TAN-Garland/TAN-Garland/` |
| `Rosario-Regular.woff2` | Rosario 400 (body) | `Font/rosario/` |
| `Rosario-Italic.woff2` | Rosario 400 italic | `Font/rosario/` |
| `Rosario-Bold.woff2` | Rosario 700 | `Font/rosario/` |
| `Rosario-BoldItalic.woff2` | Rosario 700 italic | `Font/rosario/` |

## Provenance rule (important)

Every font here is copied/derived **exclusively from the project-root `Font/`
folder**. There is a separate `TAN-Garland/` folder at the project root (outside
`Font/`) containing same-named files — **do not use it.** If TAN Garland ever
needs re-exporting, take it from `Font/TAN-Garland/TAN-Garland/`, never from the
outside `TAN-Garland/` folder.

The Rosario `.woff2` files are compressed from the licensed `.ttf` files in
`Font/rosario/` (OFL licensed — see `Font/rosario/OFL.txt`).

## How it wires up

`app/layout.tsx` maps these files to the `--font-tan-garland` and
`--font-rosario` CSS variables, which `app/globals.css` exposes as the
`--font-display` and `--font-body` tokens. No Google Fonts, no external CDN.
