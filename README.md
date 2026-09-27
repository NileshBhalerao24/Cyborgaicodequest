# Cyborg AI: Code Quest — Galaxy Mission

A kids' coding-education game built with **Expo (React Native) + TypeScript**. Cyborg the robot sits in a maze; the player writes tiny real code (`move()`, `turnRight()`, loops, conditionals, variables, functions, `while`-loops) and running it animates the robot through the maze toward a goal star.

## Project structure

```
game/
  levels.ts         LEVELS data for all 9 lessons (walls, gems, goal, hints, badges)
  interpreter.ts     Parser + executor: extractFunctions, parseProgram, simulate, evalCond
  predictDemos.ts    Predict→Run demo code/question/answer for each lesson
  freeBuild.ts       Free Build sandbox grid, chip set, "Try this!" suggestions
components/
  MazeView.tsx        SVG maze/robot/gems/goal renderer + trace animation + trail rendering
  CodeEditor.tsx      Code input + tap-to-insert command chips
  CodeBlock.tsx       Read-only styled code display (used by Predict)
  PredictAndRun.tsx   The Predict→Run step shown before each lesson's Modify screen
  SpeechBubble.tsx    Lesson title/instructions/reference chips
  LevelTrack.tsx      Row of level dots (+ Free Build tile) showing unlock state + stars
  BadgeShelf.tsx      Badge grid + unlock toast
  FeedbackBanner.tsx  Success/fail message + confetti + next-lesson/share buttons
  ConfettiBurst.tsx   Success celebration particles
  ShareCard.tsx       Purpose-built shareable image (lesson win / Free Build drawing)
  StarfieldBackground.tsx
hooks/
  useSound.ts       expo-audio sound effects (step, gem, crash, fail, success, badge)
  useProgress.ts    AsyncStorage-backed progress (stars, badges, sound setting)
  useShare.ts       Captures a ShareCard and hands it to the OS share sheet (or saves it)
screens/
  GameScreen.tsx      Composes lessons (Predict→Run→Modify→Win) into the main screen
  FreeBuildScreen.tsx The open sandbox after Lesson 9
App.tsx             Font loading, splash screen, safe area
```

The game logic in `game/` is a straight TypeScript port of the original web version's parser and executor — same grammar, same error messages, same level geometry. All 9 level hints are verified to reach the goal and collect every gem (see "Verifying level logic" below).

## The learning loop: Predict → Run → Modify → Win

Each of the 9 lessons now opens with a short **Predict → Run** step before the player ever sees a blank editor (per PRIMM — predicting and observing code before writing it):

1. **Predict** — a short, pre-written snippet (not the level's solution) runs against a small separate demo scenario. The player taps a one-tap multiple-choice guess ("What do you think happens?") — no penalty either way.
2. **Run** — that exact snippet animates against the demo scenario using the same `simulate()`/`execute()` engine as the real game, confirming or correcting the guess.
3. **Modify** — the existing gameplay, unchanged: blank editor, chips, the real level, Run button.
4. **Win** — the existing badge/gem/star celebration, unchanged, plus a "Share your win" button.

Predict → Run is shown once per level per app session (tracked in memory, not persisted) — reopening the app shows it again, but retrying a level after a crash or an incomplete run doesn't repeat it. This was a UI-latitude decision the original spec explicitly left open; the fixed content (demo code, demo scenario, question, correct answer) is unchanged from the spec and was independently re-verified against the real interpreter.

## Free Build

After Lesson 9, a Free Build tile unlocks on the level track (`🎨`): a 7×7 grid with no walls, no gems, no goal, and no fail state (Papert/Resnick's "wide walls" — an open-ended space with no single intended solution). The robot leaves a persistent, colored trail as it moves, and multiple runs layer on top of each other until "Clear canvas" resets the drawing (not the code). A blocked `move()` here is a silent no-op rather than a crash — `execute()`/`simulate()` take a `sandbox` flag for this; graded lessons 1-9 are untouched and still crash normally.

`atGoal()` / `while (!atGoal())` is deliberately left out of Free Build's chip set: there's no goal in a goal-less sandbox, so the construct doesn't mean anything there. (Typing it by hand still works and is still budget-protected against infinite loops, same as graded levels — it's just not offered as a chip.)

No leaderboards, scores, or player-vs-player comparison were added anywhere — badges/gems/stars remain the only reward mechanic, per the gamification research cited in the request.

## Sharing

`ShareCard` is a purpose-built, fixed-size component (not a screenshot of the live screen) rendered off-screen and captured with `react-native-view-shot`, then handed to `expo-sharing`'s share sheet (or saved to the camera roll via `expo-media-library` if sharing isn't available on the platform). It has two variants — a lesson win (badge + caption) and a Free Build drawing (trail snapshot + caption) — both using the same space-theme palette as the rest of the app.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with the **Expo Go** app (iOS/Android) for fast iteration, or press `a` / `i` in the terminal to open an Android emulator / iOS simulator if you have one set up.

## Verifying level logic

The interpreter has no UI dependencies, so it can be checked head­less:

```ts
import { LEVELS } from './game/levels';
import { parseProgram, simulate } from './game/interpreter';

for (const level of LEVELS) {
  const result = simulate(parseProgram(level.hint), level);
  console.log(level.title, result.success, result.allGems);
}
```

## Building for a device / app store

- **Development build:** `eas build --profile development`
- **Production build + submit:** `eas build --profile production` then `eas submit`

Publishing to the App Store requires an Apple Developer account (~$99/year); publishing to Google Play requires a Google Play Developer account (~$25 one-time). Neither is required for testing in Expo Go.

## Design decisions

A few implementation details weren't specified in the original request; sensible defaults were chosen and can be revisited:

- **Audio:** `expo-audio` (the current SDK's supported audio API) with 6 short synthesized WAV tones, instead of `expo-av` (deprecated) or bundling external sound files. The `expo-audio` config plugin is set up without microphone/recording permissions since the app only plays sound effects.
- **Sound copy:** the ported interpreter reuses the original web version's exact parser error strings, but the success/fail *banner* copy (not part of the pure-logic block) is new writing in the same friendly, never-harsh tone.
- **Progress persistence:** in addition to the specified `completed`/`badgesEarned`/`soundOn`, the last-played level is also remembered so the app resumes where you left off.
- **Icons/splash:** generated programmatically in the space theme (deep purple background, teal robot, gold antenna) since no source artwork existed in this repo; swap `assets/icon.png`, `assets/splash-icon.png`, and the `assets/android-icon-*.png` files for real artwork whenever it's ready.
- **⚠️ Sharing requires a dev build or EAS build — it will not work in plain Expo Go.** `react-native-view-shot` is a third-party native module that Expo Go's precompiled binary doesn't include (unlike `expo-sharing`/`expo-media-library`, which are official SDK modules and do work in Expo Go). Tapping "Share your win" or "Save & share" in Expo Go will fail; rebuild with `eas build --profile development` or `--profile preview` to test it for real. Everything else in the app (all 9 lessons, Predict/Run, Free Build drawing) works fine in plain Expo Go.
- **Media library permissions:** scoped to write-only (`requestPermissionsAsync(true)`) since the app only ever saves an image it generated, never reads or browses the photo library. The config plugin is set up to skip the read-permission strings and Android's granular read permissions entirely.
- **Free Build start position:** center of the grid (`{x:3, y:3}`, facing up) rather than a corner, since a corner start would immediately cut off half the drawing directions in an otherwise open sandbox. Not specified in the request.
- **"Spiral outward" suggestion:** shipped exactly as given in the spec (verified to parse and run without error), but worth flagging — the code (`repeat(4) { repeat(2) { move() } turnRight() }`) actually traces a closed square back to the start rather than an expanding spiral, since each of the 4 sides is the same length. Left as-is rather than silently rewritten, since the spec provided this code explicitly.

---

## Also in this repo: Friendship Games (web)

[`friendship-games/`](friendship-games/) is a separate, self-contained HTML/CSS/JS web app. It is an animated cartoon universe (Shadow Bolt vs Wonderbolt) with a dynamic tournament engine, scripted episodes, a character gallery, a video library and mini-games. It doesn't touch the Expo app. See [`friendship-games/README.md`](friendship-games/README.md) to run it.
