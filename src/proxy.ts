import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROTECTED_PAGES = [
  "/archive",
  "/editor",
  "/record",
  "/friends",
  "/studio",
  "/plan",
  "/study",
  "/goals",
];
const PROTECTED_API = [
  "/api/clips",
  "/api/films",
  "/api/projects",
  "/api/usage",
  "/api/media",
  "/api/follows",
  "/api/users",
  "/api/uploads",
  "/api/media-upload",
  "/api/tasks",
  "/api/subtasks",
  "/api/resources",
  "/api/youtube-search",
  "/api/threads",
  "/api/goals",
  "/api/goal-nodes",
  "/api/goal-checkpoints",
];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isPage = PROTECTED_PAGES.some((p) => pathname.startsWith(p));
  const isApi = PROTECTED_API.some((p) => pathname.startsWith(p));
  if (!isPage && !isApi) return NextResponse.next();

  if (req.auth?.user?.id) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const url = new URL("/login", req.url);
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
});
