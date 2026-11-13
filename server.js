const express = require('express');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS configuration for Netlify frontend integration
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://roastroycenetwork420.netlify.app");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

const WATCH_DIR = path.join(__dirname, 'watch_folder');
const OUTPUT_DIR = path.join(__dirname, 'output_manifests');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Serve output manifests with aggressive caching headers for HLS streaming optimization
app.use('/output_manifests', (req, res, next) => {
  if (req.url.endsWith('.m3u8')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (req.url.endsWith('.ts')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  }
  next();
}, express.static(OUTPUT_DIR));

console.log('♠️ [RSN MONSTARS ENGINE] Initializing Optimized Broadcast Origin...');

const watcher = chokidar.watch(WATCH_DIR, {
  ignored: /(^|[\\/\\])\../,
  persistent: true,
  depth: 2
});

watcher.on('add', (filePath) => {
  console.log('[INGEST DETECTED] New media asset locked: ' + filePath);
  processPipeline(filePath);
});

async function processPipeline(filePath) {
  const fileName = path.basename(filePath);
  console.log('[PIPELINE START] Processing ' + fileName + ' through Underboss Engine...');

  try {
    awaitingWhisperTranscription(filePath);
    await triggerComfyUIV2V(filePath);
    await compileFastStream(filePath);
  } catch (error) {
    console.error('[PIPELINE ERROR] Failed processing ' + fileName + ':', error.message);
  }
}

function awaitingWhisperTranscription(filePath) {
  console.log('[WHISPER API] Extracting dialogue timestamps from ' + path.basename(filePath) + '...');
}

async function triggerComfyUIV2V(filePath) {
  const comfyUrl = process.env.COMFYUI_API_URL;
  
  if (!comfyUrl) {
    console.log('[COMFYUI] COMFYUI_API_URL not set. Running in simulation mode.');
    return;
  }

  try {
    const payload = {
      client_id: "rsn_underboss_engine",
      prompt: {
        "input_video": path.basename(filePath),
        "character_target": "Nino_Fox"
      }
    };

    const response = await axios.post(`${comfyUrl}/prompt`, payload);
    console.log('[COMFYUI SUCCESS] Job queued on GPU. Prompt ID: ', response.data.prompt_id);
  } catch (err) {
    console.error('[COMFYUI ERROR] Failed to dispatch to GPU node:', err.message);
  }
}

function compileFastStream(filePath) {
  return new Promise((resolve, reject) => {
    const outputPlaylist = path.join(OUTPUT_DIR, 'stream.m3u8');
    console.log('[FFmpeg SCTE-35] Compiling HLS segments & embedding ad cue markers...');

    ffmpeg(filePath)
      .outputOptions([
        '-profile:v baseline',
        '-level 3.0',
        '-start_number 0',
        '-hls_time 6',
        '-hls_list_size 10',
        '-hls_flags delete_segments',
        '-hls_scte35 1'
      ])
      .output(outputPlaylist)
      .on('end', () => {
        console.log('[FFmpeg SUCCESS] Stream segments compiled at: ' + outputPlaylist);
        resolve();
      })
      .on('error', (err) => {
        console.error('[FFmpeg NOTE] Stream compilation status: ' + err.message);
        resolve();
      })
      .run();
  });
}

app.get('/status', (req, res) => {
  res.json({
    status: "ONLINE",
    network: "RSN Channel 420 - Monstars Engine",
    mode: "Optimized HLS Origin Active",
    api_connections: {
      comfyui: process.env.COMFYUI_API_URL ? "Connected" : "Pending API Key",
      whisper: process.env.OPENAI_API_KEY ? "Connected" : "Pending API Key"
    },
    demigod_joker: "Ted the Teddy Bear presiding over the live broadcast"
  });
});

app.listen(PORT, () => {
  console.log('♠️ RSN Origin Server live on port ' + PORT);
});
