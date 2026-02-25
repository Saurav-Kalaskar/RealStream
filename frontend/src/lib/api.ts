import axios from "axios";

export interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    last: boolean;
    size: number;
    number: number;
    first: boolean;
    numberOfElements: number;
    empty: boolean;
}

export interface Video {
    id: string;
    videoId: string; // YouTube ID
    title: string;
    description?: string;
    url?: string;
    hashtags: string[];
    thumbnailUrl?: string;
    channelTitle?: string;
    duration?: number;
    viewCount?: number;
}

export interface LikeStatus {
    isLiked: boolean;
    likeCount: number;
}

export interface Comment {
    id: string;
    videoId: string;
    userId: string;
    content: string;
    displayName?: string;
    createdAt: string;
}

const api = axios.create({
    baseURL: "/api",
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Helper to get user ID from JWT
function getUserId(): string {
    if (typeof window === "undefined") return "";
    const token = localStorage.getItem("token");
    if (!token) return "";
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.sub || "";
    } catch {
        return "";
    }
}

function getUserName(): string {
    if (typeof window === "undefined") return "";
    const token = localStorage.getItem("token");
    if (!token) return "";
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.name || payload.email || "";
    } catch {
        return "";
    }
}



export const videoService = {
    async getVideos(page: number = 0, hashtag?: string, channel?: string): Promise<Page<Video>> {
        // Guard: If neither hashtag nor channel is provided, return empty page.
        // This prevents the "Explore" (findAll) behavior which mixes all topics.
        if (!hashtag && !channel) {
            return {
                content: [],
                totalPages: 0,
                totalElements: 0,
                last: true,
                size: 10,
                number: 0,
                first: true,
                numberOfElements: 0,
                empty: true
            };
        }

        const params: Record<string, unknown> = { page, size: 10 };
        if (hashtag) {
            params.hashtag = hashtag;
        }
        if (channel) {
            params.channel = channel;
        }
        const response = await api.get<Page<Video>>("/content/videos", { params });
        return response.data;
    },
};

export const interactionService = {
    async getLikeStatus(videoId: string): Promise<LikeStatus> {
        const userId = getUserId();
        const response = await api.get<LikeStatus>(`/interactions/likes/${videoId}`, {
            headers: { "X-User-Id": userId }
        });
        return response.data;
    },

    async toggleLike(videoId: string): Promise<LikeStatus> {
        const userId = getUserId();
        const response = await api.post<LikeStatus>(`/interactions/likes/${videoId}`, {}, {
            headers: { "X-User-Id": userId }
        });
        return response.data;
    }
};

export const commentService = {
    async getComments(videoId: string): Promise<Comment[]> {
        const response = await api.get<Comment[]>(`/comments`, {
            params: { videoId }
        });
        return response.data;
    },

    async addComment(videoId: string, content: string): Promise<Comment> {
        const userId = getUserId();
        const displayName = getUserName();
        const response = await api.post<Comment>(`/comments`, {
            videoId,
            content,
            displayName
        }, {
            headers: { "X-User-Id": userId }
        });
        return response.data;
    },

    async getCommentCount(videoId: string): Promise<number> {
        const response = await api.get<number>(`/comments/count`, {
            params: { videoId }
        });
        return response.data;
    }
};

export const scraperService = {
    async scrape(hashtag: string, channel?: string): Promise<{ message: string; count: number; videos?: Video[] }> {
        const response = await api.post("/scraper/scrape", {
            hashtag: channel ? "" : hashtag,
            channel: channel || undefined,
            limit: 25
        });
        return response.data;
    },

    async scrapeRelated(hashtag: string, channel?: string): Promise<{ message: string; count: number; relatedKeywords?: string[]; videos?: Video[] }> {
        const response = await api.post("/scraper/scrape/related", {
            hashtag: channel ? "" : hashtag,
            channel: channel || undefined,
        });
        return response.data;
    }
};

export const userService = {
    async getUserProfile(userId: string): Promise<any> {
        const response = await api.get(`/users/${userId}`);
        return response.data;
    }
};
