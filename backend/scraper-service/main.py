
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
from youtube_client import YouTubeClient

# Load environment variables
load_dotenv()

app = FastAPI()

@app.get("/")
async def root():
    return {"status": "ok", "service": "scraper-service", "version": "2.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Initialize YouTube Client
API_KEY = os.getenv("YOUTUBE_API_KEY")
if not API_KEY:
    print("WARNING: YOUTUBE_API_KEY not found in environment variables.")

client = YouTubeClient(API_KEY) if API_KEY else None

class ScrapeRequest(BaseModel):
    hashtag: Optional[str] = None
    channel: Optional[str] = None
    limit: int = 10

@app.post("/scrape")
async def scrape_videos(request: ScrapeRequest):
    if not client:
        raise HTTPException(status_code=500, detail="YouTube API Key not configured")

    results = []
    
    # Priority 1: Channel Search
    if request.channel:
        print(f"Searching channel: {request.channel}")
        results = client.get_channel_videos(request.channel, request.limit)
    
    # Priority 2: Topic Search
    elif request.hashtag:
        print(f"Searching topic: {request.hashtag}")
        results = client.search_videos(request.hashtag, request.limit)
    
    else:
        raise HTTPException(status_code=400, detail="Either 'hashtag' or 'channel' must be provided")

    # Save to Content Service
    saved_count = 0
    for video in results:
        try:
            # POST to Content Service
            # URL: http://localhost:8083/videos
            # We need to map the video object to what Content Service expects
            payload = {
                "videoId": video['videoId'],
                "title": video['title'],
                "description": video['title'], # Use title as description for now
                "url": video['url'],
                "hashtags": [f"#{request.hashtag}" if not request.hashtag.startswith("#") else request.hashtag] if request.hashtag else [video['channelTitle']], # Normalize to #hashtag
                "thumbnailUrl": video['thumbnailUrl'],
                "channelTitle": video['channelTitle'],
                "duration": video['duration'],
                "viewCount": video['viewCount']
            }
            # Use 'content-service' hostname in Docker
            import requests
            content_service_url = os.getenv("CONTENT_SERVICE_URL", "http://content-service:8083")
            response = requests.post(f"{content_service_url}/videos", json=payload)
            if response.status_code in [200, 201]:
                saved_count += 1
                print(f"Saved video: {video['title']}")
            else:
                print(f"Failed to save video: {response.text}")
        except Exception as e:
            print(f"Error saving video to content service: {e}")

    return {
        "message": f"Found {len(results)} videos, Saved {saved_count}",
        "count": len(results),
        "saved_count": saved_count,
        "videos": results 
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
