# OpenAI Build Week submission package

Prepared for **PromptBreak: Bug Sweepers**. This document is a drafting aid; it is not proof of eligibility and does not submit or publish anything.

## 0. Official requirements snapshot

Checked on July 21, 2026 against the OpenAI Build Week website and the Devpost Official Rules.

- Recommended track: **Apps for your life**
- Submission deadline: **July 21, 2026 at 5:00 PM PDT / July 22, 2026 at 9:00 AM JST**
- Official Rules judging period: July 22 at 10:00 AM PDT through August 5 at 5:00 PM PDT
- Winner announcement: on or around August 12 at 2:00 PM PDT
- English submission materials are required, or English translations must accompany non-English materials.
- Required: a working project, category, project description, public YouTube demo, repository URL, working-project access, and the `/feedback` Codex Session ID for the thread where most core functionality was built.
- The demo must be **under three minutes**, public on YouTube, contain audio, clearly show the working project, and explain the use of both Codex and GPT-5.6.
- The repository must be public with relevant licensing, or private and shared with `testing@devpost.com` and `build-week-event@openai.com`.
- The README must include setup instructions and explain the Codex collaboration, key human decisions, and how GPT-5.6 and Codex contributed.
- An existing project is eligible only if it was meaningfully extended during the submission period. Prior work and new work must be clearly distinguished with evidence such as dated commits or timestamped Codex sessions.
- Judges first apply a viability pass/fail, then score four equally weighted criteria: Technological Implementation, Design, Potential Impact, and Quality of the Idea.

Important discrepancy: the OpenAI event page lists judging through August 7, while the governing Official Rules list August 5. Treat August 5 as authoritative unless Devpost posts an amended rule.

Official references:

- OpenAI event page: https://openai.com/build-week/
- Devpost challenge page: https://openai.devpost.com/
- Official Rules: https://openai.devpost.com/rules

## 1. English title and descriptions

### Title

```text
PromptBreak: Bug Sweepers
```

### Short description

```text
A bilingual browser action game that turns generative-AI waiting time into a focused, satisfying debugging break.
```

### Detailed description

```text
PromptBreak: Bug Sweepers turns the awkward pauses created by generative-AI tasks into short, intentional play sessions. Instead of opening an endless feed or starting another task, players choose an original Patchling, enter a software-themed mission, and clear a compact wave of bugs while their AI work continues.

The game runs directly in a desktop or mobile browser. Movement uses a keyboard or virtual joystick, attacks fire automatically, and each level presents a meaningful upgrade choice. A mission escalates through a bug outbreak and two boss encounters, while PATCH PARADE brings all nine unlockable Patchlings on screen for a coordinated signature attack. Twenty software-themed stages, a harder second run, fourteen upgrades, destructible props, local progression, procedural audio, and Japanese/English UI make the project feel like a complete game rather than a one-scene prototype.

PromptBreak was built through an iterative Codex collaboration using GPT-5.6. Human direction defined the problem, product concept, visual quality bar, character identities, stage themes, and release priorities. Codex helped turn those decisions into a working Three.js game, integrate directional character sprites, refine combat and progression, implement responsive controls and UI, review security, and repeatedly test and repair the production build.

This Build Week edition is a standalone, meaningfully extended version of an earlier prototype. The work completed during the event includes the PromptBreak product framing, independent identity, nine original Patchlings and their signature techniques, bilingual experience, twenty-stage progression, richer combat and boss structure, mobile UX improvements, release documentation, security hardening, and demo materials. The repository history and Codex session record document this work.

The current submission is deliberately local-first: no account, API key, analytics, or remote leaderboard is required to play. Progress stays in the browser. A future desktop companion could listen for an AI-task completion signal and offer to pause the run, but that integration is not claimed as part of the submitted build.
```

## 2. Problem statement

### Paste-ready version

```text
Generative AI saves time overall, but each run creates a small waiting pocket. That pause is usually too short for meaningful work and long enough to break concentration. People often fill it with an endless feed, context-switch to another task, or simply stare at a progress indicator.

PromptBreak treats the pause as a designed interval. A short mission has an obvious start, escalating middle, and clean stopping point. The player gets a compact sense of movement and progress without creating another open-ended distraction. The goal is not to make people wait longer; it is to make unavoidable waiting feel intentional and help them return to their AI-assisted task refreshed.
```

### One-sentence framing

```text
PromptBreak turns generative-AI waiting time from an awkward interruption into a bounded, satisfying play break.
```

## 3. How Codex and GPT-5.6 were used

### Paste-ready version

```text
Codex with GPT-5.6 was the implementation and iteration partner for PromptBreak. I supplied the product direction: solve the waiting-time problem with a short browser game; keep the experience bilingual and mobile-friendly; create an independent cast; and prioritize a polished, secure, runnable submission.

Working from those decisions, Codex helped inspect and restructure the codebase, implement and debug the Three.js game loop, integrate directional sprite atlases, create the nine-character skill system, expand progression to twenty stages, tune enemy and boss behavior, improve collision and mobile layouts, add local persistence, review external-link handling and security headers, and run lint, build, smoke, and browser checks.

The collaboration was iterative rather than one-shot. Visual playtest feedback became narrow engineering tasks, followed by code inspection and regression checks. Examples include making obstacles share consistent collision rules, gating boss progression, improving the readability of PATCH PARADE, repairing upgrade layouts on small screens, and separating the Build Week identity and original character assets from the earlier prototype.

GPT-5.6 and Codex were used to build the project; the submitted browser game itself does not call the OpenAI API at runtime. This keeps the demo free to test and avoids requiring judges to provide credentials.
```

### Evidence to point judges toward

- Dated Git commits from the Build Week submission period
- The primary `/feedback` Codex Session ID
- README sections on Codex collaboration, architecture, setup, privacy, and security
- The working demo and under-three-minute narrated video
- Focused test and security-check results recorded before submission

## 4. Judging self-evaluation

Scores below are candid internal estimates, not claims about the judges' outcome.

| Criterion | Self-score | Current strengths | Highest-value improvement before submission |
| --- | ---: | --- | --- |
| Technological Implementation | 8.0/10 | Non-trivial Three.js game loop; desktop and touch controls; enemy AI, bosses, upgrades, persistence, procedural audio, responsive UI; documented Codex iteration | Make the Build Week delta unmistakable with a concise before/after section, dated evidence, and the correct primary Codex Session ID. Show one concrete Codex-driven repair in the video. |
| Design | 8.5/10 | Coherent visual language; complete title-to-result loop; nine distinct characters; bilingual interface; mobile support; readable escalation and special attack | Complete hands-on QA at desktop and phone widths for title, play, upgrade, victory, and game-over screens. Capture a clean thumbnail and ensure the landscape demo never shows clipped UI. |
| Potential Impact | 7.0/10 | Specific, relatable AI-era problem; frictionless browser access; bounded alternative to open-ended feeds | The submitted build does not yet detect AI-task completion. Frame this honestly, demonstrate that a run is naturally short, and avoid claiming measured productivity or wellbeing outcomes without user research. |
| Quality of the Idea | 8.5/10 | Turns AI latency into a playful product surface; software-building metaphor supports the gameplay; PATCH PARADE is memorable | Open the video with the problem-to-solution contrast in the first 10 seconds. Emphasize the intentional stopping point, which differentiates PromptBreak from a generic survivor-style game. |

### Stage-one viability risk

The biggest pass/fail communication risk is that the game does not use an OpenAI API at runtime. The submission must clearly show that it was built with Codex using GPT-5.6, as the challenge requires, and provide the primary Codex Session ID. Do not imply a runtime GPT-5.6 integration that does not exist.

## 5. Required deliverables and gap list

### Ready or substantially ready

- [x] Working standalone browser project
- [x] English title, short description, and long description
- [x] Recommended track selected: Apps for your life
- [x] English README with setup instructions and Codex collaboration explanation
- [x] Dated Git history within the submission period
- [x] Under-three-minute narration script
- [x] English subtitle files
- [x] Landscape demo-video file prepared locally
- [x] Source-code MIT license and separate asset notice
- [x] No runtime account, API key, analytics, or paid service needed for judges

### Must be completed or confirmed before final submission

- [ ] Confirm entrant eligibility and choose individual/team/organization representation
- [ ] Obtain and paste the **primary `/feedback` Codex Session ID**
- [ ] Add a concise README section distinguishing the earlier prototype from the Build Week additions
- [ ] Confirm the final landscape video is under 3:00, has audible English narration, shows the working game, and explains both Codex and GPT-5.6
- [ ] Check the final video frame by frame for third-party trademarks, copyrighted music, personal information, local paths, notifications, and unrelated browser tabs
- [ ] Upload the final video to YouTube as **Public** and paste its URL
- [ ] Decide repository access: public with appropriate licensing, or private and shared with both judging email addresses
- [ ] Paste the repository URL
- [ ] Confirm the deployed demo is accessible without login and paste its URL, or provide a test build and exact instructions
- [ ] Verify asset ownership and redistribution rights are compatible with the chosen repository visibility
- [ ] Run and record lint, tests, production build, dependency audit, secret scan, and Git-diff review
- [ ] Visually test desktop and phone widths: title, gameplay, upgrade, victory, and game-over
- [ ] Recheck the live Official Rules immediately before submission in case they were amended
- [ ] Review Devpost's entrant agreements, publicity terms, and final submission preview
- [ ] Obtain explicit user approval before YouTube upload, repository publication/sharing, hosting visibility changes, agreement acceptance, or final submission

### Blocking placeholders

```text
LIVE DEMO URL: https://promptbreak-bug-sweepers.k-fuji.chatgpt.site
REPOSITORY URL: https://github.com/fujirecords/promptbreak-bug-sweepers
PUBLIC YOUTUBE URL: [ADD AFTER APPROVAL]
PRIMARY CODEX /feedback SESSION ID: 019f7b07-3aa7-7f33-86c8-fdbcf26ff4b5
ENTRANT / TEAM NAME: [ADD]
```

## 6. YouTube copy

### Title

```text
PromptBreak: Bug Sweepers — OpenAI Build Week Demo
```

### Description

```text
PromptBreak: Bug Sweepers is a bilingual browser action game that turns generative-AI waiting time into a quick, focused debugging break.

Choose an original Patchling, clear software-themed bug outbreaks, build a stack of upgrades, defeat two bosses, and deploy PATCH PARADE with all nine characters. The game supports desktop and touch controls, Japanese and English UI, twenty stages, local progression, and a harder second run.

I built this Build Week edition through an iterative Codex collaboration using GPT-5.6. Human direction defined the problem, product decisions, character identities, and quality bar; Codex helped implement, inspect, test, and repair the Three.js game, responsive UI, combat systems, original character integration, and security controls.

Try the demo: https://promptbreak-bug-sweepers.k-fuji.chatgpt.site
Source / judging repository: https://github.com/fujirecords/promptbreak-bug-sweepers

Built for OpenAI Build Week 2026.
```

### Suggested thumbnail text

```text
AI WORKS.
YOU PLAY.
```

## 7. Devpost paste-ready final copy

### Project name

```text
PromptBreak: Bug Sweepers
```

### Tagline / short description

```text
A bilingual browser action game that turns generative-AI waiting time into a focused, satisfying debugging break.
```

### Track

```text
Apps for your life
```

### Inspiration

```text
Generative AI saves time overall, but each run creates a small waiting pocket. That pause is too short for meaningful work and long enough to break concentration. People often fill it with an endless feed or an unhelpful context switch. I wanted to give that unavoidable pause a clear beginning and end: a compact play session that feels satisfying and then lets you return to the AI-assisted task.
```

### What it does

```text
PromptBreak is a bilingual 2.5D browser action game for desktop and mobile. Players choose one of nine original Patchlings, enter a software-themed mission, move while attacks fire automatically, and select upgrades as the run escalates through a bug outbreak and two bosses.

The current build includes twenty stages, a harder second run, fourteen combat and support upgrades, ten enemy types, boss telegraphs, destructible props, pickups, procedural audio, pause support, local rankings, and Japanese/English UI. Its signature move, PATCH PARADE, brings all nine Patchlings on screen to perform their individual techniques together.

The game is local-first: it needs no account, API key, analytics, or remote leaderboard. Progress remains in the browser. A future desktop companion could listen for AI-task completion and offer to pause a run, but that integration is not part of the submitted build.
```

### How we built it

```text
The project uses React, TypeScript, Three.js, and a Cloudflare-compatible Vite deployment. The main game loop, rendering, enemy AI, combat, progression, audio, persistence, and UI live in a tightly integrated browser experience, with responsive CSS for desktop and touch controls.

Codex with GPT-5.6 was my implementation and iteration partner. I provided the problem definition, game concept, visual direction, character-to-skill mapping, stage themes, and release priorities. Codex helped inspect and restructure the project, implement and debug gameplay systems, integrate directional sprite atlases, refine boss and upgrade behavior, improve mobile layouts, review security, and run regression checks.

The workflow was iterative: I playtested, supplied visual and behavioral feedback, and used Codex to translate each finding into a focused code change and verification step. The submitted game itself does not call the OpenAI API at runtime; GPT-5.6 and Codex were used to build it.
```

### Meaningful Build Week extension

```text
PromptBreak is a standalone, meaningfully extended Build Week edition of an earlier prototype. Work completed during the submission period includes the new waiting-time product framing, independent PromptBreak identity, nine original Patchlings and signature techniques, bilingual experience, twenty-stage progression, expanded combat and boss structure, mobile UX improvements, release documentation, security hardening, and demo materials. Dated commits and the primary Codex session record distinguish this work from the earlier prototype.
```

### Challenges we ran into

```text
The hardest challenge was making a content-rich action game remain readable on both a wide desktop display and a small touch screen. Combat information, upgrade choices, boss timing, movement controls, and the special-action button all compete for limited space. Another challenge was replacing the earlier identity with a coherent original cast while preserving directional animation and giving every character a recognizable gameplay role.

We addressed these problems through repeated playtest-and-repair loops: shared collision rules, more legible boss progression, compact mobile layouts, distinct silhouettes, directional atlases, and signature effects that remain readable during PATCH PARADE.
```

### Accomplishments that we're proud of

```text
The result feels like a complete, replayable product instead of a technical scene. Nine distinct Patchlings can appear together without losing their identities, the twenty-stage progression supports both short sessions and longer mastery, and the same build works with keyboard or touch controls. I am also proud that the project stays frictionless for judges and players: no login, credentials, remote tracking, or paid API access is needed.
```

### What we learned

```text
The most useful lesson was that AI-assisted development works best as a tight feedback loop, not a single large prompt. Product judgment and visual playtesting stayed human-led, while Codex made it fast to inspect a large interaction surface, implement a narrow change, and check for regressions. I also learned that a good waiting-time experience needs a designed stopping point; adding more content is less important than making it easy to return to the original task.
```

### What's next for PromptBreak

```text
The next step is an optional desktop companion that can receive an AI-task completion signal and offer to pause the current run without abruptly ending it. I would also test whether different mission lengths match real AI workflows, improve accessibility options, and conduct user research before making any claim about focus or wellbeing benefits.
```

### Built with

```text
Codex, GPT-5.6, TypeScript, React, Three.js, Vite, Cloudflare Workers
```

### Links and IDs

```text
Demo: https://promptbreak-bug-sweepers.k-fuji.chatgpt.site
Repository: https://github.com/fujirecords/promptbreak-bug-sweepers
Video: [PUBLIC YOUTUBE URL]
Primary Codex /feedback Session ID: 019f7b07-3aa7-7f33-86c8-fdbcf26ff4b5
```

### Testing instructions

```text
Open the demo in a current desktop or mobile browser. No account or credentials are required. Choose English or Japanese, select an unlocked Patchling and stage, then press START BREAK. On desktop, move with WASD or the arrow keys and press Space for PATCH PARADE; attacks are automatic. On mobile, use the virtual joystick and action button. Select one upgrade whenever the PATCH SELECT screen appears. Progress is stored only in local browser storage.
```

## Final pre-submit stop

Do not accept rules, change repository visibility, change hosting visibility, upload the video, share a private repository, or click the final Devpost submission button until the user has reviewed the exact URLs, Session ID, licensing choice, and final preview and has explicitly approved those actions.
