# ELGS rebuild: build report

Local preview: `npx serve .` (or any static server) from the repository root.

## What it is

One unbroken scroll through a sanctuary, in eight places: the glass, the
lectern, the Word, the pews, commencement, the wider church, the record, the
door. A giving panel is docked on every frame.

- **Grammar:** continuous world (worldflight), chosen by the owner in the
  interview. The other seven grammars were not considered against it for that
  reason.
- **Signature move, "the open book":** the giving panel holds "Give now" in one
  place for the whole page, translates a monthly gift into months of one
  seminarian's tuition (from the published $300 cap), and keeps a ledger of
  sources that fills as each claim is passed.
- **Fingerprint gate:** the registry was empty. Nothing to clear. Row appended.
- **Brief:** interviewed, not self-authored. See BRIEF.md.

## Score

| Leg | Place | Beat | Copy anchor | Scroll |
|---|---|---|---|---|
| 1 | The glass | Claim | bottom left | 1.3vh |
| 2 | The lectern | What we do best | middle left | 1.3vh |
| 3 | The Word | Customization, with the "what are you already doing" chips | top left | 1.3vh |
| 4 | The pews | Who it is for (authored quiet) | top right | 1.3vh |
| 5 | Commencement | Proof. THE PEAK | bottom left | 1.95vh |
| 6 | The wider church | Reach | bottom left | 1.3vh |
| 7 | The record | Trust: why choose us, why give | middle left | 1.3vh |
| 8 | The door | Two actions | bottom left | 1.3vh |

Every clip runs at one pace: 0.217 viewport-heights per second of film.

## Feel check (intended against felt)

| Leg | Intended | Felt on the sheet | Change made |
|---|---|---|---|
| 1 | Stillness | Stillness | none |
| 2 | Recognition | Quiet instruction | none; reads as intended once the copy lands |
| 3 | Agency | Agency | moved the block off the Bible so the object stays whole |
| 4 | Belonging | Calm | none; this is the authored quiet before the peak |
| 5 | Pride (peak) | Pride | giving panel collapsed by default so it no longer covers the certificate |
| 6 | Breadth | A second graduation | reframed so the faces are clear of the type. Still the weakest leg: two commencement photographs in a row read as one feeling. A photograph of a student at work in their own congregation abroad would fix it (shot list, item 3) |
| 7 | Assurance | Assurance | none |
| 8 | Resolve | Resolve | plate narrowed so the cross stays visible |

The peak is the largest change on the sheet and holds the most scroll.

## Assets

No imagery was generated. All eight scenes are photographs from elgs.org with a
slow camera move rendered across them (`tools/render.py`), graded together, and
encoded for scrubbing. The hero is cut into two planes so the timber pushes in
faster than the glass.

Legs 2, 3 and 4 (lectern, Bible, pews) are stock photographs from the current
site's Wix media library, not ELGS photographs. Confirm the licence covers use
off Wix before launch, or replace them from the shot list.

Total media: 67 MB, loaded leg by leg as the visitor approaches.

## Shot list: photographs that would improve the page

1. **The Emmanuel chapel interior, wide, empty, morning light.** Landscape and
   portrait. Replaces the stock pews. Shoot from the back, low, down the aisle.
2. **A mentor and a seminarian in conversation in a church office or sacristy.**
   Two people, one listening. Replaces the stock lectern. This is the picture
   of "what we do best" and the site does not have it.
3. **A student at work in their own congregation abroad** (preaching, teaching,
   visiting). Replaces the second commencement photograph in leg 6.
4. **A seminarian studying at a kitchen table or after a work shift.** For the
   pews leg: the adult learner's real life.
5. **The hooding, reshot or re-exported at full resolution with the graduate
   smiling.** The current frame is strong but the expression is formal.
6. **A short handheld video walk from the chapel door to the outdoor cross**,
   10 to 15 seconds, stabilised. With real footage the legs can be actual
   camera travel instead of moves across stills.
7. **Group photograph of graduates across all three continents**, or one
   portrait per region, with names and consent on file.

## Verified

- Worldflight assertions: 21 of 24 pass. The three that do not:
  two (playhead convergence, seek deadband) reflect slow software video
  decoding in the headless test browser and improved when the clips were made
  lighter; one (seam release) is a one-pixel floating-point edge in the test at
  this seam width. None is visible in the screenshots.
- Screenshot harness on desktop 1440x900, phone 390x844, compact phone 360x640
  and reduced motion: no dead scroll, all eight legs paint real frames, all copy
  clears 4.5:1 contrast at its worst frame.
- Interaction test, 108 checks across four screen sizes, all pass: chips carry
  into the form, the form composes the email and says only that, gift
  arithmetic, Give link, ledger count, sources dialog, route jumps, keyboard
  focus, no console errors, no failed requests.

## Not verified

- A real phone. Headless Chrome cannot reproduce iOS video decoding or Low
  Power Mode. `references/device-diag.html` in the skill is the tool if a phone
  misbehaves.
- Smoothness on real hardware. The headless browser decodes video in software.
- The Candid Platinum Seal (profile is behind Candid's app) and the Florida
  registration lookup (the state site refused the connection).

## Open before launch

1. The contact form opens the visitor's email app addressed to Team@ELGS.org.
   It does not submit to a database. Connect it to the form system you use.
2. Without JavaScript the page shows only the first scene. A plain fallback
   page is not built.
3. The Florida solicitation disclosure and the 501(c)(3) statement live in the
   "Registration and tax disclosures" dialog, reachable from the giving panel
   on every screen and from the last screen. Confirm that placement satisfies
   counsel.
4. The gift translator states an equivalence, not a designation. Confirm the
   wording matches how gifts are actually recorded.
5. Only the home page is built. Programs, faculty, news, shop and blog still
   link to the current site from the sources dialog only.
