import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memberState, botState, resolveActivity, voiceFacts } from '../src/state.js';
import { sign, verify } from '../src/token.js';

const CH = '123';

test('people outside the channel are asleep', () => {
  assert.equal(memberState(undefined, CH), 'offline');
  assert.equal(memberState({ channelId: null }, CH), 'offline');
  assert.equal(memberState({ channelId: '999' }, CH), 'offline');
});

test('people in the channel are working, deafened ones are in a meeting', () => {
  assert.equal(memberState({ channelId: CH, selfDeaf: false, serverDeaf: false }, CH), 'working');
  assert.equal(memberState({ channelId: CH, selfDeaf: true, serverDeaf: false }, CH), 'meeting');
  assert.equal(memberState({ channelId: CH, selfDeaf: false, serverDeaf: true }, CH), 'meeting');
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

test('activity picks: offline wins, deafen shortcut, manual override', () => {
  assert.equal(resolveActivity({ inChannel: false, pick: 'gaming' }), 'offline');
  assert.equal(resolveActivity({ inChannel: true }), 'working');
  assert.equal(resolveActivity({ inChannel: true, pick: 'eating' }), 'eating');
  assert.equal(resolveActivity({ inChannel: true, pick: 'nonsense' }), 'working');
  assert.equal(resolveActivity({ inChannel: true, deafened: true, pick: 'gaming' }), 'meeting');
  assert.equal(resolveActivity({ inChannel: true, deafened: true, pick: 'gaming', deafenMeeting: false }), 'gaming');
  assert.equal(resolveActivity({ inChannel: true, deafened: true, pick: 'phone', override: true }), 'phone');
});

test('voice facts only count deafened inside the channel', () => {
  assert.deepEqual(voiceFacts({ channelId: CH, selfDeaf: true }, CH), { inChannel: true, deafened: true });
  assert.deepEqual(voiceFacts({ channelId: '999', selfDeaf: true }, CH), { inChannel: false, deafened: false });
  assert.deepEqual(voiceFacts(undefined, CH), { inChannel: false, deafened: false });
});

test('outside activities are valid picks', () => {
  assert.equal(resolveActivity({ inChannel: true, pick: 'cafe' }), 'cafe');
  assert.equal(resolveActivity({ inChannel: true, pick: 'out' }), 'out');
});

test('outside activities still count when not in the call, indoor ones do not', () => {
  assert.equal(resolveActivity({ inChannel: false, pick: 'cafe' }), 'cafe');
  assert.equal(resolveActivity({ inChannel: false, pick: 'out' }), 'out');
  assert.equal(resolveActivity({ inChannel: false, pick: 'gaming' }), 'offline');
  assert.equal(resolveActivity({ inChannel: false, pick: null }), 'offline');
});

test('karaoke is an indoor pick', () => {
  assert.equal(resolveActivity({ inChannel: true, pick: 'karaoke' }), 'karaoke');
  assert.equal(resolveActivity({ inChannel: false, pick: 'karaoke' }), 'offline');
});
