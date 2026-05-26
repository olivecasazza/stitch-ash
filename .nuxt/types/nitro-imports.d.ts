declare global {
  const ARTICLE_FRAGMENT: typeof import('../../graphql/fragments/blog').ARTICLE_FRAGMENT
  const BLOG_FRAGMENT: typeof import('../../graphql/fragments/blog').BLOG_FRAGMENT
  const CART_FRAGMENT: typeof import('../../graphql/fragments/cart').CART_FRAGMENT
  const CART_LINE_CONNECTION_FRAGMENT: typeof import('../../graphql/fragments/cart').CART_LINE_CONNECTION_FRAGMENT
  const CART_LINE_FRAGMENT: typeof import('../../graphql/fragments/cart').CART_LINE_FRAGMENT
  const CART_USER_ERRORS_FRAGMENT: typeof import('../../graphql/fragments/cart').CART_USER_ERRORS_FRAGMENT
  const COLLECTION_CONNECTION_FRAGMENT: typeof import('../../graphql/fragments/collection').COLLECTION_CONNECTION_FRAGMENT
  const COLLECTION_FRAGMENT: typeof import('../../graphql/fragments/collection').COLLECTION_FRAGMENT
  const CUSTOMER_FRAGMENT: typeof import('../../graphql/fragments/customer').CUSTOMER_FRAGMENT
  const H3Error: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').H3Error
  const H3Event: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').H3Event
  const IMAGE_FRAGMENT: typeof import('../../graphql/fragments/utils').IMAGE_FRAGMENT
  const MENU_FRAGMENT: typeof import('../../graphql/fragments/menu').MENU_FRAGMENT
  const MENU_ITEM_FRAGMENT: typeof import('../../graphql/fragments/menu').MENU_ITEM_FRAGMENT
  const PRICE_FRAGMENT: typeof import('../../graphql/fragments/utils').PRICE_FRAGMENT
  const PRODUCT_CONNECTION_FRAGMENT: typeof import('../../graphql/fragments/product').PRODUCT_CONNECTION_FRAGMENT
  const PRODUCT_FILTERS_FRAGMENT: typeof import('../../graphql/fragments/product').PRODUCT_FILTERS_FRAGMENT
  const PRODUCT_FRAGMENT: typeof import('../../graphql/fragments/product').PRODUCT_FRAGMENT
  const PRODUCT_OPTION_FRAGMENT: typeof import('../../graphql/fragments/product').PRODUCT_OPTION_FRAGMENT
  const PRODUCT_VARIANT_CONNECTION_FRAGMENT: typeof import('../../graphql/fragments/product').PRODUCT_VARIANT_CONNECTION_FRAGMENT
  const PRODUCT_VARIANT_FRAGMENT: typeof import('../../graphql/fragments/product').PRODUCT_VARIANT_FRAGMENT
  const __buildAssetsURL: typeof import('../../node_modules/.pnpm/@nuxt+nitro-server@4.4.6_@babel+plugin-syntax-typescript@7.28.6_@babel+core@7.29.0__db0_98812eafb88dd10d4ca957f6d9b93d29/node_modules/@nuxt/nitro-server/dist/runtime/utils/paths').buildAssetsURL
  const __publicAssetsURL: typeof import('../../node_modules/.pnpm/@nuxt+nitro-server@4.4.6_@babel+plugin-syntax-typescript@7.28.6_@babel+core@7.29.0__db0_98812eafb88dd10d4ca957f6d9b93d29/node_modules/@nuxt/nitro-server/dist/runtime/utils/paths').publicAssetsURL
  const appendCorsHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').appendCorsHeaders
  const appendCorsPreflightHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').appendCorsPreflightHeaders
  const appendHeader: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').appendHeader
  const appendHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').appendHeaders
  const appendResponseHeader: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').appendResponseHeader
  const appendResponseHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').appendResponseHeaders
  const assertMethod: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').assertMethod
  const cachedEventHandler: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/cache').cachedEventHandler
  const cachedFunction: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/cache').cachedFunction
  const callNodeListener: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').callNodeListener
  const cartGetInputSchema: typeof import('../../graphql/validation/cart').cartGetInputSchema
  const cartLineInputSchema: typeof import('../../graphql/validation/cart').cartLineInputSchema
  const cartRemoveInputSchema: typeof import('../../graphql/validation/cart').cartRemoveInputSchema
  const cartUpdateInputSchema: typeof import('../../graphql/validation/cart').cartUpdateInputSchema
  const categoryFilterSchema: typeof import('../../graphql/validation/utils').categoryFilterSchema
  const clearResponseHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').clearResponseHeaders
  const clearSession: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').clearSession
  const collectionInputSchema: typeof import('../../graphql/validation/collection').collectionInputSchema
  const connectionParamsSchema: typeof import('../../graphql/validation/utils').connectionParamsSchema
  const createApp: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').createApp
  const createAppEventHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').createAppEventHandler
  const createError: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').createError
  const createEvent: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').createEvent
  const createEventStream: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').createEventStream
  const createRouter: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').createRouter
  const defaultContentType: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').defaultContentType
  const defineAppConfig: typeof import('../../node_modules/.pnpm/@nuxt+nitro-server@4.4.6_@babel+plugin-syntax-typescript@7.28.6_@babel+core@7.29.0__db0_98812eafb88dd10d4ca957f6d9b93d29/node_modules/@nuxt/nitro-server/dist/runtime/utils/config').defineAppConfig
  const defineCachedEventHandler: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/cache').defineCachedEventHandler
  const defineCachedFunction: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/cache').defineCachedFunction
  const defineEventHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').defineEventHandler
  const defineI18nConfig: typeof import('../../node_modules/.pnpm/@nuxtjs+i18n@10.4.0_@vue+compiler-dom@3.5.34_db0@0.3.4_eslint@10.4.0_jiti@2.7.0__ioredi_0ac4f61bdc806aab7d42ff13177fc620/node_modules/@nuxtjs/i18n/dist/runtime/composables/shared').defineI18nConfig
  const defineI18nLocale: typeof import('../../node_modules/.pnpm/@nuxtjs+i18n@10.4.0_@vue+compiler-dom@3.5.34_db0@0.3.4_eslint@10.4.0_jiti@2.7.0__ioredi_0ac4f61bdc806aab7d42ff13177fc620/node_modules/@nuxtjs/i18n/dist/runtime/composables/shared').defineI18nLocale
  const defineI18nLocaleDetector: typeof import('../../node_modules/.pnpm/@nuxtjs+i18n@10.4.0_@vue+compiler-dom@3.5.34_db0@0.3.4_eslint@10.4.0_jiti@2.7.0__ioredi_0ac4f61bdc806aab7d42ff13177fc620/node_modules/@nuxtjs/i18n/dist/runtime/composables/server').defineI18nLocaleDetector
  const defineLazyEventHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').defineLazyEventHandler
  const defineNitroErrorHandler: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/error/utils').defineNitroErrorHandler
  const defineNitroPlugin: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/plugin').defineNitroPlugin
  const defineNodeListener: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').defineNodeListener
  const defineNodeMiddleware: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').defineNodeMiddleware
  const defineRenderHandler: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/renderer').defineRenderHandler
  const defineRequestMiddleware: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').defineRequestMiddleware
  const defineResponseMiddleware: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').defineResponseMiddleware
  const defineRouteMeta: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/meta').defineRouteMeta
  const defineTask: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/task').defineTask
  const defineWebSocket: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').defineWebSocket
  const defineWebSocketHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').defineWebSocketHandler
  const defineWebhookEventHandler: typeof import('../../node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/handler').defineWebhookEventHandler
  const deleteCookie: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').deleteCookie
  const dynamicEventHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').dynamicEventHandler
  const eventHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').eventHandler
  const fetchWithEvent: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').fetchWithEvent
  const flattenConnection: typeof import('../../node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/utils/flattenConnection').flattenConnection
  const fromNodeMiddleware: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').fromNodeMiddleware
  const fromPlainHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').fromPlainHandler
  const fromWebHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').fromWebHandler
  const getCookie: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getCookie
  const getCookieLocale: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').getCookieLocale
  const getHeader: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getHeader
  const getHeaderLanguage: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').getHeaderLanguage
  const getHeaderLanguages: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').getHeaderLanguages
  const getHeaderLocale: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').getHeaderLocale
  const getHeaderLocales: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').getHeaderLocales
  const getHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getHeaders
  const getMethod: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getMethod
  const getPathLocale: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').getPathLocale
  const getProxyRequestHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getProxyRequestHeaders
  const getQuery: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getQuery
  const getQueryLocale: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').getQueryLocale
  const getRequestFingerprint: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getRequestFingerprint
  const getRequestHeader: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getRequestHeader
  const getRequestHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getRequestHeaders
  const getRequestHost: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getRequestHost
  const getRequestIP: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getRequestIP
  const getRequestPath: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getRequestPath
  const getRequestProtocol: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getRequestProtocol
  const getRequestURL: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getRequestURL
  const getRequestWebStream: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getRequestWebStream
  const getResponseHeader: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getResponseHeader
  const getResponseHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getResponseHeaders
  const getResponseStatus: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getResponseStatus
  const getResponseStatusText: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getResponseStatusText
  const getRouteRules: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/route-rules').getRouteRules
  const getRouterParam: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getRouterParam
  const getRouterParams: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getRouterParams
  const getSession: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getSession
  const getUserSession: typeof import('../shopify/auth-utils').getUserSession
  const getValidatedQuery: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getValidatedQuery
  const getValidatedRouterParams: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').getValidatedRouterParams
  const getWebhookApiVersion: typeof import('../../node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/functions').getWebhookApiVersion
  const getWebhookEventId: typeof import('../../node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/functions').getWebhookEventId
  const getWebhookHmac: typeof import('../../node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/functions').getWebhookHmac
  const getWebhookId: typeof import('../../node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/functions').getWebhookId
  const getWebhookShopDomain: typeof import('../../node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/functions').getWebhookShopDomain
  const getWebhookTopic: typeof import('../../node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/functions').getWebhookTopic
  const getWebhookTriggeredAt: typeof import('../../node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/functions').getWebhookTriggeredAt
  const handleCacheHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').handleCacheHeaders
  const handleCors: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').handleCors
  const isCorsOriginAllowed: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').isCorsOriginAllowed
  const isError: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').isError
  const isEvent: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').isEvent
  const isEventHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').isEventHandler
  const isMethod: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').isMethod
  const isPreflightRequest: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').isPreflightRequest
  const isStream: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').isStream
  const isWebResponse: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').isWebResponse
  const lazyEventHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').lazyEventHandler
  const localizationParamsSchema: typeof import('../../graphql/validation/utils').localizationParamsSchema
  const menuGetInputSchema: typeof import('../../graphql/validation/menu').menuGetInputSchema
  const metafieldFilterSchema: typeof import('../../graphql/validation/utils').metafieldFilterSchema
  const nitroPlugin: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/plugin').nitroPlugin
  const parseCookies: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').parseCookies
  const predictiveSearchParamsSchema: typeof import('../../graphql/validation/utils').predictiveSearchParamsSchema
  const priceRangeFilterSchema: typeof import('../../graphql/validation/utils').priceRangeFilterSchema
  const productConnectionParamsSchema: typeof import('../../graphql/validation/product').productConnectionParamsSchema
  const productFilterSchema: typeof import('../../graphql/validation/product').productFilterSchema
  const productInputSchema: typeof import('../../graphql/validation/product').productInputSchema
  const productSortKeysSchema: typeof import('../../graphql/validation/product').productSortKeysSchema
  const promisifyNodeListener: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').promisifyNodeListener
  const proxyRequest: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').proxyRequest
  const readBody: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').readBody
  const readFormData: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').readFormData
  const readMultipartFormData: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').readMultipartFormData
  const readRawBody: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').readRawBody
  const readValidatedBody: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').readValidatedBody
  const removeResponseHeader: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').removeResponseHeader
  const runTask: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/task').runTask
  const sanitizeStatusCode: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').sanitizeStatusCode
  const sanitizeStatusMessage: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').sanitizeStatusMessage
  const sealSession: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').sealSession
  const send: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').send
  const sendError: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').sendError
  const sendIterable: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').sendIterable
  const sendNoContent: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').sendNoContent
  const sendProxy: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').sendProxy
  const sendRedirect: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').sendRedirect
  const sendStream: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').sendStream
  const sendWebResponse: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').sendWebResponse
  const serveStatic: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').serveStatic
  const setCookie: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').setCookie
  const setCookieLocale: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').setCookieLocale
  const setHeader: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').setHeader
  const setHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').setHeaders
  const setResponseHeader: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').setResponseHeader
  const setResponseHeaders: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').setResponseHeaders
  const setResponseStatus: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').setResponseStatus
  const splitCookiesString: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').splitCookiesString
  const taxonomyMetafieldFilterSchema: typeof import('../../graphql/validation/utils').taxonomyMetafieldFilterSchema
  const toEventHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').toEventHandler
  const toNodeListener: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').toNodeListener
  const toPlainHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').toPlainHandler
  const toWebHandler: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').toWebHandler
  const toWebRequest: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').toWebRequest
  const tryCookieLocale: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').tryCookieLocale
  const tryHeaderLocale: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').tryHeaderLocale
  const tryHeaderLocales: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').tryHeaderLocales
  const tryPathLocale: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').tryPathLocale
  const tryQueryLocale: typeof import('../../node_modules/.pnpm/@intlify+utils@0.14.1/node_modules/@intlify/utils/dist/h3').tryQueryLocale
  const unsealSession: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').unsealSession
  const updateSession: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').updateSession
  const useAppConfig: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/config').useAppConfig
  const useBase: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').useBase
  const useEvent: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/context').useEvent
  const useImage: typeof import('../../node_modules/.pnpm/@nuxt+image@2.0.0_db0@0.3.4_ioredis@5.10.1_magicast@0.5.3/node_modules/@nuxt/image/dist/runtime/server/utils/image').useImage
  const useNitroApp: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/app').useNitroApp
  const useRuntimeConfig: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/config').useRuntimeConfig
  const useSession: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').useSession
  const useStorage: typeof import('../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser@0.131.0/node_modules/nitropack/dist/runtime/internal/storage').useStorage
  const useStorefront: typeof import('../../node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/storefront/client').useStorefront
  const useTranslation: typeof import('../../node_modules/.pnpm/@intlify+h3@0.7.4/node_modules/@intlify/h3').useTranslation
  const validateWebhook: typeof import('../../node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/validation').validate
  const variantOptionFilterSchema: typeof import('../../graphql/validation/utils').variantOptionFilterSchema
  const writeEarlyHints: typeof import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3').writeEarlyHints
}
// for type re-export
declare global {
  // @ts-ignore
  export type { EventHandler, EventHandlerRequest, EventHandlerResponse, EventHandlerObject, H3EventContext } from '../../node_modules/.pnpm/h3@1.15.11/node_modules/h3'
  import('../../node_modules/.pnpm/h3@1.15.11/node_modules/h3')
  // @ts-ignore
  export type { Maybe, InputMaybe, Exact, MakeOptional, MakeMaybe, MakeEmpty, Incremental, Scalars, ApiVersion, ApplePayWalletContentInput, ApplePayWalletHeaderInput, AppliedGiftCard, Article, ArticleCommentsArgs, ArticleContentArgs, ArticleExcerptArgs, ArticleMetafieldArgs, ArticleMetafieldsArgs, ArticleAuthor, ArticleConnection, ArticleEdge, ArticleSortKeys, Attribute, AttributeInput, AutomaticDiscountApplication, BaseCartLine, BaseCartLineAttributeArgs, BaseCartLineConnection, BaseCartLineEdge, Blog, BlogArticleByHandleArgs, BlogArticlesArgs, BlogMetafieldArgs, BlogMetafieldsArgs, BlogConnection, BlogEdge, BlogSortKeys, Brand, BrandColorGroup, BrandColors, BuyerInput, CardBrand, Cart, CartAttributeArgs, CartDeliveryGroupsArgs, CartLinesArgs, CartMetafieldArgs, CartMetafieldsArgs, CartAddress, CartAddressInput, CartAttributesUpdatePayload, CartAutomaticDiscountAllocation, CartBillingAddressUpdatePayload, CartBuyerIdentity, CartBuyerIdentityInput, CartBuyerIdentityUpdatePayload, CartCardSource, CartClonePayload, CartCodeDiscountAllocation, CartCompletionAction, CartCompletionActionRequired, CartCompletionAttemptResult, CartCompletionFailed, CartCompletionProcessing, CartCompletionSuccess, CartCost, CartCreatePayload, CartCustomDiscountAllocation, CartDelivery, CartDeliveryAddressesArgs, CartDeliveryAddress, CartDeliveryAddressFormattedArgs, CartDeliveryAddressInput, CartDeliveryAddressesAddPayload, CartDeliveryAddressesRemovePayload, CartDeliveryAddressesReplacePayload, CartDeliveryAddressesUpdatePayload, CartDeliveryCoordinatesPreference, CartDeliveryCoordinatesPreferenceInput, CartDeliveryGroup, CartDeliveryGroupCartLinesArgs, CartDeliveryGroupConnection, CartDeliveryGroupEdge, CartDeliveryGroupType, CartDeliveryInput, CartDeliveryOption, CartDeliveryPreference, CartDeliveryPreferenceInput, CartDirectPaymentMethodInput, CartDiscountAllocation, CartDiscountApplication, CartDiscountCode, CartDiscountCodesUpdatePayload, CartErrorCode, CartEstimatedCost, CartFreePaymentMethodInput, CartGiftCardCodesAddPayload, CartGiftCardCodesRemovePayload, CartGiftCardCodesUpdatePayload, CartInput, CartInputMetafieldInput, CartLine, CartLineAttributeArgs, CartLineCost, CartLineEstimatedCost, CartLineInput, CartLineInstructions, CartLineParentInput, CartLineParentRelationship, CartLineUpdateInput, CartLinesAddPayload, CartLinesRemovePayload, CartLinesUpdatePayload, CartMetafieldDeleteInput, CartMetafieldDeletePayload, CartMetafieldsSetInput, CartMetafieldsSetPayload, CartNoteUpdatePayload, CartOperationError, CartPaymentInput, CartPaymentUpdatePayload, CartPreferences, CartPreferencesInput, CartPrepareForCompletionPayload, CartPrepareForCompletionResult, CartRemovePersonalDataPayload, CartSelectableAddress, CartSelectableAddressInput, CartSelectableAddressUpdateInput, CartSelectedDeliveryOptionInput, CartSelectedDeliveryOptionsUpdatePayload, CartStatusNotReady, CartStatusReady, CartSubmitForCompletionPayload, CartSubmitForCompletionResult, CartThrottled, CartUserError, CartWalletPaymentMethodInput, CartWarning, CartWarningCode, CategoryFilter, Collection, CollectionDescriptionArgs, CollectionMetafieldArgs, CollectionMetafieldsArgs, CollectionProductsArgs, CollectionConnection, CollectionEdge, CollectionSortKeys, Comment, CommentContentArgs, CommentAuthor, CommentConnection, CommentEdge, Company, CompanyMetafieldArgs, CompanyMetafieldsArgs, CompanyContact, CompanyLocation, CompanyLocationMetafieldArgs, CompanyLocationMetafieldsArgs, CompletePaymentChallenge, CompletionError, CompletionErrorCode, ComponentizableCartLine, ComponentizableCartLineAttributeArgs, Count, CountPrecision, Country, CountryCode, CropRegion, Currency, CurrencyCode, Customer, CustomerAddressesArgs, CustomerMetafieldArgs, CustomerMetafieldsArgs, CustomerOrdersArgs, CustomerAccessToken, CustomerAccessTokenCreateInput, CustomerAccessTokenCreatePayload, CustomerAccessTokenCreateWithMultipassPayload, CustomerAccessTokenDeletePayload, CustomerAccessTokenRenewPayload, CustomerActivateByUrlPayload, CustomerActivateInput, CustomerActivatePayload, CustomerAddressCreatePayload, CustomerAddressDeletePayload, CustomerAddressUpdatePayload, CustomerCreateInput, CustomerCreatePayload, CustomerDefaultAddressUpdatePayload, CustomerErrorCode, CustomerRecoverPayload, CustomerResetByUrlPayload, CustomerResetInput, CustomerResetPayload, CustomerUpdateInput, CustomerUpdatePayload, CustomerUserError, DeliveryAddress, DeliveryAddressInput, DeliveryAddressValidationStrategy, DeliveryMethodType, DigitalWallet, DiscountAllocation, DiscountApplication, DiscountApplicationAllocationMethod, DiscountApplicationConnection, DiscountApplicationEdge, DiscountApplicationTargetSelection, DiscountApplicationTargetType, DiscountCodeApplication, DisplayableError, Domain, ExternalVideo, Filter, FilterPresentation, FilterType, FilterValue, Fulfillment, FulfillmentFulfillmentLineItemsArgs, FulfillmentTrackingInfoArgs, FulfillmentLineItem, FulfillmentLineItemConnection, FulfillmentLineItemEdge, FulfillmentTrackingInfo, GenericFile, GeoCoordinateInput, HasMetafields, HasMetafieldsMetafieldArgs, HasMetafieldsMetafieldsArgs, HasMetafieldsIdentifier, Image, ImageTransformedSrcArgs, ImageUrlArgs, ImageConnection, ImageContentType, ImageEdge, ImageTransformInput, InContextAnnotation, InContextAnnotationType, Language, LanguageCode, Localization, Location, LocationMetafieldArgs, LocationMetafieldsArgs, LocationAddress, LocationConnection, LocationEdge, LocationSortKeys, MailingAddress, MailingAddressFormattedArgs, MailingAddressConnection, MailingAddressEdge, MailingAddressInput, ManualDiscountApplication, Market, MarketMetafieldArgs, MarketMetafieldsArgs, Media, MediaConnection, MediaContentType, MediaEdge, MediaHost, MediaImage, MediaPresentation, MediaPresentationAsJsonArgs, MediaPresentationFormat, Menu, MenuItem, MenuItemResource, MenuItemType, Merchandise, Metafield, MetafieldReferencesArgs, MetafieldDeleteErrorCode, MetafieldDeleteUserError, MetafieldFilter, MetafieldParentResource, MetafieldReference, MetafieldReferenceConnection, MetafieldReferenceEdge, MetafieldsSetUserError, MetafieldsSetUserErrorCode, Metaobject, MetaobjectFieldArgs, MetaobjectConnection, MetaobjectEdge, MetaobjectField, MetaobjectFieldReferencesArgs, MetaobjectHandleInput, MetaobjectSeo, Model3d, Model3dSource, MoneyInput, MoneyV2, Mutation, MutationCartAttributesUpdateArgs, MutationCartBillingAddressUpdateArgs, MutationCartBuyerIdentityUpdateArgs, MutationCartCloneArgs, MutationCartCreateArgs, MutationCartDeliveryAddressesAddArgs, MutationCartDeliveryAddressesRemoveArgs, MutationCartDeliveryAddressesReplaceArgs, MutationCartDeliveryAddressesUpdateArgs, MutationCartDiscountCodesUpdateArgs, MutationCartGiftCardCodesAddArgs, MutationCartGiftCardCodesRemoveArgs, MutationCartGiftCardCodesUpdateArgs, MutationCartLinesAddArgs, MutationCartLinesRemoveArgs, MutationCartLinesUpdateArgs, MutationCartMetafieldDeleteArgs, MutationCartMetafieldsSetArgs, MutationCartNoteUpdateArgs, MutationCartPaymentUpdateArgs, MutationCartPrepareForCompletionArgs, MutationCartRemovePersonalDataArgs, MutationCartSelectedDeliveryOptionsUpdateArgs, MutationCartSubmitForCompletionArgs, MutationCustomerAccessTokenCreateArgs, MutationCustomerAccessTokenCreateWithMultipassArgs, MutationCustomerAccessTokenDeleteArgs, MutationCustomerAccessTokenRenewArgs, MutationCustomerActivateArgs, MutationCustomerActivateByUrlArgs, MutationCustomerAddressCreateArgs, MutationCustomerAddressDeleteArgs, MutationCustomerAddressUpdateArgs, MutationCustomerCreateArgs, MutationCustomerDefaultAddressUpdateArgs, MutationCustomerRecoverArgs, MutationCustomerResetArgs, MutationCustomerResetByUrlArgs, MutationCustomerUpdateArgs, MutationShopPayPaymentRequestSessionCreateArgs, MutationShopPayPaymentRequestSessionSubmitArgs, Node, OnlineStorePublishable, Order, OrderDiscountApplicationsArgs, OrderLineItemsArgs, OrderMetafieldArgs, OrderMetafieldsArgs, OrderSuccessfulFulfillmentsArgs, OrderCancelReason, OrderConnection, OrderEdge, OrderFinancialStatus, OrderFulfillmentStatus, OrderLineItem, OrderLineItemConnection, OrderLineItemEdge, OrderSortKeys, Page, PageMetafieldArgs, PageMetafieldsArgs, PageConnection, PageEdge, PageInfo, PageSortKeys, PaginatedSitemapResources, PaymentSettings, PredictiveSearchLimitScope, PredictiveSearchResult, PredictiveSearchType, PreferenceDeliveryMethodType, PriceRangeFilter, PricingPercentageValue, PricingValue, Product, ProductAdjacentVariantsArgs, ProductCollectionsArgs, ProductDescriptionArgs, ProductImagesArgs, ProductMediaArgs, ProductMetafieldArgs, ProductMetafieldsArgs, ProductOptionsArgs, ProductSelectedOrFirstAvailableVariantArgs, ProductSellingPlanGroupsArgs, ProductVariantBySelectedOptionsArgs, ProductVariantsArgs, ProductCollectionSortKeys, ProductConnection, ProductEdge, ProductFilter, ProductImageSortKeys, ProductMediaSortKeys, ProductOption, ProductOptionValue, ProductOptionValueSwatch, ProductPriceRange, ProductRecommendationIntent, ProductSortKeys, ProductVariant, ProductVariantComponentsArgs, ProductVariantGroupedByArgs, ProductVariantMetafieldArgs, ProductVariantMetafieldsArgs, ProductVariantQuantityPriceBreaksArgs, ProductVariantSellingPlanAllocationsArgs, ProductVariantStoreAvailabilityArgs, ProductVariantComponent, ProductVariantComponentConnection, ProductVariantComponentEdge, ProductVariantConnection, ProductVariantEdge, ProductVariantSortKeys, PurchasingCompany, QuantityPriceBreak, QuantityPriceBreakConnection, QuantityPriceBreakEdge, QuantityRule, QueryRoot, QueryRootArticleArgs, QueryRootArticlesArgs, QueryRootBlogArgs, QueryRootBlogByHandleArgs, QueryRootBlogsArgs, QueryRootCartArgs, QueryRootCartCompletionAttemptArgs, QueryRootCollectionArgs, QueryRootCollectionByHandleArgs, QueryRootCollectionsArgs, QueryRootCustomerArgs, QueryRootLocationsArgs, QueryRootMenuArgs, QueryRootMetaobjectArgs, QueryRootMetaobjectsArgs, QueryRootNodeArgs, QueryRootNodesArgs, QueryRootPageArgs, QueryRootPageByHandleArgs, QueryRootPagesArgs, QueryRootPredictiveSearchArgs, QueryRootProductArgs, QueryRootProductByHandleArgs, QueryRootProductRecommendationsArgs, QueryRootProductTagsArgs, QueryRootProductTypesArgs, QueryRootProductsArgs, QueryRootSearchArgs, QueryRootSitemapArgs, QueryRootUrlRedirectsArgs, Seo, ScriptDiscountApplication, SearchPrefixQueryType, SearchQuerySuggestion, SearchResultItem, SearchResultItemConnection, SearchResultItemEdge, SearchSortKeys, SearchType, SearchUnavailableProductsType, SearchableField, SelectedOption, SelectedOptionInput, SellingPlan, SellingPlanMetafieldArgs, SellingPlanMetafieldsArgs, SellingPlanAllocation, SellingPlanAllocationConnection, SellingPlanAllocationEdge, SellingPlanAllocationPriceAdjustment, SellingPlanBillingPolicy, SellingPlanCheckoutCharge, SellingPlanCheckoutChargePercentageValue, SellingPlanCheckoutChargeType, SellingPlanCheckoutChargeValue, SellingPlanConnection, SellingPlanDeliveryPolicy, SellingPlanEdge, SellingPlanFixedAmountPriceAdjustment, SellingPlanFixedPriceAdjustment, SellingPlanGroup, SellingPlanGroupSellingPlansArgs, SellingPlanGroupConnection, SellingPlanGroupEdge, SellingPlanGroupOption, SellingPlanInterval, SellingPlanOption, SellingPlanPercentagePriceAdjustment, SellingPlanPriceAdjustment, SellingPlanPriceAdjustmentValue, SellingPlanRecurringBillingPolicy, SellingPlanRecurringDeliveryPolicy, Shop, ShopMetafieldArgs, ShopMetafieldsArgs, ShopPayInstallmentsFinancingPlan, ShopPayInstallmentsFinancingPlanFrequency, ShopPayInstallmentsFinancingPlanTerm, ShopPayInstallmentsLoan, ShopPayInstallmentsPricing, ShopPayInstallmentsProductVariantPricing, ShopPayPaymentRequest, ShopPayPaymentRequestContactField, ShopPayPaymentRequestDeliveryMethod, ShopPayPaymentRequestDeliveryMethodInput, ShopPayPaymentRequestDeliveryMethodType, ShopPayPaymentRequestDiscount, ShopPayPaymentRequestDiscountInput, ShopPayPaymentRequestImage, ShopPayPaymentRequestImageInput, ShopPayPaymentRequestInput, ShopPayPaymentRequestLineItem, ShopPayPaymentRequestLineItemInput, ShopPayPaymentRequestReceipt, ShopPayPaymentRequestSession, ShopPayPaymentRequestSessionCreatePayload, ShopPayPaymentRequestSessionSubmitPayload, ShopPayPaymentRequestShippingLine, ShopPayPaymentRequestShippingLineInput, ShopPayPaymentRequestTotalShippingPrice, ShopPayPaymentRequestTotalShippingPriceInput, ShopPayWalletContentInput, ShopPolicy, ShopPolicyWithDefault, Sitemap, SitemapResourcesArgs, SitemapImage, SitemapResource, SitemapResourceInterface, SitemapResourceMetaobject, SitemapType, StoreAvailability, StoreAvailabilityConnection, StoreAvailabilityEdge, StringConnection, StringEdge, SubmissionError, SubmissionErrorCode, SubmitAlreadyAccepted, SubmitFailed, SubmitSuccess, SubmitThrottled, Swatch, TaxonomyCategory, TaxonomyMetafieldFilter, Trackable, UnitPriceMeasurement, UnitPriceMeasurementMeasuredType, UnitPriceMeasurementMeasuredUnit, UnitSystem, UrlRedirect, UrlRedirectConnection, UrlRedirectEdge, UserError, UserErrorsShopPayPaymentRequestSessionUserErrors, UserErrorsShopPayPaymentRequestSessionUserErrorsCode, VariantOptionFilter, Video, VideoSource, VisitorConsent, WeightUnit } from 'storefront/storefront.types.d'
  import('storefront/storefront.types.d')
}
export { H3Event, H3Error, appendCorsHeaders, appendCorsPreflightHeaders, appendHeader, appendHeaders, appendResponseHeader, appendResponseHeaders, assertMethod, callNodeListener, clearResponseHeaders, clearSession, createApp, createAppEventHandler, createError, createEvent, createEventStream, createRouter, defaultContentType, defineEventHandler, defineLazyEventHandler, defineNodeListener, defineNodeMiddleware, defineRequestMiddleware, defineResponseMiddleware, defineWebSocket, defineWebSocketHandler, deleteCookie, dynamicEventHandler, eventHandler, fetchWithEvent, fromNodeMiddleware, fromPlainHandler, fromWebHandler, getCookie, getHeader, getHeaders, getMethod, getProxyRequestHeaders, getQuery, getRequestFingerprint, getRequestHeader, getRequestHeaders, getRequestHost, getRequestIP, getRequestPath, getRequestProtocol, getRequestURL, getRequestWebStream, getResponseHeader, getResponseHeaders, getResponseStatus, getResponseStatusText, getRouterParam, getRouterParams, getSession, getValidatedQuery, getValidatedRouterParams, handleCacheHeaders, handleCors, isCorsOriginAllowed, isError, isEvent, isEventHandler, isMethod, isPreflightRequest, isStream, isWebResponse, lazyEventHandler, parseCookies, promisifyNodeListener, proxyRequest, readBody, readFormData, readMultipartFormData, readRawBody, readValidatedBody, removeResponseHeader, sanitizeStatusCode, sanitizeStatusMessage, sealSession, send, sendError, sendIterable, sendNoContent, sendProxy, sendRedirect, sendStream, sendWebResponse, serveStatic, setCookie, setHeader, setHeaders, setResponseHeader, setResponseHeaders, setResponseStatus, splitCookiesString, toEventHandler, toNodeListener, toPlainHandler, toWebHandler, toWebRequest, unsealSession, updateSession, useBase, useSession, writeEarlyHints } from 'h3';
export { useNitroApp } from 'nitropack/runtime/internal/app';
export { useRuntimeConfig, useAppConfig } from 'nitropack/runtime/internal/config';
export { defineNitroPlugin, nitroPlugin } from 'nitropack/runtime/internal/plugin';
export { defineCachedFunction, defineCachedEventHandler, cachedFunction, cachedEventHandler } from 'nitropack/runtime/internal/cache';
export { useStorage } from 'nitropack/runtime/internal/storage';
export { defineRenderHandler } from 'nitropack/runtime/internal/renderer';
export { defineRouteMeta } from 'nitropack/runtime/internal/meta';
export { getRouteRules } from 'nitropack/runtime/internal/route-rules';
export { useEvent } from 'nitropack/runtime/internal/context';
export { defineTask, runTask } from 'nitropack/runtime/internal/task';
export { defineNitroErrorHandler } from 'nitropack/runtime/internal/error/utils';
export { buildAssetsURL as __buildAssetsURL, publicAssetsURL as __publicAssetsURL } from '/home/olive/Repositories/stitch-ash/node_modules/.pnpm/@nuxt+nitro-server@4.4.6_@babel+plugin-syntax-typescript@7.28.6_@babel+core@7.29.0__db0_98812eafb88dd10d4ca957f6d9b93d29/node_modules/@nuxt/nitro-server/dist/runtime/utils/paths';
export { defineAppConfig } from '/home/olive/Repositories/stitch-ash/node_modules/.pnpm/@nuxt+nitro-server@4.4.6_@babel+plugin-syntax-typescript@7.28.6_@babel+core@7.29.0__db0_98812eafb88dd10d4ca957f6d9b93d29/node_modules/@nuxt/nitro-server/dist/runtime/utils/config';
export { useStorefront } from '/home/olive/Repositories/stitch-ash/node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/storefront/client';
export { getUserSession } from '/home/olive/Repositories/stitch-ash/.nuxt/shopify/auth-utils';
export { flattenConnection } from '/home/olive/Repositories/stitch-ash/node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/utils/flattenConnection';
export { defineWebhookEventHandler } from '/home/olive/Repositories/stitch-ash/node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/handler';
export { validate as validateWebhook } from '/home/olive/Repositories/stitch-ash/node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/validation';
export { getWebhookTopic, getWebhookHmac, getWebhookShopDomain, getWebhookApiVersion, getWebhookId, getWebhookTriggeredAt, getWebhookEventId } from '/home/olive/Repositories/stitch-ash/node_modules/.pnpm/@nuxtjs+shopify@0.5.4_@parcel+watcher@2.5.6_@shopify+hydrogen@2026.1.1_@react-router+de_7925308caab84dc88d7138824bc3d3be/node_modules/@nuxtjs/shopify/dist/runtime/server/utils/webhooks/functions';
export { useImage } from '/home/olive/Repositories/stitch-ash/node_modules/.pnpm/@nuxt+image@2.0.0_db0@0.3.4_ioredis@5.10.1_magicast@0.5.3/node_modules/@nuxt/image/dist/runtime/server/utils/image';
export { defineI18nLocale, defineI18nConfig } from '/home/olive/Repositories/stitch-ash/node_modules/.pnpm/@nuxtjs+i18n@10.4.0_@vue+compiler-dom@3.5.34_db0@0.3.4_eslint@10.4.0_jiti@2.7.0__ioredi_0ac4f61bdc806aab7d42ff13177fc620/node_modules/@nuxtjs/i18n/dist/runtime/composables/shared';
export { defineI18nLocaleDetector } from '/home/olive/Repositories/stitch-ash/node_modules/.pnpm/@nuxtjs+i18n@10.4.0_@vue+compiler-dom@3.5.34_db0@0.3.4_eslint@10.4.0_jiti@2.7.0__ioredi_0ac4f61bdc806aab7d42ff13177fc620/node_modules/@nuxtjs/i18n/dist/runtime/composables/server';
export { useTranslation } from '@intlify/h3';
export { getCookieLocale, getHeaderLanguage, getHeaderLanguages, getHeaderLocale, getHeaderLocales, getPathLocale, getQueryLocale, setCookieLocale, tryCookieLocale, tryHeaderLocale, tryHeaderLocales, tryPathLocale, tryQueryLocale } from '@intlify/utils/h3';
export { ARTICLE_FRAGMENT, BLOG_FRAGMENT } from '/home/olive/Repositories/stitch-ash/graphql/fragments/blog';
export { CART_LINE_FRAGMENT, CART_LINE_CONNECTION_FRAGMENT, CART_FRAGMENT, CART_USER_ERRORS_FRAGMENT } from '/home/olive/Repositories/stitch-ash/graphql/fragments/cart';
export { COLLECTION_FRAGMENT, COLLECTION_CONNECTION_FRAGMENT } from '/home/olive/Repositories/stitch-ash/graphql/fragments/collection';
export { CUSTOMER_FRAGMENT } from '/home/olive/Repositories/stitch-ash/graphql/fragments/customer';
export { MENU_ITEM_FRAGMENT, MENU_FRAGMENT } from '/home/olive/Repositories/stitch-ash/graphql/fragments/menu';
export { PRODUCT_VARIANT_FRAGMENT, PRODUCT_OPTION_FRAGMENT, PRODUCT_VARIANT_CONNECTION_FRAGMENT, PRODUCT_FRAGMENT, PRODUCT_CONNECTION_FRAGMENT, PRODUCT_FILTERS_FRAGMENT } from '/home/olive/Repositories/stitch-ash/graphql/fragments/product';
export { IMAGE_FRAGMENT, PRICE_FRAGMENT } from '/home/olive/Repositories/stitch-ash/graphql/fragments/utils';
export { cartGetInputSchema, cartLineInputSchema, cartUpdateInputSchema, cartRemoveInputSchema } from '/home/olive/Repositories/stitch-ash/graphql/validation/cart';
export { collectionInputSchema } from '/home/olive/Repositories/stitch-ash/graphql/validation/collection';
export { menuGetInputSchema } from '/home/olive/Repositories/stitch-ash/graphql/validation/menu';
export { productFilterSchema, productSortKeysSchema, productConnectionParamsSchema, productInputSchema } from '/home/olive/Repositories/stitch-ash/graphql/validation/product';
export { localizationParamsSchema, connectionParamsSchema, predictiveSearchParamsSchema, priceRangeFilterSchema, metafieldFilterSchema, categoryFilterSchema, taxonomyMetafieldFilterSchema, variantOptionFilterSchema } from '/home/olive/Repositories/stitch-ash/graphql/validation/utils';