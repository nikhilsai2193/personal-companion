import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { ownedGoalPlan, nodesWithCheckpoints, MAX_ENTRY_LEN } from "@/lib/goals";
import { extractFirstTree, extractMergeTree, persistFirstTree } from "@/lib/goalExtraction";
import { computeDiff, diffIsEmpty, loadExistingTree } from "@/lib/goalDiff";
import { GroqNotConfiguredError, GroqExhaustedError } from "@/lib/groq";

function friendlyError(e: unknown) {
  return e instanceof GroqNotConfiguredError
    ? "AI extraction isn't set up yet — add GROQ_API_KEY_1 to enable this."
    : e instanceof GroqExhaustedError
      ? e.message
      : "Couldn't process that — try rephrasing or try again.";
}

// First entry generates a tree directly (nothing to lose yet). Any entry
// after that goes through the merge path — the model proposes an updated
// tree, we diff it against current state, and return the diff for review
// rather than applying anything. Confirming happens via
// POST /api/goals/[id]/diff/confirm.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const plan = await ownedGoalPlan(user.id, id);
  if (!plan) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const rawText = typeof body?.text === "string" ? body.text.trim() : "";
  if (!rawText) {
    return Response.json({ error: "Write something first" }, { status: 400 });
  }
  if (rawText.length > MAX_ENTRY_LEN) {
    return Response.json(
      { error: `Keep entries under ${MAX_ENTRY_LEN} characters` },
      { status: 400 }
    );
  }

  const existing = await loadExistingTree(id);
  const entry = await prisma.goalEntry.create({
    data: { goalPlanId: id, rawText },
  });

  if (existing.length === 0) {
    try {
      const rawNodes = await extractFirstTree(rawText);
      if (rawNodes.length === 0) throw new Error("Couldn't find a goal in that text");
      await persistFirstTree(id, rawNodes);
      await prisma.goalEntry.update({ where: { id: entry.id }, data: { status: "PROCESSED" } });
      await prisma.goalPlan.update({ where: { id }, data: { updatedAt: new Date() } });
    } catch (e) {
      const message = friendlyError(e);
      await prisma.goalEntry.update({
        where: { id: entry.id },
        data: { status: "FAILED", error: message },
      });
      return Response.json({ error: message }, { status: 502 });
    }
    const nodes = await prisma.goalNode.findMany({
      where: { goalPlanId: id },
      ...nodesWithCheckpoints,
    });
    return Response.json({ nodes }, { status: 201 });
  }

  // Merge path.
  try {
    const proposed = await extractMergeTree(existing, rawText);
    const diff = computeDiff(existing, proposed);
    if (diffIsEmpty(diff)) {
      await prisma.goalEntry.update({ where: { id: entry.id }, data: { status: "PROCESSED" } });
      return Response.json({ merge: false, unchanged: true }, { status: 200 });
    }
    await prisma.goalEntry.update({
      where: { id: entry.id },
      data: { proposedTree: proposed },
    });
    return Response.json({ merge: true, entryId: entry.id, diff }, { status: 200 });
  } catch (e) {
    const message = friendlyError(e);
    await prisma.goalEntry.update({
      where: { id: entry.id },
      data: { status: "FAILED", error: message },
    });
    return Response.json({ error: message }, { status: 502 });
  }
}
