import { auth } from "@/auth";
import { prisma } from "./db";

// Resolves the signed-in user. Unauthenticated requests are blocked in
// proxy.ts before handlers run, so a missing session here is a bug, not a
// user-facing state.
export async function getCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    throw new Error("No session — proxy should have blocked this request");
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error("Session references a deleted user");
  }
  return user;
}
