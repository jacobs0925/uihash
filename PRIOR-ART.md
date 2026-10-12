# Prior art, and how uihash relates to it

This comes from a literature and tool survey done alongside the experiments. Entries marked
*confirmed* were checked against the paper or source code during the survey; the others are taken
from the cited documentation. No single system found combines (a) computed-style facts from the
Typed OM, (b) holes learned by anti-unifying calibration renders, and (c) the
`required ⊆ candidate ⊆ known` check. The pieces all have ancestors.

## Closest relatives

| work | what it does | relation to uihash |
|---|---|---|
| **DoDOM**: Pattabiraman & Zorn, ISSRE 2010 ([pdf](https://blogs.ubc.ca/dependablesystemslab/files/2010/08/DoDOM.pdf)) | Replays one session many times. The *invariant DOM* is the first DOM with mismatching nodes replaced by dummy nodes. It stabilized after 6 of 58 runs and covered ~99 % of the DOM. | The same core move as calibration (learn invariants from repeated runs), applied to raw DOM rather than computed style, with no templates or set semantics. Its 6-run stabilization matches our "≥ 4 renders". |
| **Roest, Mesbah, van Deursen**, ICST 2010 ([pdf](https://people.ece.ubc.ca/amesbah/resources/papers/icst10.pdf)) | A pipeline of *comparators* (whitespace, attribute, style, date, list/table) strips dynamic content before the DOM is hashed to test state equality. List/table templates are generated as HTML + regex with repetition. Generic comparators removed up to 55 % of false positives, custom ones up to 95 %. | Hand-written comparators ≈ our learned holes. Their finding that a *generic* template hid a real bug (a leading-zero phone number) led directly to our **typed holes**: a hole still rejects `undefined`, `NaN` and raw `{{templates}}`. |
| **FragGen**: Yandrapally & Mesbah, TSE 2022 ([arXiv](https://arxiv.org/pdf/2110.14043)) | Segments pages into fragments (VIPS) and classifies each as clone / data change (same structure, visual change) / structural change. No thresholds; its oracles caught 98.7 % of visible changes, with warnings separate from errors. | Closest in spirit: data-vs-structure classification per region. uihash works per element and per CSS property, learns from renders instead of using a fixed similarity, and explains at the property level. Its warning tier is worth borrowing for "plausible but unseen" variants. |
| **WebDiff**: Roy Choudhary, Versee, Orso, ICSM 2010 ([pdf](https://shauvik.com/public/pubs/roychoudhary10icsm.pdf)), *confirmed* | Loads the page twice in the reference browser; any node that differs is "variable" and ignored. Two quick reloads missed some variable elements, which caused part of its 21 false positives (17 %). The authors suggest more reloads over a longer period. | The 2-render version of calibration. Its failure mode is exactly our k = 2 row in the learning curve (19.5 % FP) and our live-site "snapshots seconds apart" false positives. |
| **Diffy** (Twitter), [repo](https://github.com/twitter-archive/diffy), *confirmed* | Primary vs. secondary (same code) measures noise per response field; primary vs. candidate measures differences. A field is reported only if raw > noise by margins (> 20 % relative, > 0.03 % of requests). | The original "subtract the noise you measured" idea. uihash's holes are the categorical version. A Diffy-style secondary render at check time would add a per-fact noise gate for live monitoring. |
| **Applitools** match levels ([docs](https://applitools.com/tutorials/concepts/best-practices/match-levels)) and Root Cause Analysis ([docs](https://applitools.com/docs/eyes/concepts/reviewing-tests/root-cause-analysis)) | *Layout* compares relative positions of detected elements; *Dynamic* accepts changed text that matches a type (text, number, date, link, email, currency). RCA lists the DOM/CSS changes behind a visual diff. | Closest commercial analog. Typed text holes ≈ Dynamic; property-level explanations ≈ RCA. uihash makes the computed-style tree *the* comparison, not an explanation of a pixel diff. |
| **Playwright ARIA snapshots** ([docs](https://playwright.dev/docs/aria-snapshots)) | `toMatchAriaSnapshot` compares the accessibility tree; children default to "contain" (listed ones must be present, in order), and text may be a regex (`/Issues \d+/`). | `required ⊆ candidate` with regex holes, on the a11y tree, without styles and without the `⊆ known` upper bound (unless `equal`). |
| **Skia Gold** ([docs](https://skia.org/docs/dev/testing/skiagold)) | Keeps several triaged-positive digests per test; a run passes on an exact match to any of them. | `candidate ∈ known` at whole-image granularity. uihash does the same per element fact, which is what lets data vary freely. |

## Where the individual techniques come from

- **Template vs. data, records, optionals.**
  - *RoadRunner* (Crescenzi, Mecca, Merialdo, VLDB 2001, [pdf](https://www.vldb.org/conf/2001/P109.pdf)): the wrapper is the least upper bound of sample pages as a union-free regex. String mismatches become fields; tag mismatches are tried as an iterator first, then as an optional. Trying the optional first produced "two books + optional third" instead of a list. uihash's prefix + pooled middle + suffix makes the same "prefer list" choice.
  - *ExAlg* (Arasu & Garcia-Molina, SIGMOD 2003, [pdf](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/extract.pdf)): tokens with identical occurrence vectors across pages form template classes. Per-render *count vectors* distinguish tuple (once per render), list (varies) and optional (0/1) without alignment. A promising replacement for our heuristics.
  - *MDR* (Liu, Grossman, Zhai, KDD 2003, [pdf](https://www.cs.uic.edu/~liub/publications/kdd2003-dataRecord.pdf)) and *DEPTA* (Zhai & Liu, WWW 2005, [pdf](https://archives.iw3c2.org/www2005/proceedings/docs/p76.pdf)): data regions are adjacent generalized nodes with normalized tag-string edit distance < 0.3. DEPTA adds a visual rule (the gap between records ≥ any gap inside one) and partial tree alignment. This is the route to class-free keys, the open problem in [RESEARCH.md](RESEARCH.md).
  - *Template detection* (Bar-Yossef & Rajagopalan, WWW 2002, [html](https://archives.iw3c2.org/www2002/CDROM/refereed/579.html)) and boilerplate detection (Kohlschütter et al., WSDM 2010): shingles and link density as cheap priors for "this is data". Our own record prior did not pay off (see [RESEARCH.md](RESEARCH.md)).
- **Anti-unification and grammar inference.**
  - *Least general generalization* (Plotkin 1970), and hedge anti-unification for sibling sequences (Kutsia, Levy, Villaret 2011/2014; [survey](https://arxiv.org/pdf/2302.00277)): prefix + pooled middle + suffix is a rigid hedge generalization.
  - *k-testable languages* (García & Vidal, TPAMI 1990): identifiable in the limit from positive examples if the sample contains every allowed window, the "characteristic sample".
  - *SOREs / CHAREs* (Bex, Neven, Schwentick, Tuyls, VLDB 2006, [pdf](https://documentserver.uhasselt.be/bitstream/1942/1416/1/bexVLDB.pdf)): chains like `(a|b)* c? d+` cover most real content models and can be learned from very few examples.
  - *Gold (1967)* is the caution: learning from positives only always flags valid-but-unseen variants. The remedies are restricting the language class, designing the calibration fixtures (empty / one / many / each optional on and off), or treating unseen facts as warnings. uihash's `approve` is the operational version of the last.
  - *Typed fields from positive examples*: DataProg (Lerman, Minton, Knoblock, JAIR 2003, [arXiv](https://arxiv.org/pdf/1106.4872)). Statistically justified invariants: Daikon (Ernst et al., TSE 2001, [pdf](https://homes.cs.washington.edu/~mernst/teaching/6.883/readings/invariants-tse2001.pdf)) reports an invariant only if its chance probability is below 0.01. For a slot with r equally likely values seen constant over s samples, p = r^−(s−1). That explains our learning curve: a 3-way random tip needs s ≥ 6 for p < 0.01.
- **Layout relations instead of pixels.**
  - *X-PERT* (Roy Choudhary, Prasad, Orso, ICSE 2013; relation labels per [patent](https://patents.google.com/patent/US9418173B2/en)): geometric containment parent, plus justification, alignment, centering and sibling order.
  - *GWALI* (ICST 2016): a layout graph with N/S/E/W, intersect, aligned and contain edges, tolerant of text-length changes.
  - *ReDeCheck* (Walsh, McMinn, Kapfhammer, ASE 2015 / ISSTA 2017, [pdf](https://eprints.whiterose.ac.uk/id/eprint/116991/1/c49.pdf)): constraints with the viewport ranges where they hold; 91 % recall on 100 mutants in regression mode.
  - *XFix* ([pdf](https://eprints.whiterose.ac.uk/116990/7/c48.pdf)) and *IFix* ([pdf](https://eprints.whiterose.ac.uk/131041/1/c53.pdf)) map violated relations to CSS properties.

  uihash hashes the *causes* (computed style) rather than the resulting relations. Relations would add a data-robust check for layout bugs that come from content (overflow, collision), which computed style cannot see.
- **Similarity hashing.**
  - *SimHash* (Manku et al., WWW 2007, [pdf](https://www.www2007.cpsc.ucalgary.ca/papers/paper215.pdf)).
  - *pq-grams* (Augsten et al., VLDB 2005, [pdf](https://www.vldb.org/conf/2005/papers/p301-augsten.pdf)): essentially a k-testable fact set over trees.
  - *GumTree* (Falleri et al., ASE 2014, [repo](https://github.com/gumtreediff/gumtree)): two hashes per subtree (with and without values), top-down matching of identical subtrees, then bottom-up; edit scripts with *moves*, a better way to report reorders than ours.
  - *Yandrapally, Stocco, Mesbah* (ICSE 2020, [pdf](https://people.ece.ubc.ca/astocco/pubs/2020-Yandrapally-ICSE2020.pdf)): 10 whole-page near-duplicate detectors on 9 apps; none worked reliably even with optimal thresholds, and SimHash was worst (F1 0.33). That is evidence against a single fuzzy page hash, and consistent with our impossibility argument and our dHash result.
- **Commercial / OSS practice.**
  - Percy (Intelli-Ignore, layout regions, percyCSS, frozen animations; [docs](https://www.browserstack.com/docs/percy/build-results/snapshot-rules)), BackstopJS (hide vs. remove selectors), Argos (`data-visual-test`) and Playwright `toHaveScreenshot({ mask })` all ignore manually chosen regions. uihash *learns* the regions, per property.
  - Chromatic ignores elements but still fails on their dimension changes ([docs](https://www.chromatic.com/docs/ignoring-elements/)), and TurboSnap skips stories whose dependency graph didn't change ([docs](https://www.chromatic.com/docs/turbosnap/)). That is the "hash the inputs" layer, complementary to this.
  - mabl learned changing screenshot regions from ~10–12 passing runs and only ever warned; it was retired for browser tests in 2026 ([notes](https://help.mabl.com/hc/en-us/articles/49831501404692)).
  - Chromium web tests keep text layout-tree baselines, as a last resort ([docs](https://chromium.googlesource.com/chromium/src/+/81.0.4044.122/docs/testing/web_test_expectations.md)).
- **Flakiness and stabilization.**
  - Romano et al. (ICSE 2021, [arXiv](https://arxiv.org/pdf/2103.02669)): 235 flaky UI tests; async waits caused ~45 %.
  - Standard stabilizers, some used here: freeze animations, pin time and `Math.random`, wait for `document.fonts.ready`. Others are not yet used: repeat the capture until two consecutive snapshots match (Playwright's screenshot rule), `--font-render-hinting=none`, `--disable-lcd-text`.

## Subtle changes: where the techniques come from

Added with the subtle-change work (`experiments/subtle`). Each entry says what uihash took from it.

- **Forcing interaction states.**
  - Chrome DevTools Protocol `CSS.forcePseudoState` ([docs](https://chromedevtools.github.io/devtools-protocol/tot/CSS/#method-forcePseudoState)), the
    mechanism behind DevTools' ":hov" panel. `getComputedStyle` and rendering both follow the forced
    state; `Element.matches(':hover')` does not.
  - Storybook's pseudo-states addon ([repo](https://github.com/chromaui/storybook-addon-pseudo-states)) reaches the same states by rewriting `:hover` selectors into classes.
  - uihash forces every element that a `:hover`/`:focus`/`:active` rule targets, plus all interactive
    elements, at once: one deterministic render per state instead of one per element.
- **Perceptibility of colour changes.**
  - CIEDE2000 (CIE 2001; implementation notes and test data: Sharma, Wu & Dalal, *Color Research &
    Application* 30(1), 2005). uihash's implementation reproduces the 12 of the published test pairs that were checked, to four decimals.
  - The labels use ΔE00 ≈ 1 as the usual just-noticeable difference. The bands above it are uihash's
    own choice, not a standard.
- **Contrast.**
  - WCAG 2.x contrast ratio, (L1 + 0.05) / (L2 + 0.05) from relative luminance. Thresholds: 4.5:1 for
    text, 3:1 for large text (SC 1.4.3), 3:1 for UI components (SC 1.4.11) ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)).
  - uihash flags text that crosses below AA between base and PR. The effective background is computed
    from the tree, and text over images, gradients or opacity is skipped as unknown.
- **Layout relations and display issues.**
  - The layout-graph line (X-PERT, GWALI, ReDeCheck, above) motivated comparing relations between base
    and PR: content newly cut off, newly overlapping siblings, newly protruding elements.
  - *Owl Eyes* (Liu et al., ASE 2020) and *Nighthawk* (Liu et al., TSE 2022) classify UI display issues
    from screenshots: text overlap, component occlusion, missing images, null values. uihash detects the
    same categories structurally: overlap and occlusion via `elementFromPoint`, missing elements, and
    `null`/`undefined`/`{{template}}` via typed holes.
- **Verifying layout.** *Cassius* (Panchekha & Torlak, OOPSLA 2016) and *VizAssert* (Panchekha et al.,
  PLDI 2018) formalize CSS layout to prove properties such as "text never overflows its container" for
  all inputs. uihash checks the dynamic, single-render versions of such properties, and only as changes
  between base and PR.
- **Visual-test mutation analysis.** *WebSee* (Mahajan & Halfond, ICST 2015) detects presentation
  failures with computer vision against a reference. Seeding CSS mutations to measure what a checker
  misses is the method of `experiments/subtle` and of the earlier highlight and live-mutation evals.

## Second survey: subtle changes in practice and research

A second, targeted survey looked for what research and tools say about small changes that slip
through. Tags: **[C]** checked against the paper, documentation or source; **[S]** from a secondary
source (abstract, citing work, vendor page) and not checked in full; **[U]** unverified.

- **Functional E2E tests do not see visual changes.** *MAEWU* (Yandrapally & Mesbah, ICSME 2021)
  mutates web apps and runs their E2E suites: 0 of 22 colour-style mutants were killed, 56 of 278
  mutants overall (0.20). **[C]** That is the gap a visual check fills.
- **Vision models are not a substitute.** *DiffSpot* (arXiv 2605.29615, May 2026) benchmarks
  vision-language models on spotting differences between UI screenshots: the best model finds 40.7 %,
  under 23 % on the hard tier. **[S]**
- **Screenshot-diff thresholds.** pixelmatch (up to v7) compares pixels by YIQ distance with a default
  threshold of 0.1 and skips anti-aliased pixels (Vyšniauskas' detector). **[C]** Playwright's
  `toHaveScreenshot` uses it at 0.2; Chromatic's `diffThreshold` defaults to 0.063. **[C]** At 0.2 a
  black that becomes `#343434` (ΔE00 13.7) passes. **[C, computed]** pixelmatch 8 (released
  2026-10-06) moves to an OKLab HyAB distance with a `windowSize` option. **[S]** uihash's subtle suite
  measures the effect: of 66 visible changes, Playwright's default passes 21, among them a hover
  background at ΔE00 5.9 and two WCAG AA failures ([RESEARCH.md](RESEARCH.md), *Subtle changes*).
- **Perceptual image metrics.** *FLIP* (Andersson et al., HPG 2020) and Yee's perceptual diff (JGT
  2004) model what a viewer would notice in a whole image. **[C]** uihash labels changes per property
  instead (CIEDE2000 for colours). Measured JNDs for ΔE00 vary by colour region, about 0.6 to 3.4.
  **[S]** So the "imperceptible / barely perceptible" bands are a guide, not a guarantee.
- **Hyperacuity.** Vernier acuity, the ability to see that two edges are not collinear, is a few
  seconds of arc; one CSS pixel at a normal viewing distance is roughly a minute or more. **[S]** This is
  the basis of the alignment check: a 1px break between edges that lined up is visible, while a whole
  region moving 1px mostly is not.
- **Forcing states.** `CSS.forcePseudoState` accepts 26 pseudo-classes. Forced `:hover` and `:active`
  do not propagate to ancestors, while forced `:focus` sets `:focus-within` on them. Each call
  restyles, and no events fire, so JS-driven hover UI needs a real `page.hover`. **[C]** The Storybook
  pseudo-states addon rewrites selectors, so it cannot show user-agent default styles such as the focus
  ring. **[C]** Crawljax, the classic web-app state crawler, never implemented hover. **[C]**
- **Focus.** WCAG 2.4.7 Focus Visible (AA) requires a visible indicator. 2.4.11 Focus Not Obscured
  (AA, new in 2.2) requires the focused control not to be entirely hidden, and 2.4.13 Focus Appearance
  (AAA) sets its size and contrast. **[C]** uihash checks 2.4.7 as a regression (an indicator that went
  away) by pairing the page as loaded with its `:focus`-forced render.
- **Occlusion.** `elementsFromPoint` returns hit-test order, and `pointer-events: none` makes hit-testing
  differ from paint order. **[C]** uihash's "covered" check samples `elementFromPoint`, so an overlay
  with `pointer-events: none` drawn over content is not seen. *OwlEyes* found component occlusion in
  47 % of the display issues it studied (85 % precision, 84 % recall). **[C]** *Nighthawk* extends it. **[S]**
- **Tools found in this round.** *Meticulous* records real sessions and replays them on base and head
  with recorded network responses, then diffs screenshots per step ([docs](https://app.meticulous.ai/docs/concepts/architecture-overview.md)). **[S]**
  eBay's *visual-html* serializes the DOM with the attributes that affect appearance; small and inactive
  since 2023. **[S]** WebdriverIO added text DOM snapshots in 2024. **[S]** A 2023 note on the W3C CSS
  list proposed hashing the serialized DOM and CSSOM instead of screenshots. **[S]** None combines
  computed styles, learned data holes and forced states as uihash does.

What was implemented from this survey: forcing any pseudo-class; the WCAG 2.4.7 focus-indicator check;
the alignment check; device and media emulation (touch, HiDPI, forced colours, motion); SVG paint
details, canvas and `::selection`; the screenshot-tool comparison; and pixel hashes as a safety net
for styles learned as data.

## Third round: what a data-tolerant fingerprint lets through

A fingerprint built to let data vary has blind spots wherever a regression changes only data-like
things. Each has a counterpart in existing practice:

- **Numbers are data, except where the data is fixed.** The fingerprint replaces digits so that any
  value fits a learned hole; a wrong total, a negative count or a lost decimal then looks like data.
  Snapshot tests (Jest's `toMatchSnapshot`, WebdriverIO's DOM snapshots) compare text verbatim
  because their fixtures are fixed. **[S]** In the PR check the fixture is fixed too (base and head
  render the same seed), so the paired walk now compares text as written, with version strings and
  commit hashes masked.
- **A list that grew is not a style change.** Learned templates let lists vary in length. For the
  same fixture, a different number of rows means the PR added or removed them: duplicated search
  results, a dropped section, a marker drawn on every item. DOM-diff tools such as
  visual-html report this directly. **[S]** The paired walk now reports elements that are on one side
  only.
- **Invisible but clickable.** Hit testing ignores opacity, so `opacity: 0` content still takes
  clicks, unlike `visibility: hidden`. Playwright's actionability check refuses to click an element
  another element would intercept ("element intercepts pointer events"), so an E2E test stumbles on
  an invisible overlay, but only on the controls it happens to click. **[S]** uihash compares, per
  element, whether it is invisible and still hit-testable in base and head (`ghost.js`).
- **Relations, not just styles.** Two layout relations were missing because nothing about the
  covered element's own style changes: elements inside an unchanged subtree that something now
  covers (a pop-up that stopped flipping at the edge, a panel stacked under an older one), and
  fixed-position menus that now reach past the window, where no scrolling can bring them back. Both
  are in the X-PERT/ReDeCheck family of relational checks. **[S]**
- **Playwright's default threshold is mostly brightness.** pixelmatch's YIQ distance (Kotsarenko &
  Ramos) weights luminance most. Measured here, at Playwright's default 0.2, 21 of the 66 subtle
  changes that alter pixels compare equal, among them a hover background at ΔE00 5.9 and two changes
  that fail WCAG AA contrast (RESEARCH.md, "Subtle changes").

## Fourth round: techniques surveyed, prototyped and measured

Tags as above. How uihash implements each adopted technique is in [RESEARCH.md](RESEARCH.md).

- **Which widths to check.** ReDeCheck-RM (Walsh et al., STVR 2020) compares base and head layout
  relations across widths. On 60 injected changes to 15 pages it reached recall 1.00 and precision
  0.98, against 0.81 for fixed-width spot checks; on subtle changes (visible at ≤ 10 widths) 0.89
  against 0.44. Its best sampler took the widths either side of every breakpoint plus 80px steps.
  **[C]** Adopted in a change-driven form: the widths that the PR's media-query changes apply to,
  checked as quick variants (same fixture, 3 renders). Not adopted (yet): 80px fill widths and bisecting the
  width range of a failure; a 320px reflow variant (WCAG 1.4.10) can be configured.
- **The accessibility tree.** Playwright's ARIA snapshots (`toMatchAriaSnapshot`, 1.49+) compare
  roles, accessible names and states. **[C]** The WebAIM Million 2026 survey found empty links on
  46.3 % of home pages, empty buttons on 30.6 % and unlabelled inputs on 51 %. **[C]** A style diff
  sees none of these. Adopted (`a11y.js`): base and head trees compared line by line, noise from a
  second base render left out.
- **Text stress.** GWALI compares a page with its translation (91 % precision, 100 % recall on 54
  pages); translation layout failures affect over 75 % of internationalised pages. **[S]** Microsoft's
  pseudo-localization guidance: +40 % as a rule of thumb, short strings grow most. **[C]** WCAG
  1.4.12 (text spacing) fails when content is clipped or overlaps under the user's spacing (F104).
  **[C]** Adopted as opt-in quick variants: they explain what a fixed-size CSS change breaks; uihash
  already reports the change itself.
- **Colours that become hard to tell apart.** Chrome's colour-vision-deficiency emulation uses the
  Machado, Oliveira & Fernandes (2009) matrices **[C]**, a model validated with colour-blind observers
  **[S]**; Szafir (2018) found that smaller marks need larger colour differences **[C]**. Adopted
  (`palette.js`): pairs of categorical colours that were at least ΔE00 10 apart and are no longer, for
  normal vision or a simulated deficiency. No data was found on how often palette changes cause this.
- **States nobody configured.** Crawljax (Mesbah, van Deursen & Lenselink, TWEB 2012) crawls an Ajax
  application by clicking its candidate elements and infers a state-flow graph; regression testing of
  Ajax applications compares such graphs between versions (Roest, Mesbah & van Deursen, ICST 2010).
  **[S]** Listing event listeners does not work for React 17 and later, which attaches them at the
  root. **[S]** Adopted as an option (`explore.js`): the controls of each page, paired between base and
  head by path and label, clicked once each on both sides; the states compared like configured ones,
  and a control that changed the page (pixels or URL) in the base but nothing in the head reported
  as dead. One level deep only.
- **Resources.** OwlEye's sample of display bugs: 25 % missing images, 6 % null values shown as text.
  **[C]** `document.fonts` reports each web font face's load status. **[C]** Adopted: web fonts that
  fail in the head are named; text with `undefined`, `NaN`, `null`, `[object Object]` or `{{` is
  labelled as a value that failed to load.
- **What the check did not see.** CDP's `CSS.startRuleUsageTracking` reports the style rules a page
  used **[C]** (it lists only used rules; the full list comes from the stylesheets' text). Cilla found
  60 % of selectors unused on average across 15 systems (ICSE 2012). **[S]** No paper was found that
  maps a stylesheet diff to the states a visual test should render. Adopted as an option
  (`coverage: true`): rules the PR added or changed that no checked state used, and removed ones no
  base state used, are listed as a warning instead of passing silently. Rules are compared as the
  deployed text, so no source maps are needed.
- **Shifts while loading.** The Layout Instability API scores a shift by the share of the viewport
  that moved times how far, counts moves of 3px or more, and names up to five moved elements; CLS is
  good at 0.1 or less. **[C]** Adopted: on the same fixture, elements that move in the head and in
  neither base render are reported, whatever the score: a short list jumping a few dozen pixels
  scores far below 0.1.
- **Not adopted yet**, with the evidence found: WCAG 2.5.8 target size (axe-core's rule **[C]**; mostly re-labels size changes uihash reports);
  per-character font fallback via `CSS.getPlatformFontsForNode` (**[C]**; whole-font failures are
  covered); keyboard focus order
  (Chiou et al., FSE 2021 **[S]**; about 200 Tab presses per state); animation and flashing checks (`document.getAnimations()` **[C]**, WCAG 2.3.1
  **[C]**). Learned screenshot detectors (OwlEye 85 % precision /
  84 % recall on Android **[C]**; the best of 13 vision-language models found 40.7 % of single-property
  CSS changes, DiffSpot **[S]**) were judged out of scope.

## Fifth round: telling intended changes from regressions

Tags as above. The question: of the differences a PR makes, which did its author mean? What uihash
does about it is in [RESEARCH.md](RESEARCH.md) ("Intended or not").

- **What tools do.** No shipping tool decides it; they scope, suppress, group, remember and, lately,
  ask a language model.
  - Chromatic's TurboSnap re-tests only the stories whose files the dependency graph links to the
    changed files ("only the dependency graph decides this, not the nature of the change"); its UI Tests
    are for unintended changes and UI Review for intended ones; baselines change only when someone
    accepts. **[C]**
  - Percy's Intelli-ignore marks differences "not noticeable to the human eye"; its Visual Review Agent
    (October 2025) tags each change as a likely bug or a likely intended update and, on PR builds,
    "Matches PR summary" or not, with no published accuracy. **[C]**
  - Applitools' Root Cause Analysis lists the DOM and CSS differences inside a diff region (no link to
    source or commits); its auto-maintenance applies one decision to every step with the same
    difference. **[C]**
  - Argos fingerprints each change by the shape of its diff, remembers ignored ones and auto-ignores
    changes that recur (3 in 7 days by default); its documented agent workflow compares screenshots with
    the PR's title, description and diff and may approve. Meticulous shows the lines a PR touched next to
    its diffs and offers agent triage. Happo's "ignore" is for diffs "you can't attribute to the changes
    made". **[C]**
  - No product found that attributes a difference to a particular edit by rendering without it. **[U]**
- **Research.**
  - Delta debugging isolates the change that causes a failure by re-running with subsets of a change set
    (Zeller, ESEC/FSE 1999; HDD, ICSE 2006 **[S]**). Chianti (OOPSLA 2004) finds which atomic edits
    affect each test **[S]**. Ply (UIST 2018) learns what a CSS property does by deleting it and
    comparing screenshots **[C]**. No paper found applying this to explain visual regressions **[U]**.
  - Mazinanian, Tsantalis & Mesbah (FSE 2014) formalise order dependencies between CSS rules: reordering
    rules of equal specificity can invert "the original overriding relationship" **[C]**. Cilla (ICSE
    2012) maps rules to elements at run time; about 60 % of selectors were unused **[S]**.
  - Language models judging intent from PR text: Testora (ICSE 2026) on behavioural differences, 55-83 %
    precision depending on the model, with 139 of 164 differences intended **[C]**; RippleGUItester (2026)
    on screenshot differences, 46 % precision **[C]**; DiffSpot (2026): the best of 13 vision-language
    models found 40.7 % of single-property CSS changes in screenshots **[S]**, so a model should be given
    the change as text, not the picture.
  - Watanabe et al. (2026) read 307 PRs that link Chromatic results: issues were layout 40 %, appearance
    28 %, colour 15 %, text 10 %, state 7 %; regressions came from "seemingly unrelated files"; they
    suggest layout shifts are mostly unintended and new content mostly deliberate. **[C]**
  - Conventional-commit types `refactor`, `chore`, `build`, `test`, `docs` and `perf` say no behaviour
    changes (`style` means code formatting, not CSS) **[C]**; up to 15 % of commits are tangled with
    other changes (Herzig & Zeller, MSR 2013) **[S]**.
- **Adopted** (described in [RESEARCH.md](RESEARCH.md), "Intended or not"):
  - *Counterfactual attribution* (`attribute.js`): every rule-level edit of the deployed CSS undone on
    its own in the live head page (`CSS.setStyleSheetText`), the page re-extracted and re-checked; a
    finding that goes away came from that edit. Undoing all edits separates CSS causes from markup,
    script and data. No source maps: it works on the CSS the browser loaded. Not done: hunks inside
    one rule, interactions that need two edits together (reported as "the PR's CSS edits together"),
    and the same for markup and scripts.
  - *How an edit reaches an element*: its selector matched in the page (selected, inside, through a
    custom property, elsewhere), and `!important` that now beats an untouched, more specific rule (the
    Mazinanian et al. inversion, detected from specificity rather than order).
  - *Losses* (`loss.js`): distinctions that collapse, state classes whose removal no longer changes
    anything, hover feedback lost, instances that drift from their kind (Engler et al.'s "deviant
    behaviour", with regular patterns and new classes exempted), siblings that no longer match,
    round trips that no longer return. Plus layout invariants: clipping by a non-scrolling container,
    content past a non-scrolling window, images broken, blurry or cropped, markers off their targets.
  - *Declared intent*: conventional-commit types and a `no-ui-change` label turn every finding into
    one to check.
- **Not adopted**: ownership (CODEOWNERS needs a map from findings to source files, which the testbeds
  lack); history of decisions (Argos-style fingerprints; no decision history to learn from here);
  magnitude as a signal (5 of 189 Chromatic issues were imperceptible, and a 1px break is visible).

## Ideas from the survey not yet implemented

1. **Count-vector classification** (ExAlg) of tuple / list / optional, replacing the prefix/suffix heuristics.
2. **Similarity-clustered sibling keys** (MDR/DEPTA), learned at calibration and frozen in the schema, for class-free (CSS-in-JS) builds.
3. **A warning tier** (FragGen): facts never seen but composed of known parts are reported as warnings; style changes to known facts as errors.
4. **A Diffy-style noise gate** for live monitoring: render a secondary at check time and suppress facts that also differ between primary and secondary.
5. **Layout relations** (X-PERT/GWALI/ReDeCheck) as a second, data-robust channel for content-driven layout bugs.
6. **Daikon-style confidence** for static positions: report changes at weakly-evidenced static positions (few calibration samples) as warnings.
7. **Paint-order occlusion**: sample with `pointer-events` forced to `auto` (through a constructed stylesheet, so no DOM change) and skip transparent hits, so overlays that ignore the mouse count as covering.
8. **2.4.11 Focus Not Obscured**: in the `:focus` render, sample several points of each focusable control to tell "entirely hidden" from "partly hidden".
9. **Composited ΔE for opacity and shadows**: label `opacity: 0.97` with the colour difference it makes against the actual background.
10. **Input hashing** (TurboSnap-like): skip pages whose HTML, scripts, styles and API responses hash the same on base and head.
11. **Attribution beyond CSS**: record the script location of every DOM mutation in the head (a stack per created or changed element) and match it against the PR's changed lines, so markup and script changes get "from your edit to `toolbar.js:120`" as CSS ones do.
12. **Decision history**: fingerprint each finding (element kind, property, before → after) with the reviewer's decision; a rejected fingerprint that comes back is a strong regression signal (Argos fingerprints, Skia Gold negatives).
13. **Ownership**: map findings to source files through source maps, then to CODEOWNERS, and request review from the owners of a component a PR changed without touching its files.
