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
