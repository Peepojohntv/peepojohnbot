// Leitet den Broadcaster zu Twitch weiter, um sich einzuloggen (Authorization Code Flow)
export default async (req) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const redirectUri = process.env.TWITCH_REDIRECT_URI; // z.B. https://deine-seite.netlify.app/.netlify/functions/twitch-callback

  const scopes = [
    "channel:read:subscriptions",
    "moderator:manage:banned_users",
    "moderator:manage:chat_messages",
    "moderator:manage:chat_settings",
    "channel:read:redemptions",
    "channel:manage:broadcast",
    "user:read:email",
  ].join(" ");

  const url = new URL("https://id.twitch.tv/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes);

  return Response.redirect(url.toString(), 302);
};


export const config = { path: "/api/login" };
