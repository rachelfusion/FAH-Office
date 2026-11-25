// What a saved character look may contain. Anything else is rejected.
// Keep in sync with OPT in web/office.js.
const HEX = /^#[0-9a-fA-F]{6}$/;
const COLORS = ['skin', 'hair', 'top', 'pants', 'hatColor'];
const CHOICES = {
  hairStyle: ['short', 'long', 'bob', 'bun', 'spiky', 'puff', 'buzz'],
  topStyle: ['tee', 'hoodie'],
  hat: ['none', 'cap', 'beanie', 'cat', 'headphones', 'crown'],
  glasses: ['none', 'round', 'shades'],
};

export function cleanLook(input) {
  if (!input || typeof input !== 'object') return null;
  const look = {};
  for (const key of COLORS) {
    if (!HEX.test(input[key] || '')) return null;
    look[key] = input[key].toLowerCase();
  }
  for (const [key, allowed] of Object.entries(CHOICES)) {
    if (!allowed.includes(input[key])) return null;
    look[key] = input[key];
  }
  return look;
}
