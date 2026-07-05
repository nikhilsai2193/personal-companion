"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// The nav's "edit" entry: resolves today's My Day (client-side, so the date
// is the user's local one) and lands in its studio on the edit tab.
export default function EditorPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ project }) => router.replace(`/studio/${project.id}?tab=edit`))
      .catch(() => setFailed(true));
  }, [router]);

  return (
    <div className="flex min-h-[calc(100dvh-57px)] items-center justify-center">
      <p className="text-eyebrow text-bone-muted">
        {failed ? "couldn't open the studio — try again" : "opening my day…"}
      </p>
    </div>
  );
}
