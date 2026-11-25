// Text for the live office board and the /office reply.
export const BOARD_FOOTER = 'office-bot live board · updates by itself';

const GROUPS = [
  ['working', '💻', 'Working'],
  ['gaming', '🎮', 'Gaming'],
  ['meeting', '🤝', 'In a meeting with Simon'],
  ['eating', '🍜', 'Eating ramen'],
  ['phone', '📱', 'Scrolling'],
  ['offline', '💤', 'Asleep'],
];

// Stop names like "_zr_" from turning into Discord formatting.
const clean = (name) => String(name).replace(/([*_`~|\\>])/g, '\\$1');

export function boardLines(snapshot) {
  const lines = [];
  for (const [state, icon, label] of GROUPS) {
    const names = snapshot.crew.filter((c) => c.state === state).map((c) => clean(c.name));
    if (names.length) lines.push(`${icon} **${label}**: ${names.join(', ')}`);
  }
  for (const b of snapshot.bots) {
    lines.push(b.state === 'on' ? `🎛️ ${clean(b.name)} is on the decks` : `🔌 ${clean(b.name)} is charging`);
  }
  if (!lines.length) lines.push('Nobody on the crew list yet.');
  return lines;
}
