import os
import uuid
import logging
import asyncio
import json
import subprocess
import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("R3DPR1NT-ENGINE")

app = FastAPI(title="R3DPR1NT Studio Bridge Prime", version="3.2.0")

SECRET_API_KEY = os.environ.get("STUDIO_SECRET_KEY", "your-ultra-secure-key-here")
COMFYUI_HOST = os.environ.get("COMFYUI_HOST", "http://127.0.0.1:8188")

def verify_access(x_studio_key: str = Header(None)):
    if x_studio_key != SECRET_API_KEY:
        raise HTTPException(status_code=403, detail="Access Denied: Node Locked.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RENDER_DIR = "./renders"
ASSET_DIR = "./assets"
os.makedirs(RENDER_DIR, exist_ok=True)
os.makedirs(ASSET_DIR, exist_ok=True)

JOBS_STORE = {}

class RenderRequest(BaseModel):
    output_filename: str = "studio_render.mp4"
    text_overlay: str = "R3DPR1NT STUDIO // LIVE FEED"
    watermark_filename: str = "logo.png"
    resolution: str = "1280x720"
    video_bitrate: str = "2M"
    prompt: str = "cinematic urban cyber feed"

async def execute_generative_pipeline(job_id: str, req: RenderRequest):
    try:
        JOBS_STORE[job_id]["status"] = "processing"
        logger.info(f"[{job_id}] Initializing pipeline. Prompt: '{req.prompt}'")

        output_path = os.path.join(RENDER_DIR, req.output_filename)
        watermark_path = os.path.join(ASSET_DIR, req.watermark_filename)
        raw_temp_path = os.path.join(RENDER_DIR, f"raw_{job_id}.mp4")

        # 1. Attempt ComfyUI Local Node Integration
        workflow_path = "./workflow_api.json"
        dispatched_to_ai = False

        if os.path.exists(workflow_path):
            try:
                with open(workflow_path, "r") as f:
                    workflow = json.load(f)
                if "3" in workflow and "inputs" in workflow["3"]:
                    workflow["3"]["inputs"]["text"] = req.prompt

                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(f"{COMFYUI_HOST}/prompt", json={"prompt": workflow})
                    if res.status_code == 200:
                        prompt_id = res.json().get("prompt_id")
                        logger.info(f"[{job_id}] Accepted by ComfyUI node. ID: {prompt_id}")
                        while True:
                            await asyncio.sleep(3)
                            h_res = await client.get(f"{COMFYUI_HOST}/history/{prompt_id}")
                            if h_res.status_code == 200 and prompt_id in h_res.json():
                                outputs = h_res.json()[prompt_id]["outputs"]
                                for _, node_out in outputs.items():
                                    if "videos" in node_out or "gifs" in node_out:
                                        f_info = node_out.get("videos", node_out.get("gifs"))[0]
                                        f_url = f"{COMFYUI_HOST}/view?filename={f_info['filename']}&subfolder={f_info['subfolder']}&type={f_info['type']}"
                                        media_res = await client.get(f_url)
                                        with open(raw_temp_path, "wb") as rf:
                                            rf.write(media_res.content)
                                        dispatched_to_ai = True
                                        break
                            if dispatched_to_ai:
                                break
            except Exception as ex:
                logger.warning(f"[{job_id}] ComfyUI bridge offline: {ex}. Falling back to native compositor.")

        # 2. Native Fallback Engine
        if not dispatched_to_ai:
            fallback_cmd = [
                "ffmpeg", "-y",
                "-f", "lavfi", "-i", f"color=c=black:size={req.resolution}:rate=30:duration=4",
                "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                "-c:v", "libx264", "-t", "4", raw_temp_path
            ]
            subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        # 3. Final Watermark & Overlay Pass
        comp_cmd = ["ffmpeg", "-y", "-i", raw_temp_path]
        if os.path.exists(watermark_path):
            comp_cmd.extend([
                "-i", watermark_path,
                "-filter_complex", f"[0:v]drawtext=text='{req.text_overlay}':fontcolor=cyan:fontsize=22:x=40:y=40[txt];[txt][1:v]overlay=W-w-40:40[outv]",
                "-map", "[outv]", "-map", "0:a?"
            ])
        else:
            comp_cmd.extend(["-vf", f"drawtext=text='{req.text_overlay}':fontcolor=cyan:fontsize=22:x=40:y=40"])

        comp_cmd.extend([
            "-c:v", "libx264", "-b:v", req.video_bitrate,
            "-pix_fmt", "yuv420p", output_path
        ])

        subprocess.run(comp_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        if os.path.exists(raw_temp_path):
            os.remove(raw_temp_path)

        JOBS_STORE[job_id]["status"] = "completed"
        JOBS_STORE[job_id]["output_path"] = output_path
        logger.info(f"[{job_id}] Job finished successfully.")

    except Exception as e:
        JOBS_STORE[job_id]["status"] = "failed"
        JOBS_STORE[job_id]["error"] = str(e)
        logger.exception(f"[{job_id}] Pipeline failure.")

@app.get("/api/health")
def health_check():
    return {"status": "ONLINE", "node": "R3DPR1NT-PRIME", "active_jobs": len(JOBS_STORE)}

@app.post("/api/dispatch", dependencies=[Depends(verify_access)])
def dispatch_render(req: RenderRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())[:8]
    JOBS_STORE[job_id] = {
        "job_id": job_id,
        "target_output": req.output_filename,
        "status": "queued",
        "prompt": req.prompt
    }
    background_tasks.add_task(execute_generative_pipeline, job_id, req)
    return {"status": "dispatched", "job_id": job_id}

@app.get("/api/jobs", dependencies=[Depends(verify_access)])
def get_jobs():
    return list(JOBS_STORE.values())

@app.get("/api/renders", dependencies=[Depends(verify_access)])
def list_renders():
    files = []
    if os.path.exists(RENDER_DIR):
        for f in os.listdir(RENDER_DIR):
            fp = os.path.join(RENDER_DIR, f)
            if os.path.isfile(fp) and f.endswith(".mp4"):
                files.append({"filename": f, "size_mb": round(os.path.getsize(fp) / (1024 * 1024), 2)})
    return files

@app.get("/api/download/{filename}", dependencies=[Depends(verify_access)])
def download_render(filename: str):
    path = os.path.join(RENDER_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path)
    raise HTTPException(status_code=404, detail="File not found.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=7860)
