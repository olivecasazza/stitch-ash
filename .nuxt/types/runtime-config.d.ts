import { RuntimeConfig as UserRuntimeConfig, PublicRuntimeConfig as UserPublicRuntimeConfig } from 'nuxt/schema'
  interface SharedRuntimeConfig {
   app: {
      buildId: string,

      baseURL: string,

      buildAssetsDir: string,

      cdnURL: string,
   },

   shopify: {
      name: string,

      clients: {
         storefront: {
            mock: boolean,

            apiVersion: string,
         },
      },
   },

   nitro: {
      envPrefix: string,
   },

   _shopify: {
      name: string,

      clients: {
         storefront: {
            apiVersion: string,

            retries: number,

            sandbox: boolean,

            mock: boolean,

            documents: Array<string>,

            proxy: {
               path: string,
            },

            cache: {
               client: {
                  ttl: number,
               },

               proxy: {
                  driver: string,
               },

               options: {
                  short: {
                     maxAge: number,

                     staleMaxAge: number,

                     swr: boolean,
                  },

                  long: {
                     maxAge: number,

                     staleMaxAge: number,

                     swr: boolean,
                  },
               },
            },

            autoImport: boolean,
         },
      },

      errors: {
         throw: boolean,
      },

      fragments: {
         paths: Array<string>,

         autoImport: boolean,
      },
   },

   icon: {
      serverKnownCssClasses: Array<any>,
   },
  }
  interface SharedPublicRuntimeConfig {
   _shopify: {
      name: string,

      clients: {
         storefront: {
            apiVersion: string,

            retries: number,

            mock: boolean,

            proxy: {
               path: string,
            },

            cache: {
               client: {
                  ttl: number,
               },

               options: {
                  short: {
                     maxAge: number,

                     staleMaxAge: number,

                     swr: boolean,
                  },

                  long: {
                     maxAge: number,

                     staleMaxAge: number,

                     swr: boolean,
                  },
               },
            },
         },
      },

      errors: {
         throw: boolean,
      },
   },

   i18n: {
      baseUrl: string,

      defaultLocale: string,

      rootRedirect: any,

      redirectStatusCode: number,

      skipSettingLocaleOnNavigate: boolean,

      locales: Array<{

      }>,

      detectBrowserLanguage: {
         alwaysRedirect: boolean,

         cookieCrossOrigin: boolean,

         cookieDomain: any,

         cookieKey: string,

         cookieSecure: boolean,

         fallbackLocale: string,

         redirectOn: string,

         useCookie: boolean,
      },

      experimental: {
         localeDetector: string,

         typedPages: boolean,

         typedOptionsAndMessages: boolean,

         alternateLinkCanonicalQueries: boolean,

         devCache: boolean,

         cacheLifetime: any,

         stripMessagesPayload: boolean,

         preload: boolean,

         strictSeo: boolean,

         nitroContextDetection: boolean,

         httpCacheDuration: number,

         compactRoutes: boolean,

         prerenderMessages: boolean,
      },

      domainLocales: {
         "en-us": {
            domain: string,
         },
      },
   },
  }
declare module '@nuxt/schema' {
  interface RuntimeConfig extends UserRuntimeConfig {}
  interface PublicRuntimeConfig extends UserPublicRuntimeConfig {}
}
declare module 'nuxt/schema' {
  interface RuntimeConfig extends SharedRuntimeConfig {}
  interface PublicRuntimeConfig extends SharedPublicRuntimeConfig {}
}
declare module 'vue' {
        interface ComponentCustomProperties {
          $config: UserRuntimeConfig
        }
      }