"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function RedirectHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { checkUser } = useAuth(); // We need to expose checkUser or a generic 'setToken'

    useEffect(() => {
        const token = searchParams.get("token");
        if (token) {
            // Check if we are running inside a popup window
            if (window.opener && !window.opener.closed) {
                // Send the token back to the main application window
                window.opener.postMessage({ type: "OAUTH_SUCCESS", token }, window.location.origin);
                window.close(); // Close the popup
            } else {
                // Fallback for full-page redirect
                localStorage.setItem("token", token);
                // Force AuthContext to pick up the new token
                checkUser().then(() => {
                    router.push("/");
                });
            }
        } else {
            console.error("No token found in redirect");
            router.push("/");
        }
    }, [searchParams, router, checkUser]);

    return (
        <div className="flex min-h-screen bg-black items-center justify-center text-white">
            <div className="animate-pulse">Completing Login...</div>
        </div>
    );
}

export default function OAuth2Redirect() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RedirectHandler />
        </Suspense>
    );
}
