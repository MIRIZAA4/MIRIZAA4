import { T } from './timeline.js';

// All on-screen words. y = baseline in the 1080x1920 frame.
// Reels/TikTok UI covers roughly the top 200px and the bottom 350px.
export const BRAND = {
  name: 'חני כהן',
  sub: 'צילום · עריכה · אלבומים',
  cta: 'שריינו תאריך עכשיו',
  phone: '050-000-0000',
  handle: '@hani.cohen.photo',
};

const HEAD = { font: 'serif', weight: 700, color: 'gold' };
const SUB = { font: 'serif', weight: 500, color: 'blush' };

export const COPY = [
  // 01 hook
  { ...HEAD, text: 'רגע אחד.', t0: 0.45, t1: 3.3, y: 400, size: 132, style: 'rise', stagger: 0.07 },
  { ...HEAD, text: 'קליק.', t0: T.click, t1: 4.75, y: 420, size: 210, style: 'punch', shine: true, shineAt: 3.75 },

  // 02 orbit
  { kind: 'chapter', num: '01', text: 'צילום', step: 1, t0: 4.9, t1: 16.6 },
  { ...SUB, text: 'כל קליק', t0: 5.0, t1: 8.15, y: 330, size: 104, style: 'rise' },
  { ...SUB, text: 'הוא זיכרון', t0: 5.8, t1: 8.2, y: 455, size: 104, style: 'rise' },
  { ...HEAD, text: 'לכל החיים', t0: 6.7, t1: 8.25, y: 615, size: 150, style: 'track', shine: true, shineAt: 7.4 },

  // 03 hologram categories (over the popped card)
  { ...HEAD, color: 'white', text: 'כלות', t0: T.features[0] + 0.06, t1: T.features[0] + 0.8, y: 1380, size: 150, style: 'punch', exit: 0.15 },
  { ...HEAD, color: 'white', text: 'הריון', t0: T.features[1] + 0.06, t1: T.features[1] + 0.8, y: 1380, size: 150, style: 'punch', exit: 0.15 },
  { ...HEAD, color: 'white', text: 'ניו בורן', t0: T.features[2] + 0.06, t1: T.features[2] + 0.8, y: 1380, size: 150, style: 'punch', exit: 0.15 },
  { ...HEAD, color: 'white', text: 'משפחה', t0: T.features[3] + 0.06, t1: T.features[3] + 0.8, y: 1380, size: 150, style: 'punch', exit: 0.15 },
  { ...HEAD, color: 'white', text: 'בת מצווה', t0: T.features[4] + 0.06, t1: T.features[4] + 0.8, y: 1380, size: 150, style: 'punch', exit: 0.15 },

  // 04 editing
  { kind: 'chapter', num: '02', text: 'עריכה וריטוש', step: 2, t0: 17.0, t1: 22.2 },
  { ...HEAD, text: 'עריכה.', t0: 17.4, t1: 21.9, y: 390, size: 112, style: 'rise' },
  { ...HEAD, text: 'ריטוש.', t0: 18.4, t1: 21.95, y: 520, size: 112, style: 'rise' },
  { ...SUB, text: 'דיוק בכל פיקסל.', t0: 19.6, t1: 22.0, y: 650, size: 92, style: 'rise', stagger: 0.035 },

  // 05 select
  { kind: 'chapter', num: '03', text: 'בחירה', step: 3, t0: 23.3, t1: 27.4 },
  { ...HEAD, text: 'את בוחרת.', t0: 24.2, t1: 27.3, y: 380, size: 132, style: 'rise' },
  { ...SUB, text: 'רק את מה שאת אוהבת', t0: 24.9, t1: 27.3, y: 500, size: 62, style: 'rise', stagger: 0.03 },

  // 06 album
  { kind: 'chapter', num: '04', text: 'עיצוב אלבום', step: 4, t0: 27.8, t1: 33.4 },
  { ...HEAD, text: 'עיצוב אלבום אישי', t0: 28.2, t1: 30.6, y: 380, size: 104, style: 'rise', stagger: 0.035 },
  { ...SUB, text: 'כל עמוד – בעבודת יד', t0: 28.9, t1: 30.6, y: 495, size: 60, style: 'rise', stagger: 0.03 },
  { ...HEAD, text: 'נשלח לאישורך', t0: T.sendApproval, t1: 33.45, y: 380, size: 110, style: 'rise', stagger: 0.04 },

  // 07 print
  { kind: 'chapter', num: '05', text: 'דפוס', step: 5, t0: 33.8, t1: 38.2 },
  { ...HEAD, text: 'דפוס יוקרתי.', t0: 34.1, t1: 36.5, y: 380, size: 120, style: 'punch', shine: true, shineAt: 34.6 },
  { ...SUB, text: 'נייר ארכיוני · הטבעת זהב', t0: 34.6, t1: 36.5, y: 495, size: 56, style: 'rise', stagger: 0.025 },
  { ...HEAD, text: 'נארז באהבה', t0: 37.0, t1: 38.35, y: 380, size: 116, style: 'rise' },

  // 08 delivery
  { kind: 'chapter', num: '06', text: 'עד הבית', step: 6, t0: 38.6, t1: 43.0 },
  { ...HEAD, text: 'ועד הבית', t0: 39.0, t1: 41.2, y: 400, size: 130, style: 'rise' },
  { ...HEAD, text: 'שלך.', t0: 41.75, t1: 43.15, y: 420, size: 220, style: 'track', shine: true, shineAt: 42.2 },

  // 09 call to action
  { ...SUB, color: 'white', text: 'הרגעים שלך ראויים', t0: 43.75, t1: 45.45, y: 1080, size: 86, style: 'rise', stagger: 0.035 },
  { ...SUB, color: 'white', text: 'ליותר מתיקייה בטלפון.', t0: 44.25, t1: 45.5, y: 1195, size: 86, style: 'rise', stagger: 0.035 },
  { ...HEAD, text: BRAND.name, t0: 45.5, t1: 99, y: 1110, size: 178, style: 'track', shine: true, shineAt: 46.3 },
  { font: 'sans', weight: 300, color: 'blush', text: BRAND.sub, t0: 45.9, t1: 99, y: 1200, size: 40, style: 'rise', letter: 6, stagger: 0.02 },
  { kind: 'line', t0: 46.0, t1: 99, y: 1250, w: 560, dur: 0.9 },
  { kind: 'pill', text: BRAND.cta, t0: 46.4, t1: 99, y: 1370, w: 700, h: 120 },
  { font: 'sans', weight: 400, color: 'blush', text: `${BRAND.phone}   |   ${BRAND.handle}`, dir: 'ltr', t0: 46.9, t1: 99, y: 1510, size: 40, style: 'fade' },
];

export const FX = {
  flashes: [
    { t: T.click + 0.03, dur: 0.32, amp: 0.5, color: '#fff2f4' },
    { t: T.holo, dur: 0.5, amp: 0.55, color: '#ffd6e1' },
    { t: T.edit, dur: 0.25, amp: 0.35, color: '#fff4ea' },
    { t: T.print, pre: 0.12, dur: 0.35, amp: 0.6, color: '#fff2e0' },
    { t: T.stamp + 0.6, dur: 0.3, amp: 0.35, color: '#fff2d6' },
    { t: T.home, pre: 0.35, dur: 0.6, amp: 1.0, color: '#fff6ef' },
    { t: T.cta, pre: 0.25, dur: 0.6, amp: 0.95, color: '#fff6ef' },
    { t: T.finalClick, dur: 0.4, amp: 0.6, color: '#fff2f4' },
  ],
};
