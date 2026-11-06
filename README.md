# Vitrine

A landing-page template for a sample brand: a full-reserve bank that never lends your deposits and lets anyone check its books. A vitrine is a museum's glass display case.

The hero is a real-time glass vault door with its boltwork on show. The page walks through that door, into a daylight vault, out through one deposit box and on to the rest of the product.

Built with Next.js 16, React 19, three.js and Lenis. No images, videos or HDRIs: every picture is rendered live.

## Run it

```bash
npm install
npm run dev
```

## What's on the page

| Section | What it does | File |
| --- | --- | --- |
| Hero and vault | The headline sits behind the glass and bends through it. The wheel follows your cursor. Scroll unlocks the door, swings it, and walks you in | `src/components/vault.tsx`, `src/gl/vault-scene.ts` |
| Where it is | The app feeds out of a slot in the brass stage. Interest ticks by the second, from the clock | `src/components/where.tsx` |
| Balance sheet | Two huge figures slide in from opposite sides and line up, digit over digit | `src/components/book.tsx` |
| The run | Press and hold to start a bank run on two cases of money | `src/components/run.tsx`, `src/gl/run-scene.ts` |
| The audit | A real SHA-256 Merkle tree in the browser. Take one cent and the fingerprint stops matching | `src/components/audit.tsx`, `src/lib/sha256.ts` |
| The gallery | A walk past six working features, each in its own case | `src/components/gallery.tsx` |
| The card | A divider line turns out to be a glass card, edge-on. Sign it with your pointer | `src/components/card.tsx`, `src/gl/card-scene.ts` |
| Fees | A fee schedule struck off line by line until one price is left | `src/components/fees.tsx` |
| Questions | Each awkward question is behind glass you break to read the answer | `src/components/questions.tsx` |
| Close | The door shuts, and signing up throws the bolts | `src/components/close.tsx`, `src/gl/close-scene.ts` |

## Make it yours

1. Replace the name and copy in `src/components`. The hero and closing headlines are drawn in `drawType` in `src/gl/vault-scene.ts` and `src/gl/close-scene.ts`, and the vault wall line is in `src/gl/vault-room.ts`.
2. Set your colours at the top of `src/app/globals.css`. The WebGL scenes hold matching values at the top of each file in `src/gl`.
3. Change the sample balance, rate and book figures in `src/lib/live.ts`.
4. The closing form doesn't send anywhere. Connect it in the `onSubmit` handler in `src/components/close.tsx`.
5. Rewrite the footer disclaimer for your own business. Real financial services need their own legal copy and licensing details.

Design decisions and the motion plan are in `docs/design-dna.md`.

Created by [Fardin Omor Afnan](https://fardin.website). See `LICENSE.md`.
