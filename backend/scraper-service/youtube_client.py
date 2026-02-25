import os
from googleapiclient.discovery import build
from typing import List, Dict, Any, Set, Optional
import urllib.parse

# Negative Guardrails: Topics that commonly pollute technical/broad searches.
# If these appear in title/description, discard immediately.
NEGATIVE_KEYWORDS = {
    "airsoft", "gun", "rifle", "weapon", "makeup", "haul", "clothing",
    "boutique", "prank", "perfume", "cosmetics", "skincare"
}

def normalize_hashtag(query: str) -> str:
    """
    Convert a search query into a single normalized hashtag.
    'Amazon DSA' → '#amazon-dsa'
    """
    words = [w.strip().lower() for w in query.split() if w.strip()]
    return "#" + "-".join(words)

def compute_relevance_score(title: str, description: str, channel: str, keywords: List[str]) -> float:
    """
    Computes a smart relevance score. 
    Checks how many of the original search keywords appear in the combined context.
    Returns a ratio (0.0 to 1.0).
    """
    context = f"{title} {description} {channel}".lower()
    
    # Negative Guardrail Check
    if any(bad_word in context for bad_word in NEGATIVE_KEYWORDS):
        return 0.0 # Automatically fail

    if not keywords:
        return 1.0
        
    match_count = sum(1 for kw in keywords if kw in context)
    return match_count / len(keywords)

class YouTubeClient:
    def __init__(self, api_key: str):
        self.youtube = build('youtube', 'v3', developerKey=api_key)
        # In-memory dictionary to store deep pagination tokens. 
        # Format: { "amazon dsa": "CGoQAA..." }
        self.page_tokens: Dict[str, str] = {}
        # Keep track of total seen IDs in-memory across identical searches 
        # to prevent duplicate saving in the DB.
        self.seen_session_ids: Set[str] = set()

    def search_videos_deep(self, query: str, target_count: int = 25, is_fresh_search: bool = True) -> List[Dict[str, Any]]:
        """
        Deep pagination search. Fetches pages until it acquires enough relevant videos.
        """
        normalized_query = query.strip().lower()
        tag = normalize_hashtag(normalized_query)
        keywords = [w.strip() for w in normalized_query.split() if w.strip()]

        if is_fresh_search:
            # Wipe old tokens and seen IDs for this query to restart the endless scroll from the top
            self.page_tokens.pop(normalized_query, None)
            self.seen_session_ids.clear()
            print(f"Started fresh deep search for '{normalized_query}'")

        # Start or resume deep pagination
        current_token = self.page_tokens.get(normalized_query)
        search_query = f"{query} #shorts"

        all_collected_results = []
        pages_fetched = 0
        max_pages_per_request = 5 # Safety limit to avoid burning API quota in one go

        while len(all_collected_results) < target_count and pages_fetched < max_pages_per_request:
            print(f"Deep Search Page {pages_fetched + 1} | Query: '{search_query}' | Token: {current_token}")
            
            try:
                request = self.youtube.search().list(
                    part="snippet",
                    q=search_query,
                    type="video",
                    videoDuration="short",
                    maxResults=50, # Max allowed by YouTube
                    relevanceLanguage="en",
                    safeSearch="moderate",
                    pageToken=current_token
                )
                response = request.execute()
                pages_fetched += 1
                
                items = response.get('items', [])
                if not items:
                    print("Reached the absolute end of YouTube search results.")
                    break # End of YouTube results
                
                for item in items:
                    video_id = item['id']['videoId']
                    if video_id in self.seen_session_ids:
                        continue # Skip duplicates in this session

                    # Smart Relevance Filtering
                    snippet = item['snippet']
                    title = snippet['title']
                    desc = snippet.get('description', '')
                    channel = snippet['channelTitle']
                    
                    score = compute_relevance_score(title, desc, channel, keywords)
                    
                    # We require at least 50% keyword match (e.g. 1 out of 2 keywords) to allow fuzziness,
                    # but reject anything below that to maintain quality.
                    if score >= 0.5:
                        video_data = self._map_video_data(item, [tag])
                        if video_data:
                            self.seen_session_ids.add(video_id)
                            all_collected_results.append(video_data)
                    else:
                        pass # Filtered out
                
                # Update next page token
                next_token = response.get('nextPageToken')
                if next_token:
                    current_token = next_token
                    self.page_tokens[normalized_query] = next_token
                else:
                    self.page_tokens.pop(normalized_query, None)
                    print(f"No more pages available for '{normalized_query}'.")
                    break

            except Exception as e:
                print(f"YouTube deep search failed: {e}")
                break
                
        print(f"Deep Search completed. Found {len(all_collected_results)} highly relevant videos across {pages_fetched} pages.")
        return all_collected_results

    def get_channel_videos_deep(self, channel_name: str, target_count: int = 50, is_fresh_search: bool = True) -> List[Dict[str, Any]]:
        """Deep pagination for a specific channel."""
        normalized_channel = channel_name.strip().lower()
        tag = f"@{normalized_channel.replace('@', '')}"
        
        channel_id = self._get_channel_id(channel_name)
        if not channel_id:
            print(f"Channel not found: {channel_name}")
            return []

        if is_fresh_search:
            self.page_tokens.pop(normalized_channel, None)
            self.seen_session_ids.clear()
            
        current_token = self.page_tokens.get(normalized_channel)
        all_collected_results = []
        pages_fetched = 0
        max_pages = 5

        while len(all_collected_results) < target_count and pages_fetched < max_pages:
            try:
                request = self.youtube.search().list(
                    part="snippet",
                    channelId=channel_id,
                    type="video",
                    videoDuration="short",
                    order="date",
                    maxResults=50,
                    pageToken=current_token
                )
                response = request.execute()
                pages_fetched += 1

                items = response.get('items', [])
                if not items:
                    break
                    
                for item in items:
                    video_id = item['id']['videoId']
                    if video_id in self.seen_session_ids:
                        continue
                        
                    video_data = self._map_video_data(item, [tag])
                    if video_data:
                        self.seen_session_ids.add(video_id)
                        all_collected_results.append(video_data)
                
                next_token = response.get('nextPageToken')
                if next_token:
                    current_token = next_token
                    self.page_tokens[normalized_channel] = next_token
                else:
                    self.page_tokens.pop(normalized_channel, None)
                    break
                    
            except Exception as e:
                print(f"Channel deep search failed: {e}")
                break

        return all_collected_results

    def _get_channel_id(self, channel_name: str) -> str:
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
            pass
        return None

    def _map_video_data(self, item: Dict[str, Any], hashtags: List[str]) -> Optional[Dict[str, Any]]:
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
