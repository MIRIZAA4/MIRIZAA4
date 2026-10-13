# חני כהן · צילום — סרטון מושן אנכי

סרטון 1080×1920 · 45 שניות · 30fps · מוזיקה מקורית 104 BPM.

- `out/hani-cohen-reel.mp4` — הסרטון הסופי (עם מוזיקה).
- `out/music.wav` — המוזיקה לבד.
- `index.html` — נגן חי (פותחים דרך שרת מקומי ולוחצים לניגון).
- `timeline.json` — לוח זמנים בפעימות + פרטי המותג (שם, טלפון, אינסטגרם, CTA).
- `src/` — האנימציה (Canvas): `core.js` עזרים וטיפוגרפיה, `photos.js` תמונות זמניות, `scenes.js` הסצנות.
- `tools/music.py` — סינתזה של המוזיקה. `tools/render.mjs` — רינדור פריים־פריים ל־MP4.

## החלפת תמונות אמיתיות
מניחים קבצים `photos/01.jpg` … `photos/11.jpg` (יחס 4:5 מומלץ) והם מחליפים אוטומטית את התמונות הזמניות.

## רינדור מחדש
```
python3 tools/music.py
node tools/render.mjs
ffmpeg -y -i out/video_silent.mp4 -i out/music.wav -map 0:v -map 1:a -c:v libx264 -crf 21 -pix_fmt yuv420p \
  -af loudnorm=I=-14:TP=-1.5 -c:a aac -b:a 256k -shortest -movflags +faststart out/hani-cohen-reel.mp4
```
