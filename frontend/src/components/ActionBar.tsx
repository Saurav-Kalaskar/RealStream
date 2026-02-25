"use client";

import { Heart, MessageCircle, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { interactionService, commentService } from "@/lib/api";

interface ActionBarProps {
    videoId: string;
    youtubeId: string;
    initialLikes?: number;
    comments: number;
    shares: number;
    onLike?: () => boolean; // Updated signature: returns true if allowed, false if blocked (e.g. auth modal opened)
    onComment?: () => void;
}

export default function ActionBar({
    videoId,
    youtubeId,
    initialLikes = 0,
    comments,
    shares,
    onLike,
    onComment
}: ActionBarProps) {
    const queryClient = useQueryClient();

    // Fetch real like status
    const { data: likeStatus } = useQuery({
        queryKey: ["likes", videoId],
        queryFn: () => interactionService.getLikeStatus(videoId),
        initialData: { isLiked: false, likeCount: initialLikes }
    });

    // Fetch real comment count
    const { data: commentCount, isError, error } = useQuery({
        queryKey: ["commentCount", videoId],
        queryFn: async () => {
            const count = await commentService.getCommentCount(videoId);
            console.log("Fetched comment count for", videoId, ":", count);
            return count;
        },
        initialData: comments,
        staleTime: 0, // Force fetch immediately
    });

    if (isError) {
        console.error("Error fetching comment count:", error);
    }

    // Mutation for toggling like
    const { mutate: toggleLike } = useMutation({
        mutationFn: () => interactionService.toggleLike(videoId),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ["likes", videoId] });

            const previousStatus = queryClient.getQueryData(["likes", videoId]) as { isLiked: boolean; likeCount: number };

            queryClient.setQueryData(["likes", videoId], (old: { isLiked: boolean; likeCount: number }) => ({
                isLiked: !old.isLiked,
                likeCount: old.isLiked ? old.likeCount - 1 : old.likeCount + 1,
            }));

            return { previousStatus };
        },
        onError: (err, newTodo, context) => {
            if (context?.previousStatus) {
                queryClient.setQueryData(["likes", videoId], context.previousStatus);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["likes", videoId] });
        },
    });

    const handleLikeClick = () => {
        // If onLike is provided, we must pass its check.
        // In Home page, onLike returns false if user is NOT logged in (and opens modal).
        if (onLike) {
            const allowed = onLike();
            if (!allowed) return;
        }
        toggleLike();
    };

    const handleShare = async () => {
        const link = `https://www.youtube.com/shorts/${youtubeId}`;
        try {
            await navigator.clipboard.writeText(link);
            alert("Link copied to clipboard!");
        } catch (err) {
            console.error("Failed to copy link: ", err);
        }
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Like Button */}
            <div className="flex flex-col items-center gap-1">
                <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={handleLikeClick}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-md active:bg-white/20 transition-colors"
                >
                    <Heart
                        className={`w-8 h-8 ${likeStatus.isLiked ? "fill-red-500 text-red-500" : "text-white"}`}
                        strokeWidth={likeStatus.isLiked ? 0 : 2}
                    />
                </motion.button>
                <span className="text-white text-xs font-medium drop-shadow-md">{likeStatus.likeCount}</span>
            </div>

            {/* Comment Button */}
            <div className="flex flex-col items-center gap-1">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onComment}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-md active:bg-white/20 transition-colors"
                >
                    <MessageCircle className="w-8 h-8 text-white" />
                </motion.button>
                <span className="text-white text-xs font-medium drop-shadow-md">{commentCount}</span>
            </div>

            {/* Share Button */}
            <div className="flex flex-col items-center gap-1">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleShare}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-md active:bg-white/20 transition-colors"
                >
                    <Share2 className="w-8 h-8 text-white" />
                </motion.button>
                <span className="text-white text-xs font-medium drop-shadow-md">{shares}</span>
            </div>
        </div>
    );
}
