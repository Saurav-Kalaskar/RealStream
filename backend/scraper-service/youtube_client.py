
import os
from googleapiclient.discovery import build
from typing import List, Dict, Any

class YouTubeClient:
    def __init__(self, api_key: str):
        self.youtube = build('youtube', 'v3', developerKey=api_key)

    def search_videos(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Search for videos using the YouTube Data API.
        Attempts to find 'Shorts' by filtering for short duration videos.
        """
        # Add "shorts" to query to bias results towards Shorts content
        search_query = query
        if "shorts" not in query.lower():
            search_query = f"{query} shorts"

        try:
            request = self.youtube.search().list(
                part="snippet",
                q=search_query,
                type="video",
                videoDuration="short", # < 4 mins
                maxResults=limit,
                relevanceLanguage="en",
                safeSearch="moderate"
            )
            response = request.execute()
            
            results = []
            for item in response.get('items', []):
                video_data = self._map_video_data(item, query)
                if video_data:
                    results.append(video_data)
            
            return results
        except Exception as e:
            print(f"Error searching videos: {e}")
            return []

    def get_channel_videos(self, channel_name: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Fetch short videos from a specific channel.
        First resolves the channel ID, then searches for videos from that channel.
        """
        channel_id = self._get_channel_id(channel_name)
        if not channel_id:
            print(f"Channel not found: {channel_name}")
            return []

        try:
            # Search for videos in that channel
            request = self.youtube.search().list(
                part="snippet",
                channelId=channel_id,
                type="video",
                videoDuration="short",
                order="date", # Get latest videos
                maxResults=limit
            )
            response = request.execute()

            results = []
            for item in response.get('items', []):
                video_data = self._map_video_data(item, f"@{channel_name}")
                if video_data:
                    results.append(video_data)
            
            return results
        except Exception as e:
            print(f"Error getting channel videos: {e}")
            return []

    def _get_channel_id(self, channel_name: str) -> str:
        """
        Resolve channel name (e.g., 'MrBeast', '@MrBeast') to Channel ID.
        """
        clean_name = channel_name.replace('@', '').strip()
        
        try:
            request = self.youtube.search().list(
                part="snippet",
                q=clean_name,
                type="channel",
                maxResults=1
            )
            response = request.execute()
            
            items = response.get('items', [])
            if items:
                return items[0]['id']['channelId']
        except Exception as e:
            print(f"Error resolving channel ID: {e}")
        
        return None

    def _map_video_data(self, item: Dict[str, Any], source_query: str) -> Dict[str, Any]:
        """
        Map YouTube API item to internal Video format.
        """
        try:
            snippet = item['snippet']
            video_id = item['id']['videoId']
            
            # High res thumbnail preferred
            thumbnails = snippet.get('thumbnails', {})
            thumbnail_url = (
                thumbnails.get('high', {}).get('url') or 
                thumbnails.get('medium', {}).get('url') or 
                thumbnails.get('default', {}).get('url')
            )

            return {
                'videoId': video_id,
                'title': snippet['title'],
                'url': f"https://www.youtube.com/shorts/{video_id}",
                'thumbnailUrl': thumbnail_url,
                # Duration is not available in search results snippet. 
                # We assume it fits criteria because of videoDuration='short' filter.
                # If strict duration is needed, we must fetch contentDetails separately.
                'duration': 60, 
                'viewCount': 0, # Not available in search snippet
                'uploadDate': snippet['publishedAt'],
                'channelTitle': snippet['channelTitle'],
                'hashtag': source_query,
                'width': 0,
                'height': 0
            }
        except KeyError:
            return None
