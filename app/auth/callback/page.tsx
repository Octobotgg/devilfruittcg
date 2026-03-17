"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { ACCOUNT_PASSWORD_RECOVERY_PATH, AUTH_CALLBACK_PATH, getAuthCallbackUrl, normalizeAuthNextPath } from "@/lib/cloud/auth-redirect";
import { buildLoginUrl } from "@/lib/cloud/pending-auth-action";
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/cloud/supabase";

type CallbackState = {
  status: "loading" | "success" | "error";
  title: string;
  description: string;
  detail?: string | null;
};

const DEFAULT_STATE: CallbackState = {
  status: "loading",
  title: "Verifying your sign-in",
  description: "Checking your secure account handoff and preparing your DevilFruitTCG session.",
  detail: null,
};

const CONFIG_ERROR_STATE: CallbackState = {
  status: "error",
  title: "Account service is offline",
  description: "Supabase is not configured for this environment yet, so the email link cannot finish sign-in.",
  detail: null,
};

const ERROR_COPY: Record<string, Pick<CallbackState, "title" | "description">> = {
  otp_expired: {
    title: "That sign-in link expired",
    description: "Email links are one-time use and expire after about one hour. Request a fresh email and open the newest link only.",
  },
  access_denied: {
    title: "That sign-in link is no longer valid",
    description: "The handoff was denied before a session could be created. The usual causes are an older email, an already-used link, or an expired token.",
  },
};

function decodeMessage(value: string | null) {
  if (!value) return null;
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function readHashParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
}

function clearAuthUrlNoise() {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, document.title, AUTH_CALLBACK_PATH);
}

function AuthCallbackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>(() => (hasSupabaseConfig() ? DEFAULT_STATE : CONFIG_ERROR_STATE));

  const requestedNext = useMemo(() => normalizeAuthNextPath(searchParams.get("next")), [searchParams]);
  const trustedDestination = useMemo(() => getAuthCallbackUrl(), []);
  const retryHref = useMemo(() => buildLoginUrl(requestedNext), [requestedNext]);

  useEffect(() => {
    if (!hasSupabaseConfig()) return;

    const sb = getSupabaseClient();
    const hashParams = readHashParams();
    const rawErrorCode = searchParams.get("error_code") || hashParams.get("error_code");
    const rawError = searchParams.get("error") || hashParams.get("error");
    const rawDescription = searchParams.get("error_description") || hashParams.get("error_description");
    const authCode = searchParams.get("code");
    const flowType = searchParams.get("type") || hashParams.get("type");
    const detail = decodeMessage(rawDescription);
    const problem = rawErrorCode || rawError;

    let cancelled = false;
    let redirected = false;
    let recoveryFlow = flowType === "recovery";

    const succeed = () => {
      if (cancelled || redirected) return;
      redirected = true;
      const nextRoute = recoveryFlow ? ACCOUNT_PASSWORD_RECOVERY_PATH : requestedNext;
      setState({
        status: "success",
        title: recoveryFlow ? "Recovery link accepted" : "Boarding complete",
        description: recoveryFlow
          ? "Your reset link checked out. Sending you to a secure password form now."
          : "Your secure link checked out. Sending you into your DevilFruitTCG account now.",
        detail: null,
      });
      clearAuthUrlNoise();
      window.setTimeout(() => {
        router.replace(nextRoute);
      }, 450);
    };

    const fail = (errorKey: string | null, fallbackDescription: string) => {
      if (cancelled || redirected) return;
      const copy = (errorKey && ERROR_COPY[errorKey]) || ERROR_COPY.access_denied;
      setState({
        status: "error",
        title: copy.title,
        description: errorKey ? copy.description : fallbackDescription,
        detail,
      });
      clearAuthUrlNoise();
    };

    if (problem) {
      fail(rawErrorCode || rawError, "We could not finish the account handoff request.");
      return;
    }

    const authPayloadPresent =
      hashParams.has("access_token") ||
      hashParams.has("refresh_token") ||
      Boolean(authCode) ||
      searchParams.has("token_hash");

    const { data: authListener } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryFlow = true;
      }
      if (session?.user) {
        succeed();
      }
    });

    void (async () => {
      if (authCode) {
        const { error } = await sb.auth.exchangeCodeForSession(authCode);

        if (cancelled) return;

        if (error) {
          setState({
            status: "error",
            title: "We could not finish sign-in",
            description: "The Google account handoff did not complete successfully.",
            detail: error.message,
          });
          clearAuthUrlNoise();
          return;
        }
      }

      const attempts = authPayloadPresent ? 8 : 3;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const { data, error } = await sb.auth.getSession();

        if (cancelled) return;

        if (error) {
          setState({
            status: "error",
            title: "We could not finish sign-in",
            description: "Supabase returned an auth error while checking your session.",
            detail: error.message,
          });
          clearAuthUrlNoise();
          return;
        }

        if (data.session?.user) {
          succeed();
          return;
        }

        if (attempt < attempts - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
      }

      setState({
        status: "error",
        title: "We could not finish sign-in",
        description: "Request a fresh email link and open the newest message from DevilFruitTCG.",
        detail: "If a link sends you to localhost instead of this site, the Supabase Auth URL configuration still needs to be updated.",
      });
      clearAuthUrlNoise();
    })();

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [requestedNext, router, searchParams]);

  const Icon = state.status === "success" ? CheckCircle2 : state.status === "error" ? AlertTriangle : Loader2;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <section className="journal-surface treasure-chart-surface rounded-[2rem] p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(10,10,10,0.56)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-accent-2)]">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure account handoff
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <BrandMark className="brand-lockup-large" subtitle="DEVILFRUITTCG ACCOUNT ACCESS" />
          <div className="brand-proof-chip">
            <span className="brand-proof-label">Trusted path</span>
            <span className="brand-proof-value">{trustedDestination.replace(/^https?:\/\//, "")}</span>
          </div>
        </div>

        <div className="mt-7 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="max-w-2xl text-4xl font-black leading-[0.92] text-white md:text-6xl">{state.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] md:text-base">
              {state.description}
            </p>
            {state.detail ? <p className="mt-3 max-w-2xl text-sm text-white/55">{state.detail}</p> : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="brand-stat-panel">
                <p className="brand-stat-label brand-stat-header">
                  <Mail className="h-3.5 w-3.5" />
                  Auth flow
                </p>
                <p className="mt-1 text-sm font-black text-white">Google, email link, or recovery</p>
              </div>
              <div className="brand-stat-panel">
                <p className="brand-stat-label brand-stat-header">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Expiry
                </p>
                <p className="mt-1 text-sm font-black text-white">About 1 hour</p>
              </div>
              <div className="brand-stat-panel">
                <p className="brand-stat-label brand-stat-header">
                  <Icon className={`h-3.5 w-3.5${state.status === "loading" ? " animate-spin" : ""}`} />
                  Status
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  {state.status === "loading" ? "Checking session" : state.status === "success" ? "Session ready" : "Needs a new link"}
                </p>
              </div>
            </div>
          </div>

          <div className="captains-bento-card space-y-4">
            {state.status === "loading" ? (
              <>
                <div>
                  <p className="text-lg font-black text-white">Hold for a second</p>
                  <p className="mt-1 text-sm text-white/60">
                    DevilFruitTCG is validating your sign-in and attaching your account session.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                  If this takes more than a couple of seconds, the handoff may have expired before the session was created.
                </div>
              </>
            ) : state.status === "success" ? (
              <>
                <div>
                  <p className="text-lg font-black text-white">Session accepted</p>
                  <p className="mt-1 text-sm text-white/60">
                    Your decks, collection, watchlist, and future account tools will be available after the redirect.
                  </p>
                </div>
                <Link
                  href={requestedNext}
                  className="luxury-action inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-[var(--obsidian-soft)]"
                >
                  Continue
                </Link>
              </>
            ) : (
              <>
                <div>
                  <p className="text-lg font-black text-white">Request a new secure link</p>
                  <p className="mt-1 text-sm text-white/60">
                    Use the newest email only. Older boarding links are invalid as soon as a newer one is issued.
                  </p>
                </div>
                <Link
                  href={retryHref}
                  className="luxury-action inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-[var(--obsidian-soft)]"
                >
                  Send Another Link
                </Link>
                <div className="rounded-2xl border border-[rgba(212,175,55,0.18)] bg-black/20 p-4 text-xs leading-relaxed text-white/55">
                  Official DevilFruitTCG sign-in links should land on this site&apos;s <span className="font-bold text-white/70">{AUTH_CALLBACK_PATH}</span> route,
                  not on an unrelated `localhost` address.
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl space-y-8 pb-16">
          <section className="journal-surface treasure-chart-surface rounded-[2rem] p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,175,55,0.28)] bg-[rgba(10,10,10,0.56)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-accent-2)]">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure account handoff
            </div>
            <div className="mt-6 flex items-center gap-3 text-white/60">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading account callback...
            </div>
          </section>
        </div>
      }
    >
      <AuthCallbackPageContent />
    </Suspense>
  );
}
