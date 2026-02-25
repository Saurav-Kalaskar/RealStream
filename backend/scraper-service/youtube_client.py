
import os
import requests as http_requests
from googleapiclient.discovery import build
from typing import List, Dict, Any, Set

DATAMUSE_API = "https://api.datamuse.com/words"


def normalize_hashtag(query: str) -> str:
    """
    Convert a search query into a single normalized hashtag.
    'Amazon DSA' → '#amazon-dsa'
    'cooking vlog' → '#cooking-vlog'
    """
    words = [w.strip().lower() for w in query.split() if w.strip()]
    return "#" + "-".join(words)


class YouTubeClient:
    def __init__(self, api_key: str):
        self.youtube = build('youtube', 'v3', developerKey=api_key)

    def search_videos(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Search YouTube for the FULL combined phrase.
        Tags all results with a single combined hashtag so the content service
        only returns videos from this exact search — no cross-contamination.
        
        'Amazon DSA' → searches YouTube for "Amazon DSA #shorts"
                     → tags every result with '#amazon-dsa'
        """
        tag = normalize_hashtag(query)
        search_query = f"{query} #shorts"
        print(f"YouTube search: '{search_query}' → tag: {tag}")

        all_results = []
        seen_ids: Set[str] = set()
        self._do_search(search_query, limit, [tag], all_results, seen_ids)

        print(f"Found {len(all_results)} videos for '{query}'")
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
        Generate topic-coherent related phrases using Datamuse API.
        Every returned phrase keeps the original query as context.
        
        'Amazon DSA' → ['Amazon DSA interview', 'Amazon DSA coding', ...]
        """
        keywords = [w.strip().lower() for w in query.split() if w.strip()]
        full_query = " ".join(keywords)
        related_phrases: List[str] = []

        # Find words triggered by the full query
        try:
            resp = http_requests.get(DATAMUSE_API, params={
                "rel_trg": full_query, "max": 10
            }, timeout=3)
            if resp.status_code == 200:
                for item in resp.json():
                    word = item.get("word", "").strip()
                    if word and word.lower() not in keywords:
                        related_phrases.append(f"{full_query} {word}")
        except Exception as e:
            print(f"Datamuse lookup failed: {e}")

        # Per-keyword associations combined with full context
        for kw in keywords:
            try:
                resp = http_requests.get(DATAMUSE_API, params={
                    "rel_trg": kw, "max": 5
                }, timeout=3)
                if resp.status_code == 200:
                    for item in resp.json():
                        word = item.get("word", "").strip()
                        if word and word.lower() not in keywords and " " not in word:
                            phrase = f"{full_query} {word}"
                            if phrase not in related_phrases:
                                related_phrases.append(phrase)
            except Exception as e:
                print(f"Datamuse per-keyword failed for '{kw}': {e}")

        # Fallback
        if not related_phrases:
            related_phrases = [
                f"{full_query} tutorial",
                f"{full_query} tips",
                f"{full_query} interview",
                f"{full_query} preparation",
                f"best {full_query}",
            ]

        # Deduplicate
        seen = set()
        unique = []
        for p in related_phrases:
            if p.lower() not in seen:
                seen.add(p.lower())
                unique.append(p)

        result = unique[:max_results]
        print(f"Related phrases for '{query}': {result}")
        return result

    def search_related_videos(self, query: str, limit_per_topic: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch related videos. Each related phrase gets its own combined tag
        so it doesn't pollute the primary feed.
        """
        related_phrases = self.get_related_keywords(query)
        primary_tag = normalize_hashtag(query)

        all_results = []
        seen_ids: Set[str] = set()

        for phrase in related_phrases:
            phrase_tag = normalize_hashtag(phrase)
            search_query = f"{phrase} #shorts"
            print(f"Searching related: '{search_query}' → tag: {phrase_tag}")
            # Tag with BOTH the primary tag (so they show in the primary feed)
            # and the phrase-specific tag
            self._do_search(search_query, limit_per_topic,
                            [primary_tag, phrase_tag], all_results, seen_ids)

        print(f"Total related videos found: {len(all_results)}")
        return all_results

    def get_channel_videos(self, channel_name: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch short videos from a specific channel."""
        channel_id = self._get_channel_id(channel_name)
        if not channel_id:
            print(f"Channel not found: {channel_name}")
            return []

        tag = f"@{channel_name.replace('@', '').strip().lower()}"
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
                video_data = self._map_video_data(item, [tag])
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
