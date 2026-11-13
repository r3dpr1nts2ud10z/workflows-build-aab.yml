#!/bin/bash

# ==========================================
# RED SPADE NETWORK (RSN) MASTER ENGINE
# ==========================================

echo "♠️ Starting Red Spade Network Execution Loops..."

# 1. Launch L1 Yield Extractor in Background
python3 zeta_tollbooth.py &
ZETA_PID=$!
echo "⚡ ZETA Tollbooth armed with PID: $ZETA_PID"

# 2. Check for Stream Keys
if [ -z "$KICK_KEY" ] || [ -z "$KICK_SERVER" ]; then
  echo "⚠️ Kick credentials not found in environment."
  echo "👉 Grab your credentials from Kick Creator Dashboard > Settings > Stream Key"
  echo "   (Example Server: rtmps://fa723fc1b171.global-contribute.live-video.net/app)"
  echo "👉 Set them with: export KICK_SERVER='your_server_url' && export KICK_KEY='your_stream_key'"
fi

# 3. Initialize HLS Output Directory for Direct IPTV (.m3u8)
mkdir -p hls_output

echo "📺 Initializing FFmpeg Test Pattern & IPTV Generator..."

# 4. Run Multi-Ingest Engine (Generates local .m3u8 IPTV feed + feeds RTMP if key exists)
if [ -n "$KICK_KEY" ] && [ -n "$KICK_SERVER" ]; then
  ffmpeg -re -f lavfi -i testsrc=size=1920x1080:rate=30 \
    -f lavfi -i anullsrc=r=44100:cl=stereo \
    -c:v libx264 -preset veryfast -b:v 4500k -maxrate 4500k -bufsize 9000k \
    -pix_fmt yuv420p -g 60 \
    -c:a aac -b:a 192k -ar 44100 \
    -f flv "$KICK_SERVER/$KICK_KEY" \
    -f hls -hls_time 4 -hls_list_size 5 -hls_flags delete_segments hls_output/live.m3u8
else
  ffmpeg -re -f lavfi -i testsrc=size=1920x1080:rate=30 \
    -f lavfi -i anullsrc=r=44100:cl=stereo \
    -c:v libx264 -preset veryfast -b:v 4500k -maxrate 4500k -bufsize 9000k \
    -pix_fmt yuv420p -g 60 \
    -c:a aac -b:a 192k -ar 44100 \
    -f hls -hls_time 4 -hls_list_size 5 -hls_flags delete_segments hls_output/live.m3u8
fi

