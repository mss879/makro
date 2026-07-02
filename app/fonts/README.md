# Fonts

## TAN Garland (brand primary display font — licensed, not included)

TAN Garland is a **paid commercial font** and is not bundled with this project
for licensing reasons. Cormorant Garamond is used as a close free stand-in.

### To use the real TAN Garland

1. Purchase / obtain a **web license** for TAN Garland (TAN Type foundry).
2. Drop the web font file here as `app/fonts/TANGarland.woff2`
   (a `.woff2` is ideal; `.otf`/`.ttf` also work).
3. In `app/layout.tsx`, uncomment the `localFont` block and swap
   `--font-cormorant` for `--font-tan-garland` on the `<html>` className.

That's it — the whole site picks it up via the `--font-display` token in
`app/globals.css`.
