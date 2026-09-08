export async function approve(id: string, actor: string) {
  if (!actor) throw new Error("an approval needs an attributable actor");
  const res = await fetch(`/api/payments/${id}/approve`, { method: "POST" });
  if (!res.ok) return { error: await res.json() };
  return res.json();
}
