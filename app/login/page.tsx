"use client";

import { Suspense, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { getAuthCallbackUrl, getPasswordRecoveryUrl, normalizeAuthNextPath } from "@/lib/cloud/auth-redirect";
import { describeAuthPromptReason } from "@/lib/cloud/pending-auth-action";
import { useCloudSync } from "@/lib/cloud/useCloudSync";

type AuthMode = "signin" | "create";
type SubmitState = null | "google" | "password" | "signup" | "magic" | "reset";
type NoticeTone = "error" | "success";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
};

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        fill="#EA4335"
        d="M12.24 10.285v3.821h5.445c-.229 1.232-.929 2.276-1.982 2.977l3.205 2.488c1.867-1.72 2.942-4.253 2.942-7.286 0-.697-.063-1.366-.178-2H12.24z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.964-.896 6.618-2.429l-3.205-2.488c-.891.597-2.032.949-3.413.949-2.622 0-4.844-1.771-5.637-4.152H3.054v2.61A9.998 9.998 0 0 0 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.363 13.88A5.996 5.996 0 0 1 6.048 12c0-.652.112-1.285.315-1.88V7.51H3.054A9.998 9.998 0 0 0 2 12c0 1.61.385 3.13 1.054 4.49l3.309-2.61z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.968c1.469 0 2.787.505 3.826 1.496l2.868-2.868C16.959 2.982 14.696 2 12 2A9.998 9.998 0 0 0 3.054 7.51l3.309 2.61C7.156 7.739 9.378 5.968 12 5.968z"
      />
    </svg>
  );
}

function PasswordField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  visible,
  onChange,
  onToggle,
}: PasswordFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--auth-label)]">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-2xl border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-4 py-3.5 pr-12 text-sm text-[var(--auth-text)] outline-none transition-all duration-200 placeholder:text-[var(--auth-placeholder)] focus:border-[var(--auth-focus)] focus:shadow-[0_0_0_4px_var(--auth-focus-ring)]"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-[var(--auth-icon)] transition-colors hover:text-[var(--auth-text)]"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function describeAuthError(authError: unknown) {
  const message = authError instanceof Error ? authError.message : "Authentication request failed.";
  const normalized = message.toLowerCase();

  if (normalized.includes("provider") && normalized.includes("enable")) {
    return "Google sign-in is not fully enabled yet.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirm your email first, then sign in with your password.";
  }
  if (normalized.includes("user already registered")) {
    return "That email already has an account. Sign in instead or use the magic-link option.";
  }
  return message;
}

function getNoticeClasses(tone: NoticeTone) {
  return tone === "error"
    ? "rounded-2xl border border-[#d67c6d]/45 bg-[rgba(246,219,214,0.88)] px-4 py-3 text-sm text-[#8f2f2c]"
    : "rounded-2xl border border-[#9cc58f]/45 bg-[rgba(233,244,229,0.92)] px-4 py-3 text-sm text-[#27523a]";
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready, signIn, signUp, sendPasswordReset, hasCloud } = useCloudSync();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState<SubmitState>(null);
  const [notice, setNotice] = useState<{ tone: NoticeTone; message: string } | null>(null);

  const recoveryDestination = useMemo(() => getPasswordRecoveryUrl(), []);
  const postAuthDestination = useMemo(
    () => normalizeAuthNextPath(searchParams.get("next")),
    [searchParams],
  );
  const gatedActionMessage = useMemo(
    () => describeAuthPromptReason(searchParams.get("reason")),
    [searchParams],
  );
  const themeVars = useMemo(
    () =>
      ({
        "--auth-card-border": "rgba(212,160,84,0.26)",
        "--auth-card-bg": "rgba(245, 239, 227, 0.96)",
        "--auth-gold": "#d4a054",
        "--auth-gold-soft": "rgba(212,160,84,0.14)",
        "--auth-sunset-soft": "rgba(209,91,58,0.12)",
        "--auth-text": "#22304a",
        "--auth-label": "rgba(72, 58, 38, 0.68)",
        "--auth-input-bg": "rgba(255, 252, 246, 0.96)",
        "--auth-input-border": "rgba(212,160,84,0.22)",
        "--auth-placeholder": "rgba(72, 58, 38, 0.34)",
        "--auth-focus": "rgba(212,160,84,0.9)",
        "--auth-focus-ring": "rgba(212,160,84,0.16)",
        "--auth-icon": "rgba(72, 58, 38, 0.45)",
        "--obsidian-soft": "#22304a",
      }) as CSSProperties,
    [],
  );

  function resetNotice() {
    setNotice(null);
  }

  function validateEmail(value: string) {
    return value.trim().includes("@");
  }

  function clearSecrets() {
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setForgotOpen(false);
    resetNotice();
  }

  async function handleGoogleSignIn() {
    setSubmitting("google");
    resetNotice();

    try {
      await signIn({ provider: "google", redirectTo: getAuthCallbackUrl(postAuthDestination) });
    } catch (authError) {
      setNotice({ tone: "error", message: describeAuthError(authError) });
      setSubmitting(null);
    }
  }

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) {
      setNotice({ tone: "error", message: "Enter a valid email address." });
      return;
    }
    if (!password) {
      setNotice({ tone: "error", message: "Password is required." });
      return;
    }

    setSubmitting("password");
    resetNotice();

    try {
      await signIn({ strategy: "password", email: trimmedEmail, password });
      clearSecrets();
      router.replace(postAuthDestination);
    } catch (authError) {
      setNotice({ tone: "error", message: describeAuthError(authError) });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setNotice({ tone: "error", message: "Full name is required." });
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setNotice({ tone: "error", message: "Enter a valid email address." });
      return;
    }
    if (password.length < 8) {
      setNotice({ tone: "error", message: "Use at least 8 characters for the password." });
      return;
    }
    if (password !== confirmPassword) {
      setNotice({ tone: "error", message: "Password and confirmation do not match." });
      return;
    }

    setSubmitting("signup");
    resetNotice();

    try {
      const result = await signUp({
        fullName: trimmedName,
        email: trimmedEmail,
        password,
        redirectTo: getAuthCallbackUrl(postAuthDestination),
      });
      clearSecrets();

      if (result?.needsEmailConfirmation ?? true) {
        setNotice({
          tone: "success",
          message: `Account created for ${trimmedName}. Confirm the email sent to ${trimmedEmail} before your first password login.`,
        });
        setMode("signin");
        return;
      }

      router.replace(postAuthDestination);
    } catch (authError) {
      setNotice({ tone: "error", message: describeAuthError(authError) });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleMagicLink() {
    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) {
      setNotice({ tone: "error", message: "Enter your email first to receive a magic link." });
      return;
    }

    setSubmitting("magic");
    resetNotice();

    try {
      await signIn({ strategy: "magic_link", email: trimmedEmail, redirectTo: getAuthCallbackUrl(postAuthDestination) });
      clearSecrets();
      setNotice({
        tone: "success",
        message: `Secure boarding link sent to ${trimmedEmail}. Use the newest message only.`,
      });
    } catch (authError) {
      setNotice({ tone: "error", message: describeAuthError(authError) });
    } finally {
      setSubmitting(null);
    }
  }

  async function handlePasswordReset() {
    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) {
      setNotice({ tone: "error", message: "Enter your account email first." });
      return;
    }

    setSubmitting("reset");
    resetNotice();

    try {
      await sendPasswordReset({ email: trimmedEmail, redirectTo: getPasswordRecoveryUrl() });
      clearSecrets();
      setNotice({
        tone: "success",
        message: `Reset instructions sent to ${trimmedEmail}. The link will return to DevilFruitTCG so you can set a new password.`,
      });
      setForgotOpen(false);
    } catch (authError) {
      setNotice({ tone: "error", message: describeAuthError(authError) });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div style={themeVars} className="relative isolate overflow-hidden pb-16 pt-6 md:pb-24 md:pt-12">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(212,160,84,0.18),transparent_34%),radial-gradient(circle_at_80%_18%,rgba(209,91,58,0.14),transparent_22%),linear-gradient(180deg,#fbf6ea_0%,#f6efe0_46%,#f2e8d4_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(rgba(212,160,84,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(212,160,84,0.08)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.34),transparent_58%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[32rem] rounded-[2rem] border border-[var(--auth-card-border)] bg-[var(--auth-card-bg)] p-4 shadow-[0_28px_90px_rgba(141,102,41,0.14)] backdrop-blur-xl sm:p-6"
        >
          <div className="relative overflow-hidden rounded-[1.65rem] border border-[rgba(212,160,84,0.16)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(245,239,227,0.96))] p-5 sm:p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(212,160,84,0.18),transparent_62%)] opacity-90" />
            <div className="pointer-events-none absolute -right-12 top-8 h-28 w-28 rounded-full bg-[var(--auth-sunset-soft)] blur-3xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-[var(--auth-gold-soft)] blur-3xl" />

            {ready && user ? (
              <div className="relative space-y-5">
                <BrandMark className="brand-lockup-compact" subtitle="ACCOUNT ACCESS READY" compact />
                <div className="rounded-[1.5rem] border border-[rgba(212,160,84,0.18)] bg-[rgba(255,252,246,0.9)] p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--auth-gold)]">Signed in</p>
                  <p className="mt-3 text-2xl font-black text-[var(--auth-text)]">{user.fullName || user.email || "DevilFruitTCG account"}</p>
                  {user.email ? <p className="mt-1 text-sm text-[rgba(72,58,38,0.62)]">{user.email}</p> : null}
                  <p className="mt-4 text-sm leading-relaxed text-[rgba(72,58,38,0.72)]">
                    {gatedActionMessage
                      ? "Your account is already active. Continue back and DevilFruitTCG will finish the save for you."
                      : "Your account is already active. Continue into your saved decks, collection, watchlist, and account tools."}
                  </p>
                </div>
                <Link
                  href={postAuthDestination}
                  className="luxury-action inline-flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-black text-[var(--obsidian-soft)]"
                >
                  {gatedActionMessage ? "Return To Save" : "Open My Account"}
                </Link>
              </div>
            ) : !hasCloud ? (
              <div className="relative space-y-4">
                <BrandMark className="brand-lockup-compact" subtitle="AUTH SERVICE OFFLINE" compact />
                <div className="rounded-[1.5rem] border border-[rgba(212,160,84,0.18)] bg-[rgba(255,252,246,0.9)] p-5 text-sm leading-relaxed text-[rgba(72,58,38,0.72)]">
                  Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to enable live sign-in on this environment.
                </div>
              </div>
            ) : (
              <div className="relative space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,160,84,0.24)] bg-[rgba(255,248,233,0.9)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--auth-gold)]">
                      <ShieldCheck className="h-3.5 w-3.5" /> Secure account access
                    </div>
                    <BrandMark className="brand-lockup-compact" compact />
                  </div>
                </div>

                <div>
                  <h1 className="text-3xl font-black tracking-[-0.04em] text-[var(--auth-text)] sm:text-[2.4rem]">
                    {mode === "signin" ? "Sign in to your DevilFruitTCG vault." : "Create a DevilFruitTCG account."}
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-[rgba(72,58,38,0.76)]">
                    {mode === "signin"
                      ? "A centered, no-noise account entry: Google up top, password beneath it, magic link if you want to skip the password entirely."
                      : "Use your real name and email so account saves, deck tools, and future premium features stay tied to the right collector profile."}
                  </p>
                </div>

                {gatedActionMessage ? (
                  <div className="rounded-2xl border border-[rgba(212,160,84,0.24)] bg-[rgba(255,244,222,0.92)] px-4 py-3 text-sm text-[var(--auth-text)]">
                    {gatedActionMessage}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2 rounded-[1.25rem] border border-[rgba(212,160,84,0.14)] bg-[rgba(250,245,236,0.88)] p-1.5">
                  {(["signin", "create"] as const).map((nextMode) => {
                    const active = mode === nextMode;
                    return (
                      <button
                        key={nextMode}
                        type="button"
                        onClick={() => switchMode(nextMode)}
                        className={
                          active
                            ? "rounded-[1rem] border border-[rgba(212,160,84,0.3)] bg-[rgba(255,244,222,0.92)] px-4 py-2.5 text-sm font-black text-[var(--auth-gold)]"
                            : "rounded-[1rem] border border-transparent px-4 py-2.5 text-sm font-black text-[rgba(72,58,38,0.52)] transition-colors hover:text-[var(--auth-text)]"
                        }
                      >
                        {nextMode === "signin" ? "Sign In" : "Create Account"}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-[1.4rem] border border-[rgba(212,160,84,0.16)] bg-[rgba(255,252,246,0.9)] p-3">
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        void handleGoogleSignIn();
                      }}
                      disabled={submitting !== null}
                      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-[rgba(34,48,74,0.1)] bg-white px-5 py-3.5 text-sm font-black text-[#22304a] transition-colors hover:bg-[#fff8ef] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <GoogleGlyph />
                      <span>{submitting === "google" ? "Redirecting to Google..." : mode === "signin" ? "Continue With Google" : "Create Account With Google"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[rgba(212,160,84,0.18)]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[rgba(72,58,38,0.34)]">or</span>
                  <div className="h-px flex-1 bg-[rgba(212,160,84,0.18)]" />
                </div>

                {notice ? <div className={getNoticeClasses(notice.tone)}>{notice.message}</div> : null}

                {mode === "signin" ? (
                  <form className="space-y-3" onSubmit={handlePasswordSignIn}>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--auth-label)]">Email</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="captain@example.com"
                        autoComplete="email"
                        className="w-full rounded-2xl border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-4 py-3.5 text-sm text-[var(--auth-text)] outline-none transition-all duration-200 placeholder:text-[var(--auth-placeholder)] focus:border-[var(--auth-focus)] focus:shadow-[0_0_0_4px_var(--auth-focus-ring)]"
                      />
                    </label>

                    <PasswordField
                      id="signin-password"
                      label="Password"
                      value={password}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      visible={showPassword}
                      onChange={setPassword}
                      onToggle={() => setShowPassword((value) => !value)}
                    />

                    <div className="flex items-center justify-between gap-3 text-xs text-[rgba(72,58,38,0.48)]">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,160,84,0.18)] bg-[rgba(255,248,233,0.86)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[rgba(72,58,38,0.54)]">
                        <Sparkles className="h-3 w-3" /> Password or magic link
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotOpen((value) => !value);
                          resetNotice();
                        }}
                        className="font-black text-[var(--auth-gold)] transition-colors hover:text-[var(--auth-text)]"
                      >
                        {forgotOpen ? "Never mind" : "Forgot password?"}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting !== null}
                      className="luxury-action inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-[var(--obsidian-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>{submitting === "password" ? "Signing In..." : "Sign In"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    {forgotOpen ? (
                      <div className="rounded-[1.35rem] border border-[rgba(212,175,55,0.16)] bg-[rgba(212,175,55,0.06)] p-4">
                        <p className="text-sm font-black text-[var(--auth-text)]">Send password reset</p>
                        <p className="mt-1 text-xs leading-relaxed text-[rgba(72,58,38,0.68)]">
                          We&apos;ll send a secure recovery email to {recoveryDestination.replace(/^https?:\/\//, "")}. It opens a password form inside DevilFruitTCG.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void handlePasswordReset();
                          }}
                          disabled={submitting !== null}
                          className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[rgba(212,160,84,0.22)] bg-transparent px-5 py-3 text-sm font-black text-[var(--auth-gold)] transition-colors hover:bg-[rgba(212,160,84,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {submitting === "reset" ? "Sending Reset..." : "Send Password Reset"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          void handleMagicLink();
                        }}
                        disabled={submitting !== null}
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-[rgba(212,160,84,0.22)] bg-transparent px-5 py-3 text-sm font-black text-[rgba(72,58,38,0.76)] transition-colors hover:border-[rgba(212,160,84,0.3)] hover:bg-[rgba(212,160,84,0.05)] hover:text-[var(--auth-text)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting === "magic" ? "Sending Magic Link..." : "Sign In With Magic Link"}
                      </button>
                    )}
                  </form>
                ) : (
                  <form className="space-y-3" onSubmit={handleCreateAccount}>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--auth-label)]">Full Name</span>
                      <div className="relative">
                        <input
                          type="text"
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          placeholder="Monkey D. Collector"
                          autoComplete="name"
                          className="w-full rounded-2xl border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-4 py-3.5 pl-11 text-sm text-[var(--auth-text)] outline-none transition-all duration-200 placeholder:text-[var(--auth-placeholder)] focus:border-[var(--auth-focus)] focus:shadow-[0_0_0_4px_var(--auth-focus-ring)]"
                        />
                        <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--auth-icon)]" />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-[var(--auth-label)]">Email</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="captain@example.com"
                        autoComplete="email"
                        className="w-full rounded-2xl border border-[var(--auth-input-border)] bg-[var(--auth-input-bg)] px-4 py-3.5 text-sm text-[var(--auth-text)] outline-none transition-all duration-200 placeholder:text-[var(--auth-placeholder)] focus:border-[var(--auth-focus)] focus:shadow-[0_0_0_4px_var(--auth-focus-ring)]"
                      />
                    </label>

                    <PasswordField
                      id="signup-password"
                      label="Password"
                      value={password}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      visible={showPassword}
                      onChange={setPassword}
                      onToggle={() => setShowPassword((value) => !value)}
                    />

                    <PasswordField
                      id="signup-confirm-password"
                      label="Confirm Password"
                      value={confirmPassword}
                      placeholder="Repeat the password"
                      autoComplete="new-password"
                      visible={showConfirmPassword}
                      onChange={setConfirmPassword}
                      onToggle={() => setShowConfirmPassword((value) => !value)}
                    />

                    <p className="rounded-2xl border border-[rgba(212,160,84,0.16)] bg-[rgba(255,248,233,0.9)] px-4 py-3 text-xs leading-relaxed text-[rgba(72,58,38,0.7)]">
                      New password accounts require email confirmation before the first direct password login.
                    </p>

                    <button
                      type="submit"
                      disabled={submitting !== null}
                      className="luxury-action inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-[var(--obsidian-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>{submitting === "signup" ? "Creating Account..." : "Create Account"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <p className="text-center text-xs leading-relaxed text-[rgba(72,58,38,0.62)]">
                      Prefer not to create a password? Switch back to <button type="button" onClick={() => switchMode("signin")} className="font-black text-[var(--auth-gold)]">Sign In</button> and use the magic-link option.
                    </p>
                  </form>
                )}

                <div className="border-t border-[rgba(212,160,84,0.14)] pt-4 text-center text-xs leading-relaxed text-[rgba(72,58,38,0.5)]">
                  By continuing, you agree to the <Link href="/terms" className="font-black text-[rgba(72,58,38,0.7)] transition-colors hover:text-[var(--auth-gold)]">Terms of Service</Link> and <Link href="/privacy" className="font-black text-[rgba(72,58,38,0.7)] transition-colors hover:text-[var(--auth-gold)]">Privacy Policy</Link>.
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative isolate overflow-hidden pb-16 pt-6 md:pb-24 md:pt-12">
          <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(212,160,84,0.18),transparent_34%),radial-gradient(circle_at_80%_18%,rgba(209,91,58,0.14),transparent_22%),linear-gradient(180deg,#fbf6ea_0%,#f6efe0_46%,#f2e8d4_100%)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(rgba(212,160,84,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(212,160,84,0.08)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.34),transparent_58%)]" />
          <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8">
            <section className="w-full max-w-[32rem] rounded-[2rem] border border-[rgba(212,160,84,0.26)] bg-[rgba(245,239,227,0.96)] p-6 shadow-[0_28px_90px_rgba(141,102,41,0.14)] backdrop-blur-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,160,84,0.24)] bg-[rgba(255,248,233,0.9)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#d4a054]">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure account access
              </div>
              <p className="mt-6 text-sm text-[rgba(72,58,38,0.72)]">Loading DevilFruitTCG account access...</p>
            </section>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
