// Which scan sheet each place on the page shows. Ids are referenced by the content (hear tiles, looks) and the wall.

// The wall: 24 live night sheets, 6×4 on a computer and 3×8 on a phone, in this order. The first row is the one the
// hero's bars frame, so it holds the most graphic plots.
export const WALL = [
  ['rays', 'Reach'], ['heat', 'Exposure'], ['radar', 'Sweep'], ['rings', 'Incidents'], ['disc', 'Blast radius'], ['spectrum', 'Spectrum'],
  ['polygraph', 'Audit'], ['lanes', 'Priority lanes'], ['path', 'Attack path'], ['ridge', 'Surface'], ['gauge', 'Gauges'], ['grid', 'Keys'],
  ['mesh', 'Trust mesh'], ['scope', 'Trace'], ['timeline', 'Timeline'], ['hatch', 'Shadow AI'], ['rays', 'Fountain'], ['heat', 'Posture'],
  ['radar', 'Decoys'], ['polygraph', 'Agents'], ['spectrum', 'Drift'], ['rings', 'Approvals'], ['grid', 'Ledger'], ['path', 'Identity map'],
].map(([style, title], i) => ({ id: `w${i}`, style, title, seed: 101 + i * 17, code: i + 1 }));

// The four wall cells that fly into the "what we find" sentence.
export const FLY = ['w1', 'w11', 'w10', 'w6'];

// The eleven printed views under the map.
export const PENS = [
  ['heat', 'Exposure', 'Every system painted by how exposed it is'],
  ['timeline', 'Timeline', 'Agent actions written row after row'],
  ['ridge', 'Surface', 'The attack surface, one layer per network'],
  ['disc', 'Blast radius', 'One spiral out from a single stolen login'],
  ['polygraph', 'Audit', 'Eight channels of agent activity on one chart'],
  ['hatch', 'Shadow AI', 'Tools nobody approved, mirrored against the ones you did'],
  ['rays', 'Reach', 'Everything one agent can touch, as rays'],
  ['lanes', 'Priority lanes', 'Seven lanes, from fix now to not enough data'],
  ['rings', 'Incidents', 'Every alert drops a ring on the timeline'],
  ['path', 'Attack path', 'Pins on the weak spots; one thread follows the attacker’s route'],
  ['mesh', 'Trust mesh', 'Six trust zones netted together; the riskiest drawn darkest'],
].map(([style, name, sub], i) => ({ id: style + i, style, name, sub, seed: 501 + i * 23, code: i + 1 }));

// The style of each signal in the list (by id); anything not named takes a style by position.
const ORDER = ['polygraph', 'spectrum', 'radar', 'rays', 'heat', 'scope', 'rings', 'gauge', 'lanes', 'ridge', 'path', 'grid', 'timeline', 'disc', 'mesh', 'hatch'];
export const lookStyle = (id, index) => {
  const named = { 'sheet-paint': 'heat', 'sheet-drum': 'timeline', 'sheet-ridge': 'ridge', 'sheet-disc': 'disc', 'sheet-polygraph': 'polygraph', 'sheet-hatch': 'hatch', 'sheet-corona': 'rays', 'sheet-gel': 'lanes', 'sheet-rings': 'rings', 'sheet-string': 'path', 'sheet-mesh': 'mesh', scope: 'scope', spectrum: 'spectrum', meters: 'gauge', sonar: 'ridge', polygraph: 'polygraph', key: 'grid', groove: 'rings', stars: 'path', lidar: 'ridge', fountain: 'rays', pegboard: 'grid', blot: 'grid', map: 'heat', blocks: 'hatch', specimen: 'polygraph' };
  return named[id] || ORDER[index % ORDER.length];
};
