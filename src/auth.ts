import NextAuth, { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

// Local sign-in without OAuth credentials — never available in production.
export const devLoginEnabled = process.env.NODE_ENV !== "production";

const providers = [];
if (googleEnabled) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Google verifies emails, so linking to a pre-existing user with the
      // same address is safe — this is what attaches the dev-era films to
      // the real Google identity on first sign-in.
      allowDangerousEmailAccountLinking: true,
    })
  );
}
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Development",
      credentials: { email: { label: "email" } },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        if (!email.includes("@")) return null;
        const user = await prisma.user.upsert({
          where: { email },
          create: { email, name: email.split("@")[0] },
          update: {},
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
