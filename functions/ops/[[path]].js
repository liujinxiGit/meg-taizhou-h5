import { authorizeOps } from "../_shared/leads.mjs";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (context.env.LOCAL_DEV === "true" && ["localhost", "127.0.0.1"].includes(url.hostname)) return context.next();
  if (url.hostname === "taizhou.jinxiliu.com") return new Response("Not Found", { status:404, headers:{ "Cache-Control":"no-store" } });
  const auth = await authorizeOps(context.request, context.env);
  if (!auth.ok) return new Response("Unauthorized", { status:401, headers:{ "Cache-Control":"no-store" } });
  return context.next();
}
