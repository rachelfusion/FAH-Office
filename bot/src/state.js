// What each crew member is doing in the office.
//
// Discord decides whether you're here at all:
//   not in the watched voice channel -> 'offline' (asleep in your bunk)
// While you're in the call, you pick your activity in the app:
//   'working' (default) | 'cafe' | 'gaming' | 'meeting' | 'eating' | 'phone' | 'out'
// Deafening is a shortcut to 'meeting' (each person can switch that off).
// Picking something by hand while deafened wins until you deafen/undeafen again.
export const ACTIVITIES = ['working', 'cafe', 'gaming', 'meeting', 'eating', 'phone', 'out'];

export function resolveActivity({ inChannel, deafened = false, pick = null, deafenMeeting = true, override = false }) {
  if (!inChannel) return 'offline';
  if (deafened && deafenMeeting && !override) return 'meeting';
  return ACTIVITIES.includes(pick) ? pick : 'working';
}

export function voiceFacts(voiceState, channelId) {
  const inChannel = Boolean(voiceState) && voiceState.channelId === channelId;
  return { inChannel, deafened: inChannel && Boolean(voiceState.selfDeaf || voiceState.serverDeaf) };
}

// Kept for simple checks: Discord facts only, no picks.
export function memberState(voiceState, channelId) {
  return resolveActivity(voiceFacts(voiceState, channelId));
}

// Music bots are either in the call (at the decks) or not (charging on their dock).
export function botState(voiceState, channelId) {
  return voiceState && voiceState.channelId === channelId ? 'on' : 'off';
}
