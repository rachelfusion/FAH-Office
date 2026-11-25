// Turns a Discord voice state into an office state.
//   not in the watched channel -> 'offline' (asleep in their bunk)
//   in the channel, deafened   -> 'afk'     (on the couch with a phone)
//   in the channel             -> 'working' (locked in at the big table)
export function memberState(voiceState, channelId) {
  if (!voiceState || voiceState.channelId !== channelId) return 'offline';
  return voiceState.selfDeaf || voiceState.serverDeaf ? 'afk' : 'working';
}

// Music bots are either in the call (at the decks) or not (charging on their dock).
export function botState(voiceState, channelId) {
  return voiceState && voiceState.channelId === channelId ? 'on' : 'off';
}
