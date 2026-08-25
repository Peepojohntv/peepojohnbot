import { getStore } from "@netlify/blobs";

function checkAuth(req) {
  const key = req.headers.get("x-dashboard-key");
  return key && key === process.env.DASHBOARD_SECRET;
}

export default async (req) => {
  if (!checkAuth(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const store = getStore("config");

  if (req.method === "GET") {
    const settings = (await store.get("settings", { type: "json" })) || {};
    const auth = (await store.get("auth", { type: "json" })) || null;
    return Response.json({
      settings,
      connected: !!auth,
      channel: auth?.broadcaster_login || null,
    });
  }

  if (req.method === "PUT") {
    const body = await req.json();
    const current = (await store.get("settings", { type: "json" })) || {};
    const updated = { ...current, ...body };
    await store.setJSON("settings", updated);
    return Response.json(updated);
  }

  return new Response("Method not allowed", { status: 405 });
};


export const config = { path: "/api/settings" };
