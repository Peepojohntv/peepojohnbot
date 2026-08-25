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
    const commands = (await store.get("commands", { type: "json" })) || [];
    return Response.json(commands);
  }

  if (req.method === "POST") {
    const body = await req.json();
    const commands = (await store.get("commands", { type: "json" })) || [];

    const newCommand = {
      id: crypto.randomUUID(),
      name: body.name.toLowerCase().replace(/^!/, ""),
      response: body.response,
      cooldown: body.cooldown ?? 5,
      permission: body.permission ?? "everyone", // everyone | subscriber | vip | moderator | broadcaster
      enabled: true,
    };

    if (commands.some((c) => c.name === newCommand.name)) {
      return Response.json({ error: "Command existiert bereits" }, { status: 400 });
    }

    commands.push(newCommand);
    await store.setJSON("commands", commands);
    return Response.json(newCommand);
  }

  if (req.method === "PUT") {
    const body = await req.json();
    let commands = (await store.get("commands", { type: "json" })) || [];
    commands = commands.map((c) => (c.id === body.id ? { ...c, ...body } : c));
    await store.setJSON("commands", commands);
    return Response.json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = await req.json();
    let commands = (await store.get("commands", { type: "json" })) || [];
    commands = commands.filter((c) => c.id !== id);
    await store.setJSON("commands", commands);
    return Response.json({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};


export const config = { path: "/api/commands" };
