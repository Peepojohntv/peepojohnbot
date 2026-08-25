import { getStore } from "@netlify/blobs";

// Der lokale Bot-Prozess ruft diesen Endpunkt regelmäßig auf,
// um Commands, Settings und den aktuellen Broadcaster-Token zu bekommen.
function checkAuth(req) {
  const key = req.headers.get("x-bot-key");
  return key && key === process.env.BOT_SECRET;
}

async function refreshTokenIfNeeded(store, auth, clientId, clientSecret) {
  // Twitch Access Tokens laufen nach ca. 4h ab -> hier grob alle 3h erneuern
  const THREE_HOURS = 3 * 60 * 60 * 1000;
  if (Date.now() - auth.updated_at < THREE_HOURS) return auth;

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: auth.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const data = await res.json();
  if (!data.access_token) return auth; // Refresh fehlgeschlagen, alten Token weiterverwenden

  const updated = {
    ...auth,
    access_token: data.access_token,
    refresh_token: data.refresh_token || auth.refresh_token,
    updated_at: Date.now(),
  };
  await store.setJSON("auth", updated);
  return updated;
}

export default async (req) => {
  if (!checkAuth(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const store = getStore("config");
  let auth = await store.get("auth", { type: "json" });
  if (!auth) {
    return Response.json({ error: "not_connected" }, { status: 400 });
  }

  auth = await refreshTokenIfNeeded(
    store,
    auth,
    process.env.TWITCH_CLIENT_ID,
    process.env.TWITCH_CLIENT_SECRET
  );

  const settings = (await store.get("settings", { type: "json" })) || {};
  const commands = (await store.get("commands", { type: "json" })) || [];

  return Response.json({
    channel: auth.broadcaster_login,
    broadcaster_id: auth.broadcaster_id,
    broadcaster_token: auth.access_token,
    client_id: process.env.TWITCH_CLIENT_ID,
    settings,
    commands,
  });
};


export const config = { path: "/api/bot-sync" };
