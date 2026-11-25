import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardLines } from '../src/board.js';

test('board groups people by activity and lists bots', () => {
  const lines = boardLines({
    crew: [
      { name: 'os', state: 'working' }, { name: 'zkdl.xpd', state: 'working' },
      { name: 'zr', state: 'gaming' }, { name: 'Suspicious', state: 'offline' },
    ],
    bots: [{ name: 'Uzox', state: 'on' }],
  });
  assert.deepEqual(lines, [
    '💻 **Working**: os, zkdl.xpd',
    '🎮 **Gaming**: zr',
    '💤 **Asleep**: Suspicious',
    '🎛️ Uzox is on the decks',
  ]);
});

test('board escapes Discord formatting in names and handles nobody', () => {
  assert.deepEqual(boardLines({ crew: [{ name: '_zr_', state: 'meeting' }], bots: [{ name: 'Uzox', state: 'off' }] }),
    ['🤝 **In a meeting with Simon**: \\_zr\\_', '🔌 Uzox is charging']);
  assert.deepEqual(boardLines({ crew: [], bots: [] }), ['Nobody on the crew list yet.']);
});
