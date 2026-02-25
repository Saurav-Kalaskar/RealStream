
import os
import requests as http_requests
from googleapiclient.discovery import build
from typing import List, Dict, Any, Set

DATAMUSE_API = "https://api.datamuse.com/words"

class YouTubeClient:
    def __init__(self, api_key: str):
        self.youtube = build('youtube', 'v3', developerKey=api_key)

    def search_videos_combined(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Search strategy that prioritizes topic relevance:
        1. First search the FULL combined phrase (most relevant)
        2. Then search each keyword WITH context of other keywords (supplementary)
        
        e.g., "Amazon DSA" →
          Search 1: "Amazon DSA #shorts" (full phrase, most relevant)
          Search 2: "Amazon DSA interview coding #shorts" (enriched query)
        
        This avoids the problem of searching "Amazon" alone which returns
        random shopping/delivery videos unrelated to DSA.
        """
        keywords = [w.strip() for w in query.split() if w.strip()]
        full_query = " ".join(keywords)
        all_hashtags = [f"#{kw}" for kw in keywords]

        all_results = []
        seen_video_ids: Set[str] = set()

        # --- Phase 1: Search the FULL combined phrase (highest relevance) ---
        search_query = f"{full_query} #shorts"
        print(f"Phase 1 - Full phrase search: '{search_query}'")
        self._do_search(search_query, limit, all_hashtags, all_results, seen_video_ids)

        # --- Phase 2: Contextual keyword searches (each word keeps context of others) ---
        if len(keywords) > 1:
            for kw in keywords:
                # Search each keyword but WITH the other keywords as context
                # e.g., for "Amazon DSA": search "Amazon DSA coding #shorts" and "DSA Amazon interview #shorts"
                other_keywords = [w for w in keywords if w != kw]
                contextual_query = f"{kw} {' '.join(other_keywords)} #shorts"
                remaining = max(10, (limit - len(all_results)) // len(keywords))
                print(f"Phase 2 - Contextual search: '{contextual_query}' (limit {remaining})")
                self._do_search(contextual_query, remaining, all_hashtags, all_results, seen_video_ids)

        print(f"Total unique videos found: {len(all_results)}")
        return all_results

    def _do_search(self, search_query: str, limit: int, hashtags: List[str],
                   results: List[Dict[str, Any]], seen_ids: Set[str]):
        """Execute a YouTube search and append unique results."""
        try:
            request = self.youtube.search().list(
                part="snippet",
                q=search_query,
                type="video",
                videoDuration="short",
                maxResults=min(limit, 50),
                relevanceLanguage="en",
                safeSearch="moderate"
            )
            response = request.execute()

            for item in response.get('items', []):
                video_data = self._map_video_data(item, hashtags)
                if video_data and video_data['videoId'] not in seen_ids:
                    seen_ids.add(video_data['videoId'])
                    results.append(video_data)
        except Exception as e:
            print(f"Error in search '{search_query}': {e}")

    def get_related_keywords(self, query: str, max_results: int = 5) -> List[str]:
        """
        Generate TOPIC-COHERENT related phrases using Datamuse API.
        Instead of finding random associations for individual words,
        this finds words related to the COMBINED topic and keeps
        the original context in each suggestion.
        
        e.g., "Amazon DSA" → ["Amazon DSA interview", "Amazon coding round",
               "DSA problems", "Amazon SDE preparation", "coding interview"]
        """
        keywords = [w.strip().lower() for w in query.split() if w.strip()]
        full_query = " ".join(keywords)
        related_phrases: List[str] = []

        # Strategy 1: Find words triggered by the FULL query (topic-coherent)
        try:
            resp = http_requests.get(DATAMUSE_API, params={
                "rel_trg": full_query, "max": 10
            }, timeout=3)
            if resp.status_code == 200:
                for item in resp.json():
                    word = item.get("word", "").strip()
                    if word and word.lower() not in keywords:
                        # Combine with original query for compound phrase
                        related_phrases.append(f"{full_query} {word}")
        except Exception as e:
            print(f"Datamuse full-query lookup failed: {e}")

        # Strategy 2: For each keyword, find triggered words and combine with full context
        for kw in keywords:
            try:
                resp = http_requests.get(DATAMUSE_API, params={
                    "rel_trg": kw, "max": 5
                }, timeout=3)
                if resp.status_code == 200:
                    for item in resp.json():
                        word = item.get("word", "").strip()
                        if word and word.lower() not in keywords and " " not in word:
                            # Keep the original context + new word
                            phrase = f"{full_query} {word}"
                            if phrase not in related_phrases:
                                related_phrases.append(phrase)
            except Exception as e:
                print(f"Datamuse per-keyword lookup failed for '{kw}': {e}")

        # Strategy 3: If Datamuse returned nothing, generate contextual expansions
        if not related_phrases:
            related_phrases = [
                f"{full_query} tutorial",
                f"{full_query} tips",
                f"{full_query} interview",
                f"{full_query} preparation",
                f"best {full_query}",
            ]

        # Deduplicate and limit
        seen = set()
        unique_phrases = []
        for p in related_phrases:
            if p.lower() not in seen:
                seen.add(p.lower())
                unique_phrases.append(p)

        result = unique_phrases[:max_results]
        print(f"Related phrases for '{query}': {result}")
        return result

    def search_related_videos(self, query: str, limit_per_topic: int = 10) -> List[Dict[str, Any]]:
        """
        Find related videos using Datamuse-generated compound phrases.
        Each phrase maintains the original topic context.
        """
        related_phrases = self.get_related_keywords(query)
        all_hashtags = [f"#{w}" for w in query.split() if w.strip()]

        all_results = []
        seen_video_ids: Set[str] = set()

        for phrase in related_phrases:
            search_query = f"{phrase} #shorts"
            print(f"Searching related: '{search_query}'")
            self._do_search(search_query, limit_per_topic, all_hashtags, all_results, seen_video_ids)

        print(f"Total related videos found: {len(all_results)}")
        return all_results

    def get_channel_videos(self, channel_name: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch short videos from a specific channel."""
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
        """Resolve channel name to Channel ID."""
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
        """Map YouTube API item to internal Video format."""
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
