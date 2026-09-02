import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { subscription: true },
        });

        if (!user) return null;

        const passwordMatch = await compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          hasSubscription: user.subscription?.status === "active",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.plan = (user as { plan?: string }).plan;
        token.hasSubscription = (user as { hasSubscription?: boolean }).hasSubscription;
        token.planCheckedAt = Date.now();
      }

      const userId = token.id as string | undefined;
      if (userId) {
        const last = (token.planCheckedAt as number) || 0;
        const shouldRefresh = trigger === "update" || Date.now() - last > 30_000;
        if (shouldRefresh) {
          const current = await prisma.user.findUnique({
            where: { id: userId },
            select: { plan: true, subscription: { select: { status: true } } },
          });
          if (current) {
            token.plan = current.plan;
            token.hasSubscription = current.subscription?.status === "active";
            token.planCheckedAt = Date.now();
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { plan?: string }).plan = token.plan as string;
        (session.user as { hasSubscription?: boolean }).hasSubscription =
          token.hasSubscription as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
