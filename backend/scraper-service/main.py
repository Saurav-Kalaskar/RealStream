
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
    return {"status": "ok", "service": "scraper-service", "version": "3.0"}

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
    limit: int = 25  # Per-keyword limit
    clear: bool = True  # Clear old videos for this search before saving new ones

def clear_videos_in_content_service(hashtag: Optional[str] = None, channel: Optional[str] = None):
    """Delete old videos for a given hashtag or channel from the content service."""
    import requests
    content_service_url = os.getenv("CONTENT_SERVICE_URL", "http://content-service:8083")
    try:
        params = {}
        if hashtag:
            params['hashtag'] = hashtag
        if channel:
            params['channel'] = channel
        
        response = requests.delete(f"{content_service_url}/videos", params=params)
        if response.status_code in [200, 204]:
            print(f"Cleared old videos for hashtag='{hashtag}', channel='{channel}'")
        else:
            print(f"Failed to clear old videos: {response.text}")
    except Exception as e:
        print(f"Error calling clear on content service: {e}")

def save_videos_to_content_service(videos: list) -> int:
    """Save a list of video dicts to the content service. Returns count saved."""
    import requests
    content_service_url = os.getenv("CONTENT_SERVICE_URL", "http://content-service:8083")
    saved_count = 0

    for video in videos:
        try:
            payload = {
                "videoId": video['videoId'],
                "title": video['title'],
                "description": video['title'],
                "url": video['url'],
                "hashtags": video.get('hashtags', []),
                "thumbnailUrl": video['thumbnailUrl'],
                "channelTitle": video['channelTitle'],
                "duration": video['duration'],
                "viewCount": video['viewCount']
            }
            response = requests.post(f"{content_service_url}/videos", json=payload)
            if response.status_code in [200, 201]:
                saved_count += 1
                print(f"Saved video: {video['title']}")
            else:
                print(f"Failed to save video: {response.text}")
        except Exception as e:
            print(f"Error saving video to content service: {e}")

    return saved_count

@app.post("/scrape")
async def scrape_videos(request: ScrapeRequest):
    """
    Primary scrape endpoint. For multi-word topics, searches each keyword
    individually for a broader result set.
    """
    if not client:
        raise HTTPException(status_code=500, detail="YouTube API Key not configured")

    results = []
    
    # Priority 1: Channel Search
    if request.channel:
        print(f"Searching channel: {request.channel}")
        results = client.get_channel_videos(request.channel, request.limit)
    
    # Priority 2: Topic Search — per-keyword for broader results
    elif request.hashtag:
        print(f"Searching topic: {request.hashtag}")
        results = client.search_videos(request.hashtag, request.limit)
    
    else:
        raise HTTPException(status_code=400, detail="Either 'hashtag' or 'channel' must be provided")

    # Clear old videos before saving the new fresh batch
    if request.clear:
        clear_videos_in_content_service(hashtag=request.hashtag, channel=request.channel)

    saved_count = save_videos_to_content_service(results)

    return {
        "message": f"Found {len(results)} videos, Saved {saved_count}",
        "count": len(results),
        "saved_count": saved_count,
        "videos": results 
    }

@app.post("/scrape/related")
async def scrape_related_videos(request: ScrapeRequest):
    """
    Scrape related videos using Datamuse API to find semantically related
    keywords, then search YouTube for each. Called when the primary feed runs out.
    """
    if not client:
        raise HTTPException(status_code=500, detail="YouTube API Key not configured")

    query = request.hashtag or request.channel or ""
    if not query:
        raise HTTPException(status_code=400, detail="A search query is required")

    print(f"Fetching related videos for: {query}")
    results = client.search_related_videos(query, limit_per_topic=10)
    saved_count = save_videos_to_content_service(results)

    # Also return the related keywords so the frontend can display them
    related_keywords = client.get_related_keywords(query)

    return {
        "message": f"Found {len(results)} related videos, Saved {saved_count}",
        "count": len(results),
        "saved_count": saved_count,
        "relatedKeywords": related_keywords,
        "videos": results 
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
