# 2026-09-27 — Pre-launch organic social plan

Status: Draft (merch-lead, STI-328 GTM readiness package). Owner: merch-lead.
Organic only. **Zero paid spend** — no budget authority held by merch-lead, and
none requested by this plan.

> **Do not execute this plan yet.** It is written to be executable the day the
> apex is ungated ([STI-327](/STI/issues/STI-327) → board approval
> `45b0b09e`). Until then, every link below lands a prospect on a Shopify
> password page and every post burns the account's first-impression history for
> nothing. Pre-launch, the correct organic motion is **brand-building with no
> outbound link at all** — see the sequencing note at the end.

## Why organic and not paid

Paid would be faster, and that is precisely the argument against it for a
brand whose entire claim is considered construction. The persona
([positioning doc](2026-09-27-positioning.md)) discovers through maker/process
content and is explicitly sceptical of brands that lead with polish and no
provenance. Organic process content is the only channel that demonstrates the
claim at unit cost, and it produces assets (thread-level macro footage, hoop
time-lapses) that a paid campaign would have to buy anyway. Also: no spend
authority means no spend decision.

## Content buckets

Three buckets, deliberately narrow. Every post is one of these; a post that
fits none of them does not get made.

**A. Thread-level proof (40% of output).** Macro footage and stills of the
embroidery itself: thread tension, the sleeve mark at raking light, the
sticker patch before and after pressing. This bucket *is* the positioning —
"black on black" is not a claim anyone believes until they see it resolve under
direct light. Highest effort, highest conviction, most re-usable.

**B. Design process (35%).** How a mark is built: sketch → digitise → hoop →
stitch-out. Shows the two-pass construction (design layer, then brand mark)
described in the product catalog. This is the bucket that travels best to
communities that are not aesthetic-apparel at all — `r/embroidery` rewards it
directly.

**C. Construction spec (25%).** The unglamorous facts: fleece weight, seam
construction, why the hoodie is 2–3 weeks made-to-order rather than pulled from
a bin. Text and stills, no video. Cheapest to make, and it is the bucket that
answers the "$185 for a hoodie" objection *before* the objection is asked.

> Use **2–3 weeks** for the hoodie in all social copy — that is what Shopify
> serves live and it is the system of record. The repo catalog still says
> 3–5 weeks for the hoodie; that contradiction is finding #3 in the
> [store copy pass](2026-09-27-store-copy-pass.md) and must be resolved before
> launch so the two never disagree in public.

**Not a bucket:** mood shots. Black-on-black is unphotographable as mood and
indistinguishable from every other dark brand. A mood post is a mood post from
any account. This is the discipline that keeps the plan credible.

## Cadence — 4 weeks

Per week, all channels. Threads on Reddit are scheduled to the subreddit's own
rules, not to this cadence.

| Week | Theme | Bucket A (proof) | Bucket B (process) | Bucket C (spec) |
| --- | --- | --- | --- | --- |
| 1 | Establish the claim | Sleeve mark under direct light vs flat | Digitise a mark, 20s | Why black on black (the hero line, in a post) |
| 2 | Construction | Stitch-out macro, thread tension | Hoop set-up, time-lapse | Fleece weight + why not a cheap blank |
| 3 | The object | Sticker patch: peel, press, result | Two-pass build explained | Made-to-order: what 2–3 weeks buys |
| 4 | The person | Garment in wear, one frame, no styling | What we rejected and why | Capsule close: three SKUs, one construction logic |

Week 4 is the natural pivot to launch content — the account has four weeks of
proof behind it by the time there is anything to buy.

## Channel plans

### Instagram — proof, primary

- **Role:** the shop window. Highest per-post production value, best for
  photography when it exists.
- **Cadence:** 3 posts + 4 stories per week. Feed: 1× bucket A, 1× B, 1× C
  rotating. Stories daily behind-the-scenes, deliberately unpolished — this is
  where the persona decides whether the brand is real.
- **Links:** link in bio → storefront once ungated. Story link stickers on
  every bucket-A post. No link in feed captions (kills reach, and there is
  nothing to buy yet).
- **Blocking dependency:** the `og:image` bug in the copy pass. Instagram link
  previews will unfurl the Nuxt demo logo until that is fixed. Fix the og:image
  **before** the first post with a link.

### TikTok — process, highest reach

- **Role:** reach. Stitching content does unusually well here; hoop time-lapses
  and thread-level macros are natively vertical and inherently satisfying.
- **Cadence:** 4–5 per week, all from bucket B, 12–20s, no voiceover, no
  trending audio, no stitch-bait ("POV: you ordered it 2 weeks ago").
- **Links:** none until ungated. Post-gate, link only in the bio and on the
  2–3 posts that show a finished garment in wear. This account is for reach,
  not conversion.
- **Note:** the account should be established *now* (pre-gate, no links) if the
  operator wants organic reach banked by launch day. That is the one piece of
  this plan that is safe to run before ungating. **Recommendation: ask the
  operator whether to start it** — it is a judgement call about burn-in, not
  about traffic.

### Reddit `r/embroidery` — highest-credibility, strictest rules

- **Role:** credibility with people who actually do this. The single best
  channel for bucket B and the only one where a technical question in the
  title reliably outperforms a promo post.
- **Cadence:** 1 post per week maximum, and **not** on a schedule — post when
  there is something real to show. Check each subreddit's self-promotion rule
  before posting; several cap promotional content and some forbid storefront
  links outright.
- **Rule:** never lead with the link. Lead with the technique, the problem, or
  the question. Link to the storefront only in a comment, only if asked, and
  only if the rules permit. A deleted post here costs more than a month of
  earned reach.
- **Expectation:** low volume, high trust. This channel does not hit the KPI.
  It is the channel that makes the other channels believable.

### Reddit `r/goth` — hostile to marketing, use with care

- **Role:** reach into the aesthetic, but **the highest risk of the four**.
- **Cadence:** 0–1 posts in 4 weeks, comment-first. Contribute to threads
  genuinely — answer garment/festival/alternative-fashion questions for two
  weeks *before* posting anything of your own.
- **Rule:** treat this as a community, not a channel. A single promotional post
  without prior participation is the classic way to get a brand permanently
  disliked. When the post does happen, it is bucket C (construction spec) with
  no link, in a thread where the brand is already a known commenter.
- **Recommendation:** comment-first for the full 4 weeks. Treat the single
  allowed post as a bonus, not a deliverable.

## Link policy (explicit, as the issue requires)

| Channel | Pre-gate | Post-gate |
| --- | --- | --- |
| Instagram | No links. Bio text only. | Bio → storefront; story stickers |
| TikTok | No links | Bio → storefront; on ≤3 finished-garment posts |
| r/embroidery | No links | Comment-only, only if asked, only if rules allow |
| r/goth | No links | No links. Not negotiable. |

Every outbound link points at **`https://www.stitch-ash.com`**. **Never** link
`preview.stitch-ash.com` in a public post — it is a preview environment and
will be replaced by the apex on launch day, stranding every post that points at
it.

> **Domain warning — do not "correct" this to `stitch-and-ash.com`.** The
> brand's wordmark is "Stitch and Ash", and the contact page advertises
> `hello@stitch-and-ash.com`, so the longer spelling is tempting. It is the
> wrong host. Verified 2026-09-27:
>
> ```
> $ curl -sS -o /dev/null -L --max-time 15 https://www.stitch-and-ash.com
> curl: (6) Could not resolve host: www.stitch-and-ash.com
>
> $ curl -sSI https://www.stitch-ash.com | head -3
> HTTP/2 302
> location: https://www.stitch-ash.com/password
> ```
>
> `stitch-and-ash.com` does not resolve in DNS; the live apex is
> `stitch-ash.com` (repo `nuxt.config.ts:28` uses `'stitch-and-ash'` only as the
> internal project *name*, and `scripts/shopify-env.ts` references the
> unrelated `stitch-and-ash.myshopify.com` admin domain). One wrong character
> here costs every link in the account. Use `stitch-ash.com` everywhere.

## Sequencing — the "day one" note

The issue's premise is that this work ships the day the gate lifts. Two of the
four channels need pre-gate runway, so the honest sequencing is:

1. **Now (pre-gate):** start the TikTok account and the r/embroidery
   participation **with no outbound links**. This banks the organic runway
   that makes launch-day posting plausible. Needs an operator nod on account
   creation (accounts are credentials).
2. **Gate-lift day:** fix `og:image` first (see the copy pass), then the launch
   post across Instagram + TikTok, then start weekly KPI reporting against the
   KPI template with a real week 0.
3. **Weeks 1–4 post-gate:** run the cadence. Instagram + TikTok carry the
   launch; Reddit contributes credibility in the background.

**The single most important pre-launch asset is product photography**
(`PHOTOGRAPH PENDING` on all three SKUs). Everything in bucket A is degraded
without it. design-lead owns this and it is the highest-value thing that
currently blocks conversion.

## Success criteria for the 4 weeks

Pre-gate, these are **not** revenue metrics — there is no revenue to measure
and claiming otherwise would be fabrication. Measured honestly:

- Follower growth and post-level engagement on TikTok/Instagram.
- r/embroidery: posts not removed, comment quality, whether anyone asks what the
  brand is (the actual signal).
- r/goth: comment-only engagement, zero removals.
- **No metric here is a substitute for the $500 GM KPI.** That clock has not
  started. It starts when the apex is ungated and a real order completes.

## Related

- [STI-328](/STI/issues/STI-328) — GTM readiness package
- `docs/decisions/2026-09-27-positioning.md` — persona, voice, anti-persona
- `docs/merch/2026-09-27-store-copy-pass.md` — finding #1 (og:image) is the
  launch blocker for Instagram
