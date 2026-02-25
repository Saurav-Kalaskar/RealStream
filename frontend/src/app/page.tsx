"use client";

import CommentDrawer from "@/components/CommentDrawer";
import Onboarding from "@/components/Onboarding";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FeedPlayer from "@/components/FeedPlayer";
import VideoPlayer from "@/components/VideoPlayer";
import ActionBar from "@/components/ActionBar";
import VideoMetadata from "@/components/VideoMetadata";
import LoginModal from "@/components/LoginModal";
import UserProfile from "@/components/UserProfile";
import Header from "@/components/Header";


import { videoService, scraperService } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft } from "lucide-react";

function HomeContent() {
  const { user, login, logout } = useAuth();
  const queryClient = useQueryClient();

  // Session-persisted state
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [currentChannel, setCurrentChannel] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentDrawerVideoId, setCommentDrawerVideoId] = useState<string | null>(null);

  // Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Global Player State
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const [isGlobalPlaying, setIsGlobalPlaying] = useState(false);

  // Browser history: handle back button
  useEffect(() => {
    const handlePopState = () => {
      // When user presses browser back, return to onboarding
      setIsOnboarded(false);
      setCurrentTopic(null);
      setCurrentChannel(null);
      queryClient.resetQueries({ queryKey: ["videos"] });
      sessionStorage.removeItem("rs_onboarded");
      sessionStorage.removeItem("rs_topic");
      sessionStorage.removeItem("rs_channel");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [queryClient]);

  // Restore session on mount
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedOnboarded = sessionStorage.getItem("rs_onboarded");
      const savedTopic = sessionStorage.getItem("rs_topic");
      const savedChannel = sessionStorage.getItem("rs_channel");

      // Guardrail: Only restore if we have a valid topic OR channel
      if (savedOnboarded === "true" && (savedTopic || savedChannel)) {
        setIsOnboarded(true);
        // Push history so back button works even after session restore
        window.history.pushState({ view: "feed" }, "");
        if (savedChannel) {
          setCurrentChannel(savedChannel);
        } else {
          setCurrentTopic(savedTopic);
        }
      } else {
        // Invalid state, reset to onboarding
        sessionStorage.removeItem("rs_onboarded");
        setIsOnboarded(false);
      }
    }
  }, []);

  // Queries
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingVideos,
    error,
  } = useInfiniteQuery({
    queryKey: ["videos", currentTopic, currentChannel],
    queryFn: ({ pageParam }) => videoService.getVideos(pageParam as number, currentTopic || undefined, currentChannel || undefined),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.last) return undefined;
      return lastPage.number + 1;
    },
    enabled: isOnboarded,
  });

  // Auto-fetch related videos when the primary feed runs out
  const relatedFetchedRef = useRef(false);
  const lastPage = data?.pages[data.pages.length - 1];
  useEffect(() => {
    if (
      lastPage?.last &&
      !relatedFetchedRef.current &&
      (currentTopic || currentChannel)
    ) {
      relatedFetchedRef.current = true;
      console.log("Primary feed ended, fetching related videos...");
      scraperService
        .scrapeRelated(currentTopic || currentChannel || "", currentChannel || undefined)
        .then((result) => {
          console.log("Related videos fetched:", result.count, "Related keywords:", result.relatedKeywords);
          // Invalidate to pick up the newly saved related videos
          queryClient.invalidateQueries({ queryKey: ["videos"] });
        })
        .catch((err) => console.error("Failed to fetch related videos:", err));
    }
  }, [lastPage?.last, currentTopic, currentChannel, queryClient]);

  // Flatten pages into a single array of videos
  const videos = data?.pages.flatMap((page) => page.content) || [];
  const filteredVideos = videos;

  // Mutations
  const { mutate: startWatching, isPending: isScraping } = useMutation({
    mutationFn: async ({ topic, channel }: { topic: string; channel?: string }) => {
      if (channel) {
        setCurrentChannel(channel);
        setCurrentTopic(""); // Clear topic if channel search
      } else {
        setCurrentTopic(topic);
        setCurrentChannel(""); // Clear channel if topic search
      }
      const result = await scraperService.scrape(topic, channel);
      // Wait for scrape to finish and populate content (mock delay)
      await new Promise(resolve => setTimeout(resolve, 2000));
      return result;
    },
    onSuccess: (data, variables) => {
      relatedFetchedRef.current = false; // Reset so related videos can be fetched for new topic
      queryClient.resetQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      setIsOnboarded(true);
      sessionStorage.setItem("rs_onboarded", "true");

      // Push browser history so back button returns to search
      window.history.pushState({ view: "feed" }, "");

      if (variables.channel) {
        const canonicalChannel = (data?.videos && data.videos.length > 0 && data.videos[0].channelTitle)
          ? data.videos[0].channelTitle
          : variables.channel || "";

        setCurrentChannel(canonicalChannel);
        sessionStorage.setItem("rs_channel", canonicalChannel);
        sessionStorage.removeItem("rs_topic");
      } else {
        sessionStorage.setItem("rs_topic", variables.topic);
        sessionStorage.removeItem("rs_channel");
      }
    },
    onError: (err) => {
      console.error("Scrape failed", err);
      setIsOnboarded(true);
      sessionStorage.setItem("rs_onboarded", "true");
    }
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  // Robust infinite scroll: Fetch next page when we get within 3 videos of the end
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (filteredVideos.length > 0 && activeIndex >= filteredVideos.length - 3) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  }, [activeIndex, filteredVideos.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleInteractionAttempt = () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return false;
    }
    return true;
  };

  const handleNewSearch = () => {
    setIsOnboarded(false);
    setCurrentTopic(null);
    setCurrentChannel(null);
    queryClient.resetQueries({ queryKey: ["videos"] });
    sessionStorage.removeItem("rs_onboarded");
    sessionStorage.removeItem("rs_topic");
    sessionStorage.removeItem("rs_channel");
  };

  const handleProfileLogout = () => {
    logout();
    setIsProfileOpen(false);
  };

  // 1. Onboarding View
  if (!isOnboarded) {
    return (
      <div className="flex flex-col min-h-screen w-full relative overflow-x-hidden">

        <Header
          user={user}
          onLogin={() => setIsLoginModalOpen(true)}
          onLogout={handleProfileLogout}
          onNewSearch={handleNewSearch}
          onProfileClick={() => setIsProfileOpen(true)}
          topic="Browse"
        />
        <Onboarding
          onStart={(topic, channel) => startWatching({ topic, channel })}
          isLoading={isScraping}
          onLogin={() => setIsLoginModalOpen(true)}
          onLogout={logout}
          user={user}
        />
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
        {isProfileOpen && (
          <UserProfile
            user={user}
            onClose={() => setIsProfileOpen(false)}
            onLogout={handleProfileLogout}
          />
        )}
      </div>
    );
  }

  // 2. Loading State
  if (isLoadingVideos) return <div className="flex h-screen items-center justify-center text-white font-bold animate-pulse">Curating your personalized feed...</div>;

  // 3. Error State
  if (error) return <div className="flex h-screen items-center justify-center text-red-500">Error loading feed. Is the backend running?</div>;

  // 4. Empty State
  if (!filteredVideos || filteredVideos.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-white gap-4">
        <p className="text-xl font-bold">No videos found for &quot;{currentChannel ? `@${currentChannel}` : currentTopic}&quot;</p>
        <p className="text-white/60">Try checking your spelling or picking a broader topic.</p>
        <button
          onClick={handleNewSearch}
          className="text-neon-cyan hover:underline mt-4"
        >
          Try another topic
        </button>
      </div>
    );
  }

  // 5. Main Layout
  return (
    <div className="relative z-10 flex flex-col h-[100dvh] overflow-hidden">

      <Header
        user={user}
        onLogin={login}
        onLogout={logout}
        onNewSearch={handleNewSearch}
        onProfileClick={() => setIsProfileOpen(true)}
        topic={currentTopic}
        channel={currentChannel}
      />

      <main className="flex-grow flex items-center justify-center pointer-events-none relative w-full overflow-hidden">

        {/* Pointer events none on container so clicks pass through to background if needed, but auto on content */}
        <div
          className="pointer-events-auto relative w-full h-full md:w-[480px] md:h-[85vh] md:max-h-[960px] md:rounded-2xl bg-transparent border border-white/10 shadow-2xl overflow-hidden z-10 md:pb-0"
        >
          {/* Single FeedPlayer in the background — one instance for all screen sizes */}
          <div className="absolute inset-0 z-0">
            <FeedPlayer
              videoId={filteredVideos[activeIndex]?.videoId || null}
              isMuted={isGlobalMuted}
              onPlayingChange={setIsGlobalPlaying}
            />
          </div>
          {/* Scrollable Content Area */}
          <div
            className="w-full h-full overflow-y-scroll snap-y snap-mandatory focus:outline-none no-scrollbar"
            onScroll={handleScroll}
          >
            {/* Onboarding Overlay Hint */}
            {activeIndex === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div className="bg-black/50 backdrop-blur-md px-6 py-3 rounded-full text-white font-medium animate-pulse">
                  Swipe up for more
                </div>
              </div>
            )}

            {filteredVideos.map((video, index) => (
              <div key={`${video.id}-${index}`} className="w-full h-full snap-start relative bg-transparent">
                <VideoPlayer
                  isActive={index === activeIndex}
                  isPlaying={index === activeIndex ? isGlobalPlaying : false}
                  isMuted={isGlobalMuted}
                  onToggleMute={(e) => {
                    e.stopPropagation();
                    setIsGlobalMuted(!isGlobalMuted);
                  }}
                />

                <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-end pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
                  <div className="flex flex-row items-end justify-between w-full pointer-events-auto">
                    <VideoMetadata
                      username={video.channelTitle || "@creator"}
                      caption={video.title}
                      hashtags={video.hashtags || []}
                    />

                    <ActionBar
                      videoId={video.id}
                      youtubeId={video.videoId}
                      initialLikes={0}
                      comments={0}
                      shares={0}
                      onLike={() => handleInteractionAttempt()}
                      onComment={() => {
                        if (handleInteractionAttempt()) {
                          setCommentDrawerVideoId(video.id);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Loading spinner only while fetching next page */}
            {isFetchingNextPage && (
              <div className="w-full h-20 flex items-center justify-center snap-start text-white/50 text-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neon-cyan"></div>
              </div>
            )}
          </div>

          {commentDrawerVideoId && (
            <CommentDrawer
              isOpen={!!commentDrawerVideoId}
              onClose={() => setCommentDrawerVideoId(null)}
              videoId={commentDrawerVideoId}
            />
          )}
        </div>
      </main>



      {/* Allow Login Modal to open on top of everything */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* User Profile Modal */}
      {isProfileOpen && (
        <UserProfile
          user={user}
          onClose={() => setIsProfileOpen(false)}
          onLogout={handleProfileLogout}
        />
      )}
    </div>
  );
}

export default function Home() {
  return <HomeContent />;
}
