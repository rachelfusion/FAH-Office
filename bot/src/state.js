// Turns a Discord voice state into an office state.
//   not in the watched channel -> 'offline' (asleep in their bunk)
//   in the channel, deafened   -> 'meeting' (in the meeting room with Simon)
//   in the channel             -> 'working' (locked in at the big table)
export function memberState(voiceState, channelId) {
  if (!voiceState || voiceState.channelId !== channelId) return 'offline';
  return voiceState.selfDeaf || voiceState.serverDeaf ? 'meeting' : 'working';
}

// Music bots are either in the call (at the decks) or not (charging on their dock).
export function botState(voiceState, channelId) {
  return voiceState && voiceState.channelId === channelId ? 'on' : 'off';
}
