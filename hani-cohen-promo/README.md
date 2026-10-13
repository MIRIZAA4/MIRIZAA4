# חני כהן – "מהקליק ועד הבית"

סרטון פרסומת אנכי (1080×1920, 30fps, 49 שניות) בתלת־ממד, עם טיפוגרפיה קינטית, שרטוט טכני ומאצ' קאטים, ופסקול מקורי.

## מבנה
- `index.html` – הסצנה (Three.js). פתיחה בדפדפן מנגנת תצוגה מקדימה עם מוזיקה (רווח = עצירה, חצים = דילוג).
- `src/timeline.js` – כל התזמונים (100 BPM, ביט = 0.6 שנ').
- `src/copy.js` – כל הטקסטים שעל המסך, הטלפון וה־CTA (`BRAND`).
- `src/scenes/` – capture (עדשה, סיבוב, הולוגרמה), editing (ריטוש), album (טלפון + אלבום), print (דפוס, קופסה, מפה, דלת), home (פתיחת האלבום + CTA).
- `src/photos.js` – תמונות דמה. כדי להשתמש בתמונות אמיתיות: לשים קבצים ב־`photos/` ורשימה ב־`photos/manifest.json` (למשל `["01.jpg","02.jpg"]`). התמונה הראשונה היא תמונת ה"הירו".
- `tools/music.py` – הפסקול (סינתזה ב־numpy) → `out/music.wav`.
- `tools/render.mjs` + `tools/finish.sh` – רינדור פריים־אחר־פריים ב־Chromium וחיבור ל־MP4.

## הפקה
```
npm install
python3 tools/music.py out/music.wav
npx http-server -p 8777 -s -c-1 . &
node tools/render.mjs 3      # ~30-40 דקות
sh tools/finish.sh           # out/hani-cohen-promo.mp4
```
