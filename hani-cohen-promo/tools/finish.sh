#!/bin/sh
# concat rendered segments + mux the soundtrack -> out/hani-cohen-promo.mp4
set -e
cd "$(dirname "$0")/.."
ls out/seg/seg_*.mp4 | sed "s/^out\/seg\//file '/; s/$/'/" > out/seg/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/seg/list.txt -c copy out/video.mp4
ffmpeg -y -loglevel error -i out/video.mp4 -i out/music.wav -c:v copy -c:a aac -b:a 256k -ar 44100 -shortest -movflags +faststart out/hani-cohen-promo.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact out/hani-cohen-promo.mp4
