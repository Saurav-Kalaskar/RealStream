
import os
import requests as http_requests
from googleapiclient.discovery import build
from typing import List, Dict, Any, Set

DATAMUSE_API = "https://api.datamuse.com/words"

class YouTubeClient:
    def __init__(self, api_key: str):
        self.youtube = build('youtube', 'v3', developerKey=api_key)

    def search_videos_per_keyword(self, query: str, limit_per_keyword: int = 25) -> List[Dict[str, Any]]:
        """
        Search for videos by splitting multi-word queries into individual keywords.
        Each keyword gets its own YouTube search, results are merged and deduplicated.
        e.g., "DSA Amazon" → search "DSA shorts" (25 results) + search "Amazon shorts" (25 results)
        """
        keywords = [w.strip() for w in query.split() if w.strip()]
        
        all_results = []
        seen_video_ids: Set[str] = set()

        for keyword in keywords:
            search_query = f"{keyword} #shorts"
            print(f"Searching keyword: '{search_query}'")

            try:
                request = self.youtube.search().list(
                    part="snippet",
                    q=search_query,
                    type="video",
                    videoDuration="short",
                    maxResults=limit_per_keyword,
                    relevanceLanguage="en",
                    safeSearch="moderate"
                )
                response = request.execute()

                for item in response.get('items', []):
                    video_data = self._map_video_data(item, [f"#{keyword}"])
                    if video_data and video_data['videoId'] not in seen_video_ids:
                        seen_video_ids.add(video_data['videoId'])
                        all_results.append(video_data)

            except Exception as e:
                print(f"Error searching keyword '{keyword}': {e}")

        print(f"Total unique videos found: {len(all_results)}")
        return all_results

    def get_related_keywords(self, query: str, max_results: int = 5) -> List[str]:
        """
        Use the Datamuse API to dynamically find semantically related words.
        Combines multiple signals:
          - ml (meaning-like): words with similar meaning
          - rel_trg (triggered by): words that are statistically associated
        Falls back to simple variations if the API is unavailable.
        """
        keywords = [w.strip().lower() for w in query.split() if w.strip()]
        related: Set[str] = set()

        for kw in keywords:
            # 1. Get words with similar meaning (semantic similarity)
            try:
                resp = http_requests.get(DATAMUSE_API, params={"ml": kw, "max": 8}, timeout=3)
                if resp.status_code == 200:
                    for item in resp.json():
                        word = item.get("word", "")
                        # Skip multi-word results and the original keyword
                        if word and " " not in word and word.lower() != kw:
                            related.add(word)
            except Exception as e:
                print(f"Datamuse ml lookup failed for '{kw}': {e}")

            # 2. Get statistically triggered/associated words
            try:
                resp = http_requests.get(DATAMUSE_API, params={"rel_trg": kw, "max": 5}, timeout=3)
                if resp.status_code == 200:
                    for item in resp.json():
                        word = item.get("word", "")
                        if word and " " not in word and word.lower() != kw:
                            related.add(word)
            except Exception as e:
                print(f"Datamuse trg lookup failed for '{kw}': {e}")

        # Remove any words that were in the original query
        related -= set(keywords)

        # If Datamuse returned nothing, fall back to simple expansions
        if not related:
            for kw in keywords:
                related.add(f"{kw} tutorial")
                related.add(f"{kw} tips")
                related.add(f"best {kw}")

        result = list(related)[:max_results]
        print(f"Related keywords for '{query}': {result}")
        return result

    def search_related_videos(self, query: str, limit_per_topic: int = 10) -> List[Dict[str, Any]]:
        """
        Find related videos by dynamically generating related keywords via Datamuse
        and searching YouTube for each.
        """
        related_keywords = self.get_related_keywords(query)

        all_results = []
        seen_video_ids: Set[str] = set()

        for keyword in related_keywords:
            search_query = f"{keyword} #shorts"
            print(f"Searching related: '{search_query}'")

            try:
                request = self.youtube.search().list(
                    part="snippet",
                    q=search_query,
                    type="video",
                    videoDuration="short",
                    maxResults=limit_per_topic,
                    relevanceLanguage="en",
                    safeSearch="moderate"
                )
                response = request.execute()

                for item in response.get('items', []):
                    video_data = self._map_video_data(item, [f"#{keyword}"])
                    if video_data and video_data['videoId'] not in seen_video_ids:
                        seen_video_ids.add(video_data['videoId'])
                        all_results.append(video_data)

            except Exception as e:
                print(f"Error searching related '{keyword}': {e}")

        print(f"Total related videos found: {len(all_results)}")
        return all_results

    def get_channel_videos(self, channel_name: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Fetch short videos from a specific channel.
        """
        channel_id = self._get_channel_id(channel_name)
        if not channel_id:
            print(f"Channel not found: {channel_name}")
            return []

        try:
            request = self.youtube.search().list(
                part="snippet",
                channelId=channel_id,
                type="video",
                videoDuration="short",
                order="date",
                maxResults=limit
            )
            response = request.execute()

            results = []
            for item in response.get('items', []):
                video_data = self._map_video_data(item, [f"@{channel_name}"])
                if video_data:
                    results.append(video_data)
            
            return results
        except Exception as e:
            print(f"Error getting channel videos: {e}")
            return []

    def _get_channel_id(self, channel_name: str) -> str:
        """
        Resolve channel name to Channel ID.
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

    def _map_video_data(self, item: Dict[str, Any], hashtags: List[str]) -> Dict[str, Any]:
        """
        Map YouTube API item to internal Video format.
        """
        try:
            snippet = item['snippet']
            video_id = item['id']['videoId']
            
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
                'duration': 60, 
                'viewCount': 0,
                'uploadDate': snippet['publishedAt'],
                'channelTitle': snippet['channelTitle'],
                'hashtags': hashtags,
                'width': 0,
                'height': 0
            }
        except KeyError:
            return None
