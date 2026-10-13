// Master timeline (seconds). 100 BPM -> one beat = 0.6s, one bar = 2.4s.
// tools/music.py uses the same numbers for its hits, keep both in sync.
export const BPM = 100;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const FPS = 30;

export const T = {
  start: 0,
  click: 3.6,          // shutter click #1, beat starts
  orbit: 4.8,          // camera orbits to the rear screen
  lcdPush: 8.4,        // push into the rear LCD
  holo: 9.6,           // DROP: photos burst out as a hologram
  features: [10.8, 11.7, 12.6, 13.5, 14.4], // every 1.5 beats
  hero: 16.0,          // hero photo flies to center
  edit: 16.8,          // match cut -> editing monitor
  upload: 22.2,
  select: 22.8,        // phone gallery, client picks favourites
  approve: 26.4,
  album: 27.6,         // album layout
  albumClose: 30.6,
  sendApproval: 31.9,
  print: 33.6,         // printing press
  stamp: 35.4,
  box: 36.6,
  deliver: 38.4,       // map + route home
  door: 40.2,
  home: 41.4,          // album opens at home (emotional break)
  cta: 43.2,           // match cut sun -> lens, logo + call to action
  finalClick: 47.4,
  end: 49.2,
};

export const DURATION = T.end;
