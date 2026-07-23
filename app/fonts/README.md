# Fonts — single source of truth

Both brand faces are **self-hosted** and loaded via `next/font/local` in
`app/layout.tsx`. The site uses **only** these files in this folder.

| File | Face | Sourced from |
|------|------|--------------|
| `Marcellus-Regular.woff2` | Marcellus 400 (display / headings) | Google Fonts (OFL), latin subset |
| `Manrope-Variable.woff2` | Manrope variable 200–800 (body) | Google Fonts (OFL), latin subset |

Marcellus ships a single Regular weight — never fake bolds or italics on it.
Manrope is a variable file, so every Tailwind font-weight utility from
`font-extralight` to `font-extrabold` resolves to a true instance.

## Retired faces (kept for provenance, not loaded)

`TANGarland.woff2` and the `Rosario-*.woff2` files are the previous brand
pairing, replaced at the client's request (July 2026) with a quieter,
more professional system. They are no longer referenced by
`app/layout.tsx` but remain here (and in the project-root `Font/` folder)
in case the client ever wants them back. If TAN Garland is ever restored,
re-export it from `Font/TAN-Garland/TAN-Garland/`, never from the
project-root `TAN-Garland/` folder.

## How it wires up

`app/layout.tsx` maps these files to the `--font-marcellus` and
`--font-manrope` CSS variables, which `app/globals.css` exposes as the
`--font-display` and `--font-body` tokens. No Google Fonts requests at
runtime, no external CDN.
