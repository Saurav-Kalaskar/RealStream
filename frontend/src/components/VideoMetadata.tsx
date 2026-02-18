"use client";

interface VideoMetadataProps {
    username: string;
    caption: string;
    hashtags: string[];
}

export default function VideoMetadata({ username, caption, hashtags }: VideoMetadataProps) {
    return (
        <div className="flex flex-col items-start gap-2 text-white max-w-[80%]">
            <h3 className="text-lg font-bold drop-shadow-md">@{username}</h3>
            <p className="text-sm drop-shadow-sm line-clamp-2">{caption}</p>
            <div className="flex flex-wrap gap-2 text-sm font-semibold text-white/90">
                {hashtags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                ))}
            </div>
        </div>
    );
}
