---
name: User audio for videos
description: Wiring a user-supplied music track into a video-js artifact
---

Rule: when the user provides their own audio track for a video artifact, skip `generateMusic`. Trim the track to the user's requested window with ffmpeg (`-ss <start> -t <len>` plus `afade` in/out) and save it as `artifacts/<slug>/public/audio/bg_music.mp3` so the standard audio wiring from the video-js audio reference applies unchanged.

**Why:** The audio reference assumes generated music starting at 0:00; user tracks often need a specific segment (e.g. play from a fade-in at 0:15 to a fade-out at 0:57). Pre-trimming keeps scene-synced seeking (`SCENE_START_SEC`) correct with zero code changes.

**How to apply:** Also tell the design subagent the exact total runtime (clip length in ms) so `SCENE_DURATIONS` sums to the audio length. Music copyright is the user's own responsibility (acknowledged by this user).
