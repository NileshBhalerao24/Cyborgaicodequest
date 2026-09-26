// Teams, schools and locations of Glimmerhaven.

export const TEAMS = {
  wonderbolt: {
    id: 'wonderbolt', name: 'Wonderbolt', school: 'Brightspire Academy',
    colors: { main: '#1f86ff', accent: '#ffd23f', light: '#dff0ff', dark: '#0b3d91' },
    motto: 'Fly bright.',
    identity: 'Sky-blue and gold. Brightspire sits on a sunny hill of white towers, glass walkways and wind chimes. Wonderbolt is the team everyone photographs — and they know it.',
    home: 'brightspire',
  },
  shadowbolt: {
    id: 'shadowbolt', name: 'Shadow Bolt', school: 'Duskmere Institute',
    colors: { main: '#6c3bd1', accent: '#ff4fa3', light: '#efe5ff', dark: '#1e1235' },
    motto: 'Strike from the shadows.',
    identity: 'Violet, charcoal and neon pink. Duskmere is a lantern-lit castle-school on the edge of Lumen Lake, all towers, hidden staircases and glowing ivy. Shadow Bolt has something to prove.',
    home: 'duskmere',
  },
  neutral: { id: 'neutral', name: 'Glimmerhaven', school: 'Glimmerhaven', colors: { main: '#ff9f43', accent: '#2ecc71', light: '#fff3e0', dark: '#8e5100' } },
};

export const LOCATIONS = {
  brightspire: { name: 'Brightspire Academy', desc: 'White towers, gold trim, sunlit lawns.' },
  duskmere: { name: 'Duskmere Institute', desc: 'Lantern-lit towers by Lumen Lake.' },
  corridor: { name: 'School Corridor', desc: 'Lockers, trophy cases and too many posters.' },
  cafeteria: { name: 'Shared Cafeteria', desc: 'Where both schools eat. Loudly.' },
  commonroom: { name: 'Dorm Common Room', desc: 'Beanbags, fairy lights, strategy boards.' },
  town: { name: 'Glimmerhaven Square', desc: 'Fountain, cafés and the giant Games billboard.' },
  stadium: { name: 'Crossroads Stadium', desc: 'Home of the Friendship Games.' },
  track: { name: 'Stadium Track', desc: 'Eight lanes of pure drama.' },
  skatepark: { name: 'Glimmer Skatepark', desc: 'Ramps, rails and bowls by the river.' },
  mountain: { name: 'Skyridge Cliffs', desc: 'Sheer climbing walls above the valley.' },
  forest: { name: 'Whisperwood', desc: 'Old trees, glowing moths, winding trails.' },
  river: { name: 'Silverrun River', desc: 'Fast water, stepping stones, rope crossings.' },
  pool: { name: 'Lumen Aquatics Center', desc: 'Olympic pool under a glass dome.' },
  lake: { name: 'Lumen Lake', desc: 'Floating platforms and dock races.' },
  archery: { name: 'Archery Meadow', desc: 'Targets, wind flags and one very nervous goose.' },
  gorge: { name: 'Echo Gorge', desc: 'Rope bridges and ziplines over a misty drop.' },
};
