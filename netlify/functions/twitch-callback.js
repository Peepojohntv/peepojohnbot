import { getStore } from "@netlify/blobs";

// Twitch schickt hierher zurück mit ?code=...
export default async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return new Response("Kein Code von Twitch erhalten.", { status: 400 });
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;

  // Code gegen Access/Refresh Token tauschen
  const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return new Response("Token-Tausch fehlgeschlagen: " + JSON.stringify(tokenData), { status: 500 });
  }

  // Wer ist der eingeloggte User? (der Broadcaster)
  const userRes = await fetch("https://api.twitch.tv/helix/users", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Client-Id": clientId,
    },
  });
  const userData = await userRes.json();
  const broadcaster = userData.data?.[0];

  if (!broadcaster) {
    return new Response("Konnte Twitch-User nicht laden.", { status: 500 });
  }

  const store = getStore("config");
  await store.setJSON("auth", {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    broadcaster_id: broadcaster.id,
    broadcaster_login: broadcaster.login,
    updated_at: Date.now(),
  });

  // Grundkonfiguration anlegen, falls noch nicht vorhanden
  const existingSettings = await store.get("settings", { type: "json" });
  if (!existingSettings) {
    await store.setJSON("settings", {
      channel: broadcaster.login,
      prefix: "!",
      builtins: {
        uptime: true,
        followage: true,
        title: true,
        game: true,
        so: true,
        discord: false,
      },
      discordUrl: "",
    });
  }
  const existingCommands = await store.get("commands", { type: "json" });
  if (!existingCommands) {
    await store.setJSON("commands", []);
  }

  return new Response(
    `<html><body style="font-family:sans-serif;background:#0e0e10;color:#efeff1;text-align:center;padding-top:80px">
      <h1>✅ Verbunden als ${broadcaster.display_name}</h1>
      <p>Du kannst dieses Fenster schließen und zum Dashboard zurückkehren.</p>
      <script>setTimeout(()=>{ window.location.href = "/"; }, 2000)</script>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
};


export const config = { path: "/api/callback" };
