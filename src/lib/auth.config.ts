import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Edge-compatible auth configuration (no database/Node.js imports)
export const authConfig: NextAuthConfig = {
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            // authorize is handled in the full auth.ts, not here
            authorize: () => null,
        }),
    ],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isAuthPage =
                nextUrl.pathname.startsWith("/login") ||
                nextUrl.pathname.startsWith("/register");
            const isProtectedRoute =
                nextUrl.pathname.startsWith("/dashboard") ||
                nextUrl.pathname.startsWith("/tasks") ||
                nextUrl.pathname.startsWith("/projects") ||
                nextUrl.pathname.startsWith("/calendar") ||
                nextUrl.pathname.startsWith("/notes") ||
                nextUrl.pathname.startsWith("/company") ||
                nextUrl.pathname.startsWith("/settings");

            // Redirect logged-in users away from auth pages
            if (isLoggedIn && isAuthPage) {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }

            // Redirect non-logged-in users to login
            if (!isLoggedIn && isProtectedRoute) {
                return Response.redirect(new URL("/login", nextUrl));
            }

            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role?: string }).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as "USER" | "ADMIN";
            }
            return session;
        },
    },
};
