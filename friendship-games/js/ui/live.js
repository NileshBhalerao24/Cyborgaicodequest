// Friendship Games LIVE — the persistent, dynamic tournament and its watch page.
//
// The tournament state lives in progress (localStorage). Results are computed one round at a
// time as the viewer reaches them; `watchedRound` keeps spoilers out of the UI for rounds the
// viewer hasn't actually watched yet.

import { createTournament, advance, summary } from '../engine/tournament.js';
import { openingScene, roundScenes, closingScene } from '../engine/eventScenes.js';
import { eventById } from '../data/events.js';
import { byId, MAJOR, pairKey } from '../data/characters.js';
import { TEAMS } from '../data/world.js';
import * as progress from '../engine/progress.js';
import { el, newSeed } from '../util.js';
import { mountPlayer, reflection } from './cartoons.js';
import { portrait, toast } from './common.js';

export function currentTournament(create = true) {
  const p = progress.get();
  if (!p.tournament && create) {
    const t = createTournament({ seed: newSeed(), arcStage: progress.arcStage(), relDelta: p.relDelta });
    t.watchedRound = 0;
    t.openingSeen = false;
    t.jealousy = 0;
    progress.saveTournament(t);
  }
  return progress.get().tournament;
}

export function liveStatus() {
  const t = currentTournament(false);
  if (!t) return 'A new tournament is ready to begin.';
  const w = t.watchedRound || 0;
  if (w === 0) return `Tournament ready · ${t.length} events · first event already on the wheel.`;
  const r = t.eventHistory[w - 1];
  return `After ${w} of ${t.length} events: Wonderbolt ${r.scoresAfter.wonderbolt} – ${r.scoresAfter.shadowbolt} Shadow Bolt.`;
}

// Build the dynamic "episode" whose scenes are generated round by round.
function liveEpisode(t, onRoundWatched, onFinished) {
  const ep = {
    id: 'live', title: 'Friendship Games LIVE', kind: 'Live Tournament', titleCard: true, series: 'Shadow Bolt vs Wonderbolt',
    scenes: [],
    more: async () => {
      if (!t.openingSeen) { t.openingSeen = true; progress.saveTournament(t); return tag([openingScene(t)], { type: 'opening' }); }
      const w = t.watchedRound || 0;
      if (w < t.eventHistory.length) { const r = t.eventHistory[w]; return tag(roundScenes(t, r, t.jealousy || 0), { type: 'round', round: w, result: r }); }
      if (!t.finished) {
        const r = advance(t);
        progress.saveTournament(t);
        return tag(roundScenes(t, r, t.jealousy || 0), { type: 'round', round: r.round, result: r });
      }
      if (!t.closingSeen) { t.closingSeen = true; return tag([closingScene(t)], { type: 'closing' }); }
      return null;
    },
  };
  function tag(scenes, meta) { scenes.forEach((s, i) => { s.meta = { ...meta, last: i === scenes.length - 1, idx: i }; }); return scenes; }
  ep.onScene = (i, scene) => {
    const m = scene.meta || {};
    if (m.type === 'round' && m.idx === 2 && (t.watchedRound || 0) <= m.round) {
      t.watchedRound = m.round + 1;
      if (m.result.jealousyBeat) t.jealousy = (t.jealousy || 0) + 1;
      progress.saveTournament(t);
      progress.recordEventWatched(m.result);
      const notable = m.result.upset || m.result.photoFinish || m.result.incidents.some((x) => (x.type === 'slip' && x.crossTeam) || (x.type === 'sabotage' && x.caught) || x.type === 'clutch');
      if (notable) {
        const ev = eventById[m.result.event];
        const ids = [...m.result.participants.wonderbolt, ...m.result.participants.shadowbolt].slice(0, 2);
        progress.addHighlight({ seed: t.seed, round: m.round, arcStage: t.arcStage, event: ev.id, title: ev.name, desc: describe(m.result), chars: ids.map((id) => [id, 'run', 'determined']) });
      }
      onRoundWatched?.();
    }
    if (m.type === 'closing' && !t.summarized) {
      t.summarized = true;
      progress.finishTournament(summary(t));
      onFinished?.();
    }
  };
  return ep;
}

function describe(r) {
  const bits = [];
  const help = r.incidents.find((x) => x.type === 'slip' && x.crossTeam);
  if (help) bits.push(`${byId[help.helper].short} stopped to help ${byId[help.who].short}`);
  const sab = r.incidents.find((x) => x.type === 'sabotage');
  if (sab) bits.push(sab.caught ? `${byId[sab.who].short} got caught by Hale` : `${byId[sab.who].short} tried something sneaky`);
  const cl = r.incidents.find((x) => x.type === 'clutch');
  if (cl) bits.push(`${byId[cl.who].short} found another gear`);
  if (r.upset) bits.push('an upset');
  if (r.photoFinish) bits.push('a photo finish');
  return `${TEAMS[r.winner].name} won${bits.length ? ' — ' + bits.join(', ') : ''}.`;
}

export function liveView(root) {
  let t = currentTournament(true);
  let player = null;
  const main = el('div');
  const side = el('aside');
  root.append(
    el('div', { class: 'section-head' }, el('div', {}, el('span', { class: 'chip live' }, '● LIVE'), el('h1', { style: { marginTop: '8px' } }, 'Friendship Games LIVE')),
      el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
        el('button', { class: 'btn small ghost', onclick: () => newTournament() }, '↻ New tournament'))),
    el('div', { class: 'live-grid' }, main, side));

  const panels = el('div', { style: { marginTop: '18px' } });
  function mount() {
    player?.destroy();
    main.replaceChildren();
    const ep = liveEpisode(t, refresh, () => { refresh(); toast(`🏆 ${TEAMS[t.winner].name} win the Friendship Games!`); });
    player = mountPlayer(main, ep, {
      onScene: ep.onScene,
      onEnd: () => { if (t.finished) reflection({ id: 'live', title: 'Friendship Games LIVE', scenes: t.eventHistory.map((r) => ({ title: eventById[r.event].name })) }); },
    });
    main.append(panels);
    refresh();
  }
  function newTournament() {
    if (t && !t.finished && (t.watchedRound || 0) > 0 && !confirm('Start a new tournament? The current one will be abandoned.')) return;
    progress.saveTournament(null);
    t = currentTournament(true);
    mount();
  }

  function refresh() {
    const w = t.watchedRound || 0;
    const seen = t.eventHistory.slice(0, w);
    const last = seen[seen.length - 1];
    const sc = last ? last.scoresAfter : { wonderbolt: 0, shadowbolt: 0 };
    const finishedSeen = t.finished && w >= t.eventHistory.length;
    // Next event (only revealed once everything before it has been watched)
    const nextId = w < t.eventHistory.length ? t.eventHistory[w].event : t.nextEvent;
    const nextSel = w < t.eventHistory.length ? t.eventHistory[w].selection : t.nextSelection;
    side.replaceChildren(...[
      el('div', { class: 'scoreboard' },
        el('div', { class: 't wb' }, el('span', {}, '⚡ Wonderbolt'), el('span', { class: 'pts' }, sc.wonderbolt)),
        el('div', { class: 'mid' }, finishedSeen ? 'FINAL' : `EVENT ${Math.min(w + 1, t.length)}/${t.length}`),
        el('div', { class: 't sb' }, el('span', {}, 'Shadow Bolt ⚡'), el('span', { class: 'pts' }, sc.shadowbolt))),
      el('div', { class: 'panel', style: { marginTop: '16px' } },
        el('h3', {}, '📅 Event history'),
        el('div', { class: 'timeline' },
          seen.map((r) => el('div', { class: `tl-item ${r.winner}` }, el('div', { class: 'ic' }, eventById[r.event].icon), el('div', {}, el('div', { class: 'nm' }, eventById[r.event].name), el('div', { class: 'ds' }, describe(r))), el('div', { style: { fontWeight: 800 } }, `+${r.points}`))),
          !finishedSeen && nextId ? el('div', { class: 'tl-item next' }, el('div', { class: 'ic' }, eventById[nextId].icon), el('div', {}, el('div', { class: 'nm' }, `Next: ${eventById[nextId].name}`), el('div', { class: 'ds' }, (w + 1 >= t.length ? 'FINAL · double points · ' : '') + eventById[nextId].blurb))) : null,
          ...Array.from({ length: Math.max(0, t.length - w - 1) }, (_, i) => el('div', { class: 'tl-item pending' }, el('div', { class: 'ic' }, '❔'), el('div', {}, el('div', { class: 'nm' }, `Event ${w + i + 2}`), el('div', { class: 'ds' }, 'Decided by what happens next'))))),
        finishedSeen ? el('p', { style: { marginTop: '12px', fontWeight: 800 } }, `🏆 ${TEAMS[t.winner].name} are champions! MVP: ${byId[t.mvp]?.name || '—'}`) : null),
      nextSel && !finishedSeen ? el('details', { class: 'panel council' },
        el('summary', {}, '🎛️ Games Council data: why this event?'),
        el('p', { class: 'muted', style: { marginTop: '8px', fontSize: '14px' } }, whyText(nextSel)),
        el('div', { class: 'odds' }, nextSel.odds.map((o) => el('div', { class: 'o' }, el('span', {}, eventById[o.id].icon), el('div', {}, el('div', { style: { fontWeight: 700 } }, eventById[o.id].name), el('div', { class: 'track' }, el('i', { style: { width: `${Math.round(o.p * 100 * 2.5)}%` } }))), el('span', {}, `${Math.round(o.p * 100)}%`))))) : null,
    ].filter(Boolean));
    // Standings & relationships under the player
    const stats = {};
    for (const r of seen) {
      for (const id of [...r.participants.wonderbolt, ...r.participants.shadowbolt]) {
        const s = (stats[id] ||= { events: 0, wins: 0, firsts: 0, helps: 0, falls: 0, sneaky: 0, clutch: 0 });
        s.events++; if (byId[id].team === r.winner) s.wins++;
      }
      stats[r.order[0]].firsts++;
      for (const i of r.incidents) {
        if (i.type === 'slip') { stats[i.who] && stats[i.who].falls++; if (i.helper && stats[i.helper]) stats[i.helper].helps++; }
        if (i.type === 'sabotage' && stats[i.who]) stats[i.who].sneaky++;
        if (i.type === 'clutch' && stats[i.who]) stats[i.who].clutch++;
      }
    }
    const rows = Object.entries(stats).sort((a, b) => b[1].firsts - a[1].firsts || b[1].wins - a[1].wins);
    panels.replaceChildren(
      el('div', { class: 'two' },
        el('div', { class: 'panel' }, el('h3', {}, '📊 Athlete stats (this Games)'),
          rows.length ? el('table', { class: 'tbl' }, el('tr', {}, ['Athlete', 'Ev', 'W', '1st', '🤝', '⚡'].map((h) => el('th', {}, h))),
            rows.map(([id, s]) => el('tr', {}, el('td', {}, el('a', { href: `#/character/${id}`, style: { fontWeight: 800, color: byId[id].team === 'wonderbolt' ? '#8cc8ff' : '#d9b8ff' } }, byId[id].short)), el('td', {}, s.events), el('td', {}, s.wins), el('td', {}, s.firsts), el('td', {}, s.helps), el('td', {}, s.clutch)))) : el('p', { class: 'muted' }, 'Stats appear after the first event.')),
        el('div', { class: 'panel' }, el('h3', {}, '💞 Relationship shifts'), relShifts(t, seen.length))),
      el('div', { class: 'panel' }, el('h3', {}, '🗂️ Past tournaments'), pastList()),
    );
  }

  mount();
  return () => player?.destroy();
}

function whyText(sel) {
  const why = sel.why || [];
  const parts = [];
  if (why.includes('finale')) parts.push('It\'s the final round, so finale-class events are heavily favored.');
  if (why.includes('branch') && sel.prevWinner) parts.push(`${TEAMS[sel.prevWinner].name} won the last event, which opens this branch of the event graph.`);
  if (why.includes('flow')) parts.push('It flows naturally from the previous event.');
  if (why.includes('comeback')) parts.push(`The ${TEAMS[sel.trailing].name} deficit tilts the wheel toward events that suit them.`);
  if (why.includes('close')) parts.push('The score is close, so high-tension events get a boost.');
  if (why.includes('weather')) parts.push('Rain pushes events indoors.');
  if (why.includes('story')) parts.push('After a big sportsmanship moment, team events get a boost.');
  if (why.includes('streak')) parts.push('A winning streak nudges the wheel toward the other team\'s strengths.');
  if (!parts.length) parts.push('A pure spin of the wheel.');
  return parts.join(' ') + ' Top candidates this spin:';
}

function relShifts(t, watched) {
  if (!watched) return el('p', { class: 'muted' }, 'Rivalries and friendships shift as the Games unfold.');
  const out = Object.entries(t.relDelta).filter(([k, v]) => Math.abs(v) >= 4).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6);
  if (!out.length) return el('p', { class: 'muted' }, 'No big shifts yet.');
  return el('div', {}, out.map(([k, v]) => {
    const [a, b] = k.split('|');
    return el('div', { class: 'rel' }, el('img', { src: portrait(a, { w: 60, h: 60 }), alt: '' }), el('div', { style: { fontWeight: 800 } }, `${byId[a].short} & ${byId[b].short}`), el('span', { class: 'chip', style: { color: v > 0 ? '#8effc1' : '#ff9aa9' } }, v > 0 ? `▲ ${v}` : `▼ ${-v}`));
  }));
}

function pastList() {
  const list = progress.get().tournaments.slice().reverse();
  if (!list.length) return el('p', { class: 'muted' }, 'Finish a tournament and it shows up here — compare how differently each one unfolded.');
  return el('div', { class: 'timeline' }, list.slice(0, 8).map((s) => el('div', { class: `tl-item ${s.winner}` },
    el('div', { class: 'ic' }, '🏆'),
    el('div', {}, el('div', { class: 'nm' }, `${TEAMS[s.winner].name} ${s.scores.wonderbolt}–${s.scores.shadowbolt}${s.comeback ? ' · comeback!' : ''}`), el('div', { class: 'ds' }, s.sequence.map((x) => eventById[x.event].icon).join(' → ') + (s.mvp ? ` · MVP ${byId[s.mvp].short}` : ''))),
    el('div', {}))));
}

export { pairKey, MAJOR };
