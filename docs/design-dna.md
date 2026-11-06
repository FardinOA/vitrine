# Vitrine design DNA

**Sample brand:** Vitrine, a full-reserve bank. It holds every deposit in short government bills and central-bank reserves, lends nothing, passes on the interest and charges a flat $6 a month.

**The claim:** a bank should be able to show you its vault. Every section lets the visitor check something themselves, instead of asking them to believe it.

## Decisions

| Decision | Why |
| --- | --- |
| A glass vault door as the hero object | The category's usual hero is a floating metal card or a phone. A door you can see through is the company's whole argument in one object |
| Headline behind the glass | The type belongs to the object: the dome is a real lens, so the words bend as the door leans. The line breaks at the hub, so the wheel sits between the words |
| The wheel follows the hand | A subtle hero reads as no interaction. The door leans, the wheel turns with the cursor, the gear train answers, fast spins rattle the bolts, and a lens bends the type on the wall |
| Boltwork modelled as a real linkage | Fourteen bolts driven by crank rods from one cam, solved with the slider-crank equation, so the mechanism is believable up close |
| A daylight vault | A dark vault says secrecy, which is the opposite of the claim. Daylight, white frames and deep bottle-green recesses make the money the brightest thing there |
| Glass, bottle green, brass, one hot red | From the object: the green edge of thick glass, its deep end, the brass in the works. Red appears only where something has failed. This avoids navy-and-gold and neon-on-black fintech |
| Inter Tight, heavy and tight | A plain grotesk keeps a strange concept trustworthy. No mono, even for hashes, which are shown as colour |
| Hashes as colour stripes | Nobody can compare two hex strings at a glance, but anyone can see that two stripes differ |
| An honest "no" | The page says outright that Vitrine doesn't lend, and that sovereign risk remains. Stating the costs is what makes the claim credible |

## Motion

Scroll moves objects and never changes figures. Numbers tick from the clock, or change when the visitor acts.

| Section | Mechanic | Driver |
| --- | --- | --- |
| Hero | Door leans, wheel follows the bearing of the hand, type lenses under the cursor, click spins the wheel | Pointer |
| Vault | Wheel spins, bolts draw, type wipes from the hub to reveal the room through the glass, door swings, lens widens through the aperture | Scroll |
| Vault | Camera turns to the left wall, box 4821 slides out, its plate fills the screen and becomes the next section's stage | Scroll |
| Where | The app window feeds out of a slot in the stage, like cash from a machine | Scroll |
| Book | Two figures arrive from opposite sides and align; the rule and "$0.00" land only once they do | Scroll |
| Run | Hold to run: bundles fly at the lens, a shutter drops on the first case at 12 of 100 | Press and hold |
| Audit | The tree grows up from the leaves. Taking a cent ripples colour up the branch, level by level | Scroll, click |
| Gallery | A walk down a real CSS 3D room: cases on plinths, wall text, floor seams passing underfoot. Each case works when you reach it | Scroll |
| Card | A hairline across the page rotates to become a card. The pointer etches a signature, thick when slow and thin when fast | Scroll, pointer |
| Fees | Fee names are struck in reading order, then cleared to leave one price | Scroll |
| Questions | Glass cracks radially from the point you hit, and the pieces fall with gravity past the pane's edge | Click |
| Close | The door shuts and the type fills in behind the glass. Submitting throws the bolts | Scroll, submit |

The nav's logo is a small door whose wheel turns with the scroll. The nav steps aside going down and returns going up.

## Reduced motion and fallbacks

With `prefers-reduced-motion`, pins collapse to normal flow, Lenis is off and the gallery becomes a plain list. Without WebGL, the hero falls back to a plain DOM headline. The bank run needs WebGL for its picture, but its counts still work.

## Sample-brand honesty

Vitrine is fictional and the footer says so. The one outside fact on the page, $42 billion in withdrawal requests in a single day in March 2023, is public record, and the bank is deliberately not named. The run itself is labelled an illustration.
