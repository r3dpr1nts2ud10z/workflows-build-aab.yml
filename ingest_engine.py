import os
import subprocess
import cv2
import numpy as np

def get_video_metadata(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = frame_count / fps if fps > 0 else 0
    
    cap.release()
    return {
        "fps": fps,
        "frame_count": frame_count,
        "resolution": (width, height),
        "duration": duration
    }

def detect_scenes(video_path, threshold=0.4, min_scene_len=30):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    scene_boundaries = [0]
    prev_hist = None
    frame_idx = 0
    last_cut_frame = 0
    
    print("[*] Analyzing video frames for scene cuts...")
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        small = cv2.resize(frame, (320, 180))
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        
        hist = cv2.calcHist([hsv], [0, 1], None, [16, 16], [0, 180, 0, 256])
        cv2.normalize(hist, hist)
        
        if prev_hist is not None:
            metric = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
            if metric < threshold and (frame_idx - last_cut_frame) >= min_scene_len:
                scene_boundaries.append(frame_idx)
                last_cut_frame = frame_idx
                
        prev_hist = hist
        frame_idx += 1
        
    cap.release()
    scene_boundaries.append(frame_idx)
    
    timestamps = [f / fps for f in scene_boundaries]
    print(f"[+] Detected {len(scene_boundaries) - 1} scenes.")
    return timestamps

def slice_video_chunks(video_path, timestamps, output_dir="r3d_chunks"):
    os.makedirs(output_dir, exist_ok=True)
    print(f"[*] Slicing video into chunks inside '{output_dir}/'...")
    
    for i in range(len(timestamps) - 1):
        start_time = timestamps[i]
        end_time = timestamps[i+1]
        duration = end_time - start_time
        
        if duration < 1.0:
            continue
            
        output_path = os.path.join(output_dir, f"scene_{i:04d}.mp4")
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-to", str(end_time),
            "-i", video_path,
            "-c:v", "libx264", "-crf", "18",
            "-c:a", "aac",
            output_path
        ]
        
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"    -> Exported Chunk {i:04d}: {start_time:.2f}s to {end_time:.2f}s")

if __name__ == "__main__":
    MOVIE_PATH = "source_movie.mp4"
    if not os.path.exists(MOVIE_PATH):
        print(f"[!] Error: Source file '{MOVIE_PATH}' not found.")
    else:
        meta = get_video_metadata(MOVIE_PATH)
        print(f"[+] Metadata Loaded: {meta['resolution'][0]}x{meta['resolution'][1]} @ {meta['fps']:.2f}fps, Duration: {meta['duration']:.2f}s")
        scene_times = detect_scenes(MOVIE_PATH, threshold=0.45)
        slice_video_chunks(MOVIE_PATH, scene_times)
        print("[✨] Ingestion & chunking sequence complete.")
