export default defineEventHandler((event) => {
  const env = event.context.cloudflare?.env ?? process.env;
  return {
    has_cloudflare_context: Boolean(event.context.cloudflare),
    has_cloudflare_env: Boolean(event.context.cloudflare?.env),
    has_paperclip_key: Boolean(env.PAPERCLIP_ADMIN_API_KEY),
    paperclip_key_length: (env.PAPERCLIP_ADMIN_API_KEY ?? "").length,
    paperclip_key_preview: (env.PAPERCLIP_ADMIN_API_KEY ?? "").slice(0, 12),
    keys_present: Object.keys(env).filter((k) => k.includes("PAPERCLIP") || k.includes("SHOPIFY") || k.includes("ADMIN")).sort(),
    process_env_has_key: Boolean(process.env.PAPERCLIP_ADMIN_API_KEY),
  };
});
