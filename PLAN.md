# DayFilm — Build Plan

A private-first daily-vlog platform: record short clips through the day in the
browser, arrange/trim them on a timeline, finalize into one film per day, and
share selectively with mutuals — wrapped in an Awwwards-grade cinematic design.

*(“DayFilm” is a working codename — rename anytime.)*

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| App framework | **Next.js (App Router) + TypeScript** | One repo, one language; API routes/server actions replace a separate backend; native Vercel deploy |
| Styling | **Tailwind CSS** | Fast iteration; design tokens in config |
| Motion | **GSAP + ScrollTrigger + Flip**, **Framer Motion** | Scroll choreography, React state/page transitions. *(Lenis removed 2026-07-03 — broke native scroll on work pages; may return for the M7 landing page only, with its CSS imported and re-measure after async loads.)* |
| Recording | **MediaRecorder + getUserMedia / getDisplayMedia** | Native browser capture; camera+mic everywhere, screen+mic desktop only |
| Final render | **ffmpeg.wasm** (client-side) | Free stitch/encode in browser; desktop-fast, phone-acceptable |
| Database | **Postgres** — local install (dev) ↔ **Supabase Postgres** (prod) | Same engine both envs; switch via `DATABASE_URL` |
| ORM | **Prisma** | Type-safe queries, migrations, Studio for inspecting data |
| File storage | **Storage adapter**: local disk `./uploads` (dev) ↔ **Supabase Storage** (prod) | Switch via `STORAGE_DRIVER` env var; app code never knows the difference |
| Auth | **Auth.js (NextAuth v5)**, sessions in Postgres | Works identically local & prod; Google OAuth + email |
| Deploy | **Vercel** (app) + **Supabase free tier** (DB 500MB + Storage 1GB) | Zero-cost MVP |

### Explicitly NOT in the stack (for now)
- Separate FastAPI/Python backend — no server-side video work exists to justify it
- Server-side transcoding — revisit only if browser render hits limits
- Three.js/WebGL shader effects — post-MVP polish

## 2. Environment switching

```
# .env.local (dev)                    # Vercel env vars (prod)
DATABASE_URL=postgres://localhost/... DATABASE_URL=<supabase pooler url>
STORAGE_DRIVER=local                  STORAGE_DRIVER=supabase
                                      SUPABASE_URL=..., SUPABASE_SERVICE_KEY=...
```

Storage adapter interface: `upload(path, blob)`, `getSignedUrl(path)`, `delete(path)`.
Two implementations: `LocalDiskAdapter` (serves via a `/api/media/[...path]` route),
`SupabaseAdapter` (private bucket + signed URLs).

## 3. Data model (Prisma sketch)

```
User      id, email, name, image, createdAt            (+ Auth.js tables)
Follow    followerId, followeeId, status(PENDING|ACCEPTED), createdAt
Day       id, userId, date, status(DRAFT|FINALIZED),
          timeline Json        // ordered [{clipId, inSec, outSec}] — the "edit"
Clip      id, dayId, userId, orderIndex, durationSec, sizeBytes,
          storagePath, mimeType, source(CAMERA|SCREEN), createdAt
Film      id, dayId(unique), userId, date, durationSec, sizeBytes,
          storagePath, thumbPath, createdAt             // the finalized video
Share     filmId, recipientId, createdAt               // who can view a film
```

Key decisions encoded here:
- **Editing is metadata.** Trim/split/reorder only mutate `Day.timeline` JSON;
  clip files are never touched until Finalize. A "split" is two timeline entries
  referencing the same clip with different in/out points.
- **One film per day per user** (`dayId` unique on Film).
- **Raw-clip cleanup:** on Finalize success → mark Day FINALIZED; delete raw clip
  files + rows after a 7-day grace period (or immediately if user opts in).
- **User delete:** deleting a Film removes storage file + row + shares → frees quota.
- **Private by default:** a Film is visible only to owner + explicit Share rows.
- Show a storage-used meter (sum of sizeBytes) so the 1GB ceiling is visible.

## 4. Screens

| Screen | Purpose | Design register |
|---|---|---|
| Landing | Pitch + login | Full cinematic (Zentry-style scroll choreography) |
| Record | Viewfinder, mode toggle (camera/screen), record/stop, clip saved feedback | Near-empty, cinematic |
| Editor | Today's clips on a timeline: reorder (drag), trim, split, preview, Finalize | Quiet, tactile micro-interactions |
| Gallery ("Archive") | Your films by date, hover preview, expand-to-player | Getty-style editorial archive |
| Friends | Search users, follow requests, accept/decline | Quiet |
| Shared with me | Films mutuals sent you | Same archive language |

## 5. Design language (built in M0, applied everywhere)

- Two typefaces: one huge grotesque display (e.g. Archivo Black), one text face
- Palette: near-black `#0e0e0c`, off-white `#f0efe9`, one accent (burnt orange `#D85A30`) — tune later
- One signature easing curve + standard durations; entries from below w/ stagger
- Film-grain overlay, custom cursor (desktop), magnetic buttons
- Rules: animate transform/opacity only; respect `prefers-reduced-motion`;
  motion never blocks function (record & editor always instantly usable)

## 6. Milestones

- **M0 — Scaffold + design language.** ✅ *(done 2026-07-03)* Next.js/TS/Tailwind/Prisma/local Postgres;
  storage adapter (local); fonts, tokens, Lenis, motion primitives. App shell nav.
- **M1 — Record & save.** ✅ *(done 2026-07-03)* Camera+mic and screen+mic capture; MediaRecorder → upload
  clip on stop; clips persist against today's Day. (Stub dev user — no auth yet.)
- **M2 — Timeline editor.** ✅ *(done 2026-07-03)* Clip strip for today; drag-reorder; trim handles; split;
  timeline preview playback via metadata (no rendering).
- **M3 — Finalize.** ✅ *(done 2026-07-03)* ffmpeg.wasm stitch per timeline; cinematic progress sequence;
  upload Film + generated thumbnail; raw-clip cleanup; Film delete w/ confirm.
  *(Raw clips delete immediately on finalize rather than 7-day grace — per user decision.)*
- **M4 — Archive.** ✅ *(done 2026-07-03)* Gallery of films by date; hover preview; expand-to-player
  (framer-motion shared-element); storage meter; drafts strip → editor.
- **M5 — Auth.** ✅ *(done 2026-07-03)* Auth.js: Google OAuth (needs env creds) + dev-only
  email login; JWT sessions; proxy.ts guards pages (redirect) and APIs (401);
  stub-era data attaches by email; Google links via verified-email linking.
- **M6 — Social.** ✅ *(done 2026-07-03)* Follow requests/accepts; share picker on films
  (recipients = accepted followers, not strict mutuals — followers watch your
  films; private by default); "from friends" view on /friends; unfollow revokes
  that direction's shares.
- **M7 — Landing + polish.** 🔶 *(code done 2026-07-03; deployment pending accounts)*
  GSAP scroll-choreographed landing; direct-to-storage uploads (issue URL → PUT
  → register) clearing Vercel's 4.5MB body cap; mobile long-press split; prod
  build green. Remaining: user creates Supabase + Vercel accounts, Google OAuth
  creds, run `prisma migrate deploy`, set Vercel env vars (see README-DEPLOY).
- **M8 — Topic projects.** ✅ *(done 2026-07-04)* Day model generalized to Project
  (kind DAY | TOPIC); naming dialog after a take (new topic / join existing,
  case-insensitive / default My Day); /studio/[id] record+edit tabs; /record hub
  with in-progress + title-grouped completed folders; one post per calendar day
  via `Film@@unique(userId,date)`; canvas-generated title-art posters.
- **M9 — Daily plan (tasks).** ✅ *(done 2026-07-04)* Task/Subtask models —
  priority + optional deadline, subtasks gate parent completion (auto-completes
  on the last one, reopens if unchecked or a new subtask is added); an
  incomplete task never rolls over, it simply stays open until done (no date
  field, no streaks — research-driven: see plan doc for the Zeigarnik/endowed-
  progress/SDT reasoning). `/plan` nav tab, first in the list. Open/Completed
  side-by-side; completing a task animates it between them via the same
  framer-motion shared-`layoutId` FLIP technique as the Archive's film player.
- **M10 — Study Space.** ✅ *(done 2026-07-05)* Per-task video + notes
  workspace (`/study/[id]`) so learning from a lecture never means switching
  tabs. Literal "embed Google search" is a hard platform wall (Google sends
  `X-Frame-Options: DENY`; even Google's own search-widget iframe support is
  discontinued) — substituted with in-app YouTube search (official Data API
  v3, free tier) + paste-any-link, which embeds live only when the target's
  own headers allow it (checked once on add), otherwise a preview card with
  "open in new tab". `Task` gains `notes`/`studyLayout`; new `StudyResource`
  model (YOUTUBE | LINK). Hover the notes pane → the active YouTube video
  pauses via the official IFrame Player postMessage protocol; leave → it
  resumes — confirmed via the player's own broadcast state, not just our
  command. Resizable split pane reuses the exact pointer-drag pattern from
  the editor's `TrimBar`. No new paid account required.
- **M11 — Friends: requests page + per-friend threads.** ✅ *(done 2026-07-06)*
  Instagram-style split of the old 377-line combined page. `/friends` is now
  a threads list (one row per accepted connection, sorted by latest share
  activity); `/friends/requests` holds all decision-making (accept/decline,
  cancel, search); `/friends/[userId]` is a chat-styled feed of films sent
  between the two of you (video-only — no text messaging, confirmed scope),
  sender vs. recipient visually distinguished, with an in-thread "send a
  film" picker. No new relationship model — a thread is just a query over
  the existing `Follow`/`Share` tables. Expand-to-player reuses the same
  `layoutId` shared-element technique as the Archive/Study Space (fourth
  reuse of that one motion idiom). Ember badge on the friends nav item for
  pending incoming requests. Old monolithic `Friends.tsx` deleted outright.
- **M12.1 — Goal Trees: AI pipeline.** ✅ *(done 2026-07-07)* Long-horizon
  goals as a tree, mapped from the user's own prose. Research-grounded
  (proximal-goal / implementation-intention / WOOP citations in the plan
  doc). Model is `gpt-oss-120b` on Groq, not the `llama-3.3-70b-versatile`
  originally named — near-identical free-tier limits, but `gpt-oss-120b`
  supports `strict: true` JSON Schema mode (guaranteed-conformant output,
  vs. best-effort). Key rotation across `GROQ_API_KEY_1..5` with reactive
  429 failover (`src/lib/groq.ts`). New models: `GoalPlan`, `GoalEntry`,
  `GoalNode` (self-referential tree, `choiceGroupId` marks either/or
  siblings, WOOP `obstacle`/`obstaclePlan`), `GoalCheckpoint` (mirrors
  `Subtask`'s exact auto-complete/reopen rule); `Task.goalCheckpointId` FK
  laid for the M12.4 daily-plan bridge. `/goals`: spacious prose composer
  with soft WOOP-shaped ghost-text scaffolding, past entries listed,
  explicit submit (never auto-fires on keystroke); a simple nested
  placeholder tree view proves the pipeline before M12.2's real canvas.
  Verified with two real Groq keys against the user's actual master's-degree
  scenario end to end — correct root/dependency ordering, concrete
  implementation-intention-shaped checkpoints, an obstacle/plan inferred
  only where the text supported it, and a genuine either/or (thesis vs.
  coursework) correctly grouped as a choice, not a parallel branch.
  Multi-entry merge (M12.3) intentionally rejected for now with a clear
  message rather than guessed at.
- **M12.2 — Goal Trees: the real canvas.** ✅ *(done 2026-07-07)* Replaced
  M12.1's placeholder list with the actual pan/zoom visualization —
  `@xyflow/react` for the interactive canvas, `d3-hierarchy` (`stratify` +
  `tree`) purely for layout math (no D3 DOM manipulation). Choice-group
  siblings get tighter spacing via a custom `separation()` function, a
  dashed edge style, and a floating "choose one path" label rendered as its
  own React Flow node. Cards are fixed-size and non-draggable — position is
  owned by the layout, not a free-form canvas the user has to tidy.
  Clicking a card hands off via a shared `layoutId` (the same technique
  used for Archive/Study Space/Friends) into a full detail overlay, which
  then does a genuine 3D `rotateY` flip (`preserve-3d`, both faces
  `backface-visibility: hidden`) to reveal the back — checkpoints
  (identical auto-complete rule to M9), inline-editable title/description/
  date/obstacle/plan, add/remove checkpoints. Edges between a node and its
  parent tint from muted ink toward ember via `color-mix()`, keyed to that
  subtree's checkpoint-completion fraction — the "never lose the big
  picture" requirement made literal. Verified live end to end: real
  extracted tree rendered correctly, dashed choice edges + label confirmed
  in the DOM, flip observed mid-rotation and settled, checkpoints toggled
  through the real UI, and the edge to a newly-100%-complete node was
  confirmed to shift to pure ember — in both themes.
- **M12.3 — Goal Trees: incremental entries, safely.** ✅ *(done 2026-07-07)*
  Writing more into an existing plan no longer restarts it — the model now
  gets the current tree (real ids, current completion state) plus the new
  prose, and proposes an updated tree via a dedicated merge prompt
  (`extractMergeTree`, `src/lib/goalExtraction.ts`) that's told to reuse
  existing ids for anything still true and only drop an id if the new text
  actually contradicts it. Nothing from that proposal is ever applied
  directly: `computeDiff()` (`src/lib/goalDiff.ts`) diffs it against the
  live tree — added/renamed/removed nodes and checkpoints — and the API
  returns the diff for review rather than writing anything. The one
  structural guarantee that doesn't depend on the model behaving: a
  proposed removal is only ever allowed to touch the database if it has no
  completed checkpoints, or if its id appears in an explicit
  `confirmedRemovalIds` list the user opted into — checked server-side in
  `applyMerge()`, not just enforced by the UI. `applyMerge` runs as one
  topological-upsert pass (updates/inserts, mirroring `persistFirstTree`)
  followed by deletes, in that order, specifically so a node being kept is
  always re-parented away *before* any cascade from a sibling's deletion
  could otherwise take it down too. `MergeReview.tsx` is the review screen:
  new steps/checkpoints and renames need only a glance, harmless removals
  are shown as already-applied, and anything with progress at stake gets
  its own ember-tinted section with a per-item "remove it anyway" checkbox
  that defaults unchecked. `GoalPlanView` gained an "add more —" action
  that reopens the composer over an existing tree without losing it.
  Verified with a real multi-entry scenario against a live test plan: with
  a completed Linear Algebra node (2/2) and a partially-completed Data
  Structures node (1/2), an entry claiming Data Structures was waived
  correctly produced a diff flagging it as a risky removal; confirming with
  an empty `confirmedRemovalIds` preserved it exactly as it was, and a
  second attempt with its id explicitly confirmed actually removed it —
  while Linear Algebra stayed untouched throughout. Re-ran the same
  progress-at-stake scenario through the actual browser UI (composer →
  processing overlay → `MergeReview` → confirm without checking the box)
  and confirmed the completed item survived with its checkbox state intact
  and a genuinely new checkpoint from that entry was correctly added
  alongside it. Test plan deleted after verification.
- **M13 — Goal Trees: designed to be motivating, not the AI pipeline.**
  ✅ *(done 2026-07-07)* Direct response to the user's own read after using
  M12: it "does not feel attractive enough" and didn't make them "feel
  motivated." Five sub-milestones, all research-grounded (goal-gradient
  effect, endowed progress, Duolingo-style loss-aversion streaks, the
  fresh-start effect, Forest/Habitica growth metaphors, Fogg's Tiny
  Habits "Shine") — citations in the plan doc. **M13.1**: `GoalNodeData`/
  `GoalCheckpointData` widened with `completedAt` (the API already
  returned it; the client types just didn't expose it), new
  `src/lib/goalProgress.ts` (`planCompletion`, `activityByDay`,
  `currentStreak`) powering a new `GoalProgressHeader` — an overall %
  ring, a streak flame, and a 14-day activity heatmap, all derived from
  data already on hand, no new endpoints. **M13.2**: `src/lib/
  goalNextMove.ts` (`selectNextMove`) surfaces the single nearest
  actionable checkpoint — same earliest-deadline precedence
  `layoutGoalTree` already uses for the canvas, undated nodes falling
  back to shallowest-first rather than last — as a `NextMoveSpotlight`
  above the tree, so a returning visit answers "what do I do today"
  before the user has to parse anything. **M13.3**: `src/lib/
  goalBloom.ts` (`bloomStage`: bare → budding → blooming → golden) plus a
  shared `BloomBadge` glyph used identically in both `GoalCard` and
  `GoalCardDetail`'s front face (same `layoutId` flip, so the badge can't
  visibly pop between the two); edges now thicken as well as tint with
  subtree progress, reading as a vine filling in rather than a flat
  color change — all through the single existing ember accent, no new
  hues introduced. **M13.4**: `CelebrationBurst` (a small ember particle
  burst + a varied, never-repeated one-line affirmation — Fogg is
  explicit that fixed/repetitive celebration stops registering) fires on
  every checkpoint completion, with a bigger tier when a whole node
  completes; `persistFirstTree` now seeds every new plan's root with one
  already-completed "committed to this" checkpoint, so the very first
  render shows real, non-zero progress (endowed progress effect).
  **M13.5**: a `localStorage`-only fresh-start banner
  (`src/lib/goalFreshStart.ts`) reframes re-entry after a week/month
  boundary as a new chapter rather than a cold drop back into a static
  tree. Verified live end to end on the user's real plan (with careful
  cleanup after each test — every checkpoint toggled for verification was
  reverted to its original state afterward) plus a disposable throwaway
  plan specifically for the endowed-progress and fresh-start checks: the
  progress ring/streak/heatmap matched hand-computed values, the
  spotlight correctly advanced (with an initial false alarm that turned
  out to be the animation's own transition time, not a bug — confirmed
  by waiting past `mode="wait"`'s exit+enter duration), all four bloom
  stages rendered correctly, the celebration burst's state transition was
  traced end-to-end through React state (a real fix landed along the way:
  the celebration setState was originally called from inside the
  `setNodes` updater function, an impurity StrictMode's double-invocation
  made easy to catch), a fresh plan's root started at a non-zero
  percentage, and the fresh-start banner appeared and correctly stayed
  dismissed after a normal same-day reload.

Each milestone is independently testable. Local dev never requires Supabase.

## 7. Known constraints / accepted trade-offs

- ffmpeg.wasm ~2GB memory ceiling → fine for short daily films; server render later if ever needed
- Mobile browsers can't screen-record → phones are camera-only (by design)
- MediaRecorder output codec varies (webm/mp4 by browser) → normalize at Finalize
- Supabase free tier: 500MB DB / 1GB storage → clip cleanup + delete + meter mitigate
- Vercel functions cap request bodies at ~4.5MB → before deploy (M7), clip/film
  uploads must move to direct-to-storage signed upload URLs (adapter grows a
  `createUploadUrl` method; local driver keeps the route upload). Works fine
  locally today.
