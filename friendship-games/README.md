# Friendship Games — Shadow Bolt vs Wonderbolt

A children's animated-cartoon web experience: a Season 1 of scripted episodes, a **live Friendship Games tournament that plays out differently every time**, a character gallery that fills in as you explore, a video library, seven playable mini-games and progress tracking.

Plain HTML, CSS and modular JavaScript (ES modules). No build step, no dependencies.

> **Placeholder art.** Characters, backgrounds, animation and music are procedural (SVG puppets, parallax SVG sets, Web Audio synth). They are marked "Placeholder animation" in the player. The architecture is built so finished assets can replace them scene by scene (see [Swapping in real assets](#swapping-in-real-assets)).

## Run it

ES modules need to be served over HTTP (opening `index.html` from disk won't work):

```bash
cd friendship-games
python3 -m http.server 8080      # or: npx serve .
# open http://localhost:8080
```

Tests (Node 18+):

```bash
npm test
```

## What's inside

| Section | What it does |
|---|---|
| **Home** | Live ambient cartoon scene, the two teams, continue watching, quick links. |
| **Cartoons** | Season 1 (4 episodes + a short) and **Friendship Games LIVE**. Episodes are animated scenes with camera moves, speech bubbles, expressions, SFX and music. No narrator, and nobody talks to the audience. |
| **Friendship Games LIVE** | A persistent tournament. An opening ceremony, then for each round: the Lightning Wheel reveal → the event → the aftermath. The next event is chosen *after* each result. Closing ceremony with MVP. Different seed → different Games. |
| **Characters** | 37 characters (12 major, 25 supporting incl. coaches, students and magical creatures). Profiles unlock in three discovery levels: relationships, fears and arc at ★★, secrets at ★★★. Includes outfit variations, expression sheet, live relationship meters and a tournament career record. |
| **Videos** | Full episodes, a trailer, curated and *your own* tournament highlights, action scenes, funny moments, short clips, cast intros and behind-the-scenes rig reels. |
| **Friendship Games (play)** | Skating Sprint, Scooter Challenge, Archery Duel, Wall Climb, Freestyle Swim, Whisperwood Maze (new maze every run), Relay Rescue. Keyboard + touch. Athlete stats affect play; rivals come from the other team. |
| **My Progress** | Episodes, videos, games, stars, unlocked athletes, 15 achievements, tournament history, saved reflections. |

After an episode (and after a finished tournament) an **optional** "What did you think?" screen appears. It has feelings, favourite moment, "what would you have done?" and "what did you learn?". Everything is skippable and saved only on the device.

## Project structure

```
index.html              App shell (nav, main, bottom nav on mobile)
css/styles.css          Visual identity, player HUD, responsive layout
js/main.js              Hash router
js/util.js              Seeded RNG, easing, DOM helpers
js/data/
  characters.js         Character database, stats, base relationships
  world.js              Teams, schools, locations
  events.js             28 physical/adventure events and their graph links
  dialogue.js           Per-character line banks (distinct voices), announcer lines
  episodes.js           Scripted Season 1 (scene → beat data)
  videos.js             Video catalog: clips, intros, highlights, trailer, BTS
js/engine/
  tournament.js         Tournament engine: event selection, lineups, simulation, scoring
  eventScenes.js        Turns results into cartoon scenes (reveal, event, aftermath, ceremonies)
  progress.js           localStorage progress, discovery levels, unlocks, achievements
  audio.js              Synth music moods + SFX (placeholder)
js/render/
  art.js                Procedural SVG character puppets, faces, props, creatures
  backgrounds.js        Parallax SVG locations, courses, weather
  stage.js              The cartoon player
js/games/               Mini-game framework + 7 games
js/ui/                  Views: home, cartoons/watch/reflection, live, characters, videos, games, progress
tests/engine.test.mjs   Engine and scene-data tests
```

## How episodes work

An episode is data: `{ title, scenes: [ { location, time, weather, music, world, cast, beats } ] }`.
Beats are small instructions the Stage plays in order:

```js
{ say: 'rainbow', text: 'Easy.', f: 'determined', to: 'cherry' }   // speech bubble + expression
{ move: 'cherry', x: 3100, dur: 900, as: 'skate', then: 'celebrate' }
{ anim: 'pinkie', a: 'fall' }        { face: 'cena', f: 'smug' }       { turn: 'twilight', dir: 'rarity' }
{ cam: { on: ['sunset', 'cherry'], zoom: 1.5, dur: 800 } }           { cam: { followMax: [...ids], lead: 250 } }
{ par: [ ...beats ] }  { seq: [ ...beats ] }  { wait: 900 }  { sfx: 'cheer' }  { music: 'tense' }
{ fx: 'confetti' | 'splash' | 'dust' | 'sparkle' | 'arrow' | 'heart' | ... }
{ card: {...} } { lower: {...} } { score: {...} } { pa: 'milo', text } { wheel: { options, index } } { weather: 'rain' }
```

The puppet rig has about 45 animations (walk, run, skate, scooter, bike, swim, climb, kayak, balance, zipline, jump, fall, get up, cheer, celebrate, hug, reach, pull, archery and more) and 12 expressions. Scenes can start part-way through (`skip`), which is how the trailer is cut from episode scenes.

## The tournament engine

`js/engine/tournament.js` is pure logic with no DOM. Each round:

1. uses the already-revealed next event
2. picks lineups (stat fit, fatigue, reserve penalty, a random "redemption" chance)
3. simulates it segment by segment
4. decides the real winner and updates team scores (the final event is worth double; caught sabotage costs 5 points; a tie adds a tiebreaker)
5. updates individual stats and relationships
6. **selects and reveals the next event**

**Event selection** is a weighted walk over the event graph. Each candidate's weight combines:

- thematic `links` from the previous event
- **winner-dependent `branch` lists** (a Wonderbolt skating win opens different doors than a Shadow Bolt one)
- a variety penalty for repeating a category or venue
- comeback pressure (a big score gap favours events that suit the trailing team)
- a tension boost when the score is close
- finale-class events in the last round
- weather (rain pushes events indoors)
- story beats (a sportsmanship moment boosts team events)
- winning streaks
- seeded randomness

Events never repeat within a tournament. The "Games Council data" panel on the LIVE page shows why the wheel landed where it did.

**Anyone can win.** Performance comes from event-weighted stats, compressed so specialists don't always win. Added to that:

- noise that grows with risk-taking
- pressure (the nerve stat matters more late and in close games)
- rain, fatigue
- incidents: slips, cross-team helping, Shadow Bolt sabotage (which can be caught, backfire or be shrugged off), clutch surges for high-nerve and less-famous characters, risky shortcuts, equipment trouble, baton drops, wind

Across 2,000 simulated tournaments the split is roughly 45/55. Every sequence is unique, and every event has been won by both teams. The test suite checks all of this.

**Rivalry arc.** `progress.arcStage()` moves Shadow Bolt from *jealous* (0) to *obsessed* (1, more sabotage) to *questioning* (2), as the viewer watches episodes and finishes tournaments. The characters don't change together: Twilight's sabotage chance drops and she starts objecting, Cena and Nova always push back, Cherry stays intense and Ice Cream can show regret. Relationship changes from each tournament carry into the next.

## Swapping in real assets

- **Animation / video:** add `media: { video: 'assets/video/ep1-s3.mp4' }` to any scene in `episodes.js` (or a generated scene). The player shows the video for that scene instead of the procedural puppets. Progress tracking, scene markers, reflection and "up next" keep working. If a file is missing, the player skips to the next scene.
- **Characters:** `render/art.js → buildPuppet(ch)` returns `{ g, parts, setFace, setProp }`. Replace it with an illustrated rig that exposes the same parts (arms, legs, head, face) and the stage, thumbnails and portraits all use it.
- **Backgrounds:** `render/backgrounds.js → buildBackground(location)` returns parallax layers. Return painted artwork (for example `<image href>`) per layer instead.
- **Music / SFX:** `engine/audio.js` exposes `music(mood)` and `sfx(name)`. Map moods and names to audio files.

## Notes

- All progress is stored in `localStorage` on the viewer's device only. There is no network, accounts or tracking.
- Keyboard shortcuts in the player: Space plays and pauses, ← → skip scenes, CC toggles captions. Add `?debug` to the URL to expose `window.__stage` for testing.
- The eight team-member names come from the project brief. Before any public or commercial release, check them against existing trademarks: several match characters from an existing franchise. All designs, stories, dialogue, locations and music here are original, and names live in one file (`js/data/characters.js`), so they are easy to change.
