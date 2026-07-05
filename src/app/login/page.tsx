import { redirect } from "next/navigation";
import { auth, signIn, googleEnabled, devLoginEnabled } from "@/auth";
import FadeUp from "@/components/motion/FadeUp";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await auth();
  const { from } = await searchParams;
  const target = from && from.startsWith("/") ? from : "/archive";
  if (session?.user) redirect(target);

  return (
    <div className="flex min-h-[calc(100dvh-57px)] flex-col items-center justify-center px-6 text-center">
      <FadeUp>
        <p className="text-eyebrow text-ember">one film a day</p>
      </FadeUp>
      <FadeUp delay={0.1}>
        <h1 className="font-display mt-4 text-6xl md:text-8xl">SIGN IN</h1>
      </FadeUp>

      <FadeUp delay={0.22} className="mt-12 flex w-full max-w-xs flex-col gap-4">
        {googleEnabled ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: target });
            }}
          >
            <button className="font-display w-full rounded-full border border-bone px-6 py-4 text-xs tracking-[0.18em] text-bone transition-colors duration-300 hover:bg-bone hover:text-ink">
              CONTINUE WITH GOOGLE
            </button>
          </form>
        ) : (
          <p className="text-xs leading-relaxed text-bone-faint">
            google sign-in isn&apos;t configured yet — set GOOGLE_CLIENT_ID and
            GOOGLE_CLIENT_SECRET in .env
          </p>
        )}

        {devLoginEnabled && (
          <form
            action={async (fd: FormData) => {
              "use server";
              await signIn("dev", {
                email: String(fd.get("email") ?? ""),
                redirectTo: target,
              });
            }}
            className="flex flex-col gap-3 border-t border-ink-3 pt-6"
          >
            <p className="text-[10px] tracking-[0.14em] text-bone-faint">
              development sign-in
            </p>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded border border-ink-4 bg-ink-2 px-4 py-3 text-center text-sm text-bone outline-none placeholder:text-bone-faint focus:border-bone-muted"
            />
            <button className="font-display w-full rounded-full border border-ink-4 px-6 py-3 text-xs tracking-[0.18em] text-bone-muted transition-colors duration-300 hover:border-bone hover:text-bone">
              ENTER
            </button>
          </form>
        )}
      </FadeUp>
    </div>
  );
}
