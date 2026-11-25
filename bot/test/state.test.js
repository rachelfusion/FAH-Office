import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memberState, botState } from '../src/state.js';
import { sign, verify } from '../src/token.js';

const CH = '123';

test('people outside the channel are asleep', () => {
  assert.equal(memberState(undefined, CH), 'offline');
  assert.equal(memberState({ channelId: null }, CH), 'offline');
  assert.equal(memberState({ channelId: '999' }, CH), 'offline');
});

test('people in the channel are working, deafened ones are afk', () => {
  assert.equal(memberState({ channelId: CH, selfDeaf: false, serverDeaf: false }, CH), 'working');
  assert.equal(memberState({ channelId: CH, selfDeaf: true, serverDeaf: false }, CH), 'afk');
  assert.equal(memberState({ channelId: CH, selfDeaf: false, serverDeaf: true }, CH), 'afk');
});

test('music bots are on only inside the channel', () => {
  assert.equal(botState({ channelId: CH }, CH), 'on');
  assert.equal(botState({ channelId: '999' }, CH), 'off');
  assert.equal(botState(undefined, CH), 'off');
});

test('tokens verify with the right secret and expire', () => {
  const t = sign({ uid: '42', exp: Date.now() + 60_000 }, 's3cret');
  assert.equal(verify(t, 's3cret').uid, '42');
  assert.equal(verify(t, 'wrong'), null);
  assert.equal(verify(t + 'x', 's3cret'), null);
  assert.equal(verify(sign({ uid: '42', exp: Date.now() - 1 }, 's3cret'), 's3cret'), null);
  assert.equal(verify('garbage', 's3cret'), null);
});
