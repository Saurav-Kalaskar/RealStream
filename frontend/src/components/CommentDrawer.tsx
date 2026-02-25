"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentService } from "@/lib/api";

const CommentItem = ({ comment }: { comment: any }) => {
    const name = comment.displayName || "User";
    const initial = name[0]?.toUpperCase() || "?";

    return (
        <div className="flex gap-3">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-white/10">
                <div className="w-full h-full bg-gradient-to-tr from-neon-cyan to-neon-magenta flex items-center justify-center text-xs font-bold text-white">
                    {initial}
                </div>
            </div>

            <div className="flex-1 space-y-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-white/90">
                        {name}
                    </span>
                    <span className="text-xs text-white/40">
                        {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{comment.content}</p>
            </div>
        </div>
    );
};

interface CommentDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    videoId: string;
}

export default function CommentDrawer({ isOpen, onClose, videoId }: CommentDrawerProps) {
    const [newComment, setNewComment] = useState("");
    const queryClient = useQueryClient();

    const { data: comments, isLoading } = useQuery({
        queryKey: ["comments", videoId],
        queryFn: () => commentService.getComments(videoId),
        enabled: isOpen, // Only fetch when open
    });

    const { mutate: addComment, isPending: isPosting } = useMutation({
        mutationFn: () => commentService.addComment(videoId, newComment),
        onSuccess: () => {
            setNewComment("");
            queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
            queryClient.invalidateQueries({ queryKey: ["commentCount", videoId] });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        addComment();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute bottom-0 left-0 right-0 h-[70%] bg-surface rounded-t-3xl z-50 flex flex-col border-t border-white/10 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h3 className="text-white font-semibold text-lg">
                                {comments ? comments.length : 0} Comments
                            </h3>
                            <button onClick={onClose} className="p-2 text-white/70 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {isLoading ? (
                                <div className="text-center text-white/50 py-10">Loading comments...</div>
                            ) : comments?.length === 0 ? (
                                <div className="text-center text-white/50 py-10">No comments yet. Be the first!</div>
                            ) : (
                                comments?.map((comment) => (
                                    <CommentItem key={comment.id} comment={comment} />
                                ))
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-white/10 bg-surface">
                            <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 bg-white/5 text-white rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neon-cyan/50 placeholder:text-white/30"
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim() || isPosting}
                                    className="p-3 rounded-full bg-neon-magenta text-white disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
