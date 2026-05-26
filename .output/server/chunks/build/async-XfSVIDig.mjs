import { s as createError, a8 as useAsyncData, at as useStorefront, ax as vueExports } from './server.mjs';

function useStorefrontData(...args) {
  if (args.length < 1 || args.length > 3) {
    throw createError({
      statusCode: 500,
      message: "[shopify] [useStorefrontData] Invalid number of arguments"
    });
  }
  const key = typeof args[1] === "string" ? args[0] : void 0;
  const operation = key ? args[1] : args[0];
  const options = key ? args[2] : args[1];
  const { variables, headers, apiVersion, retries, signal, cache, ...asyncOptions } = options ?? {};
  const getVariables = () => {
    const v = vueExports.unref(variables);
    for (const key2 in v) {
      v[key2] = vueExports.unref(v[key2]);
    }
    return v;
  };
  const getHeaders = () => vueExports.unref(headers);
  const getCache = () => vueExports.unref(cache);
  const handler = () => useStorefront().request(operation, {
    ...variables ? { variables: getVariables() } : {},
    ...headers ? { headers: getHeaders() } : {},
    ...cache ? { cache: getCache() } : {},
    ...apiVersion ? { apiVersion } : {},
    ...retries ? { retries } : {},
    ...signal ? { signal } : {}
  }).then((r) => r.data);
  return key ? useAsyncData(key, handler, asyncOptions) : useAsyncData(
    handler,
    asyncOptions,
    "$wrFGCXm76h"
    /* nuxt-injected */
  );
}

export { useStorefrontData as u };
//# sourceMappingURL=async-XfSVIDig.mjs.map
