# Cyborg AI: Code Quest — Galaxy Mission

A kids' coding-education game built with **Expo (React Native) + TypeScript**. Cyborg the robot sits in a maze; the player writes tiny real code (`move()`, `turnRight()`, loops, conditionals, variables, functions, `while`-loops) and running it animates the robot through the maze toward a goal star.

## Project structure

```
game/
  levels.ts        LEVELS data for all 9 lessons (walls, gems, goal, hints, badges)
  interpreter.ts    Parser + executor: extractFunctions, parseProgram, simulate, evalCond
components/
  MazeView.tsx        SVG maze/robot/gems/goal renderer + trace animation
  CodeEditor.tsx      Code input + tap-to-insert command chips
  SpeechBubble.tsx    Lesson title/instructions/reference chips
  LevelTrack.tsx      Row of level dots showing unlock state + stars
  BadgeShelf.tsx      Badge grid + unlock toast
  FeedbackBanner.tsx  Success/fail message + confetti + next-lesson button
  ConfettiBurst.tsx   Success celebration particles
  StarfieldBackground.tsx
hooks/
  useSound.ts       expo-audio sound effects (step, gem, crash, fail, success, badge)
  useProgress.ts    AsyncStorage-backed progress (stars, badges, sound setting)
screens/
  GameScreen.tsx    Composes everything into the main gameplay screen
App.tsx             Font loading, splash screen, safe area
```

The game logic in `game/` is a straight TypeScript port of the original web version's parser and executor — same grammar, same error messages, same level geometry. All 9 level hints are verified to reach the goal and collect every gem (see "Verifying level logic" below).

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

---

## Also in this repo: Friendship Games (web)

[`friendship-games/`](friendship-games/) is a separate, self-contained HTML/CSS/JS web app. It is an animated cartoon universe (Shadow Bolt vs Wonderbolt) with a dynamic tournament engine, scripted episodes, a character gallery, a video library and mini-games. It doesn't touch the Expo app. See [`friendship-games/README.md`](friendship-games/README.md) to run it.
