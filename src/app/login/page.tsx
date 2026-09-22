"use client";

import { signIn, useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "This Google account isn't on the household's allowed list. Ask whoever manages the dashboard to add your email to ALLOWED_USERS.",
  Configuration: "The server is misconfigured. Check the Google OAuth and ALLOWED_USERS environment variables.",
};

function LoginCard() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  return (
    <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-brand-100 p-8 text-center">
      <div className="text-4xl mb-2">🏠</div>
      <h1 className="text-xl font-semibold text-brand-900 mb-1">House Management</h1>
      <p className="text-sm text-brand-600 mb-6">Sign in with Google to view the household's schedule and chores.</p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3 mb-4">
          {ERROR_MESSAGES[error] ?? "Something went wrong signing you in."}
        </p>
      )}

      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand-300 bg-white px-4 py-2.5 text-sm font-medium text-brand-800 hover:bg-brand-50 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.3 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.4C41.4 36.4 44 30.7 44 24c0-1.2-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </button>

      <p className="text-xs text-brand-400 mt-6">
        Only Google accounts on the household's allowed list can sign in.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
