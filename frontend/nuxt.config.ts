// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  devServer: {
    port: 3001,
  },

  modules: [
    '@nuxtjs/apollo',
    '@pinia/nuxt',
  ],

  css: ['~/assets/css/theme.css'],

  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        },
      ],
    },
  },

  apollo: {
    clients: {
      default: {
        httpEndpoint: process.env.NUXT_PUBLIC_SHOP_API_URL || 'http://localhost:3000/shop-api',
        httpLinkOptions: {
          credentials: 'include',
        },
      },
    },
  },

  pinia: {
    storesDirs: ['./stores/**'],
  },

  ssr: true,

  routeRules: {
    '/products/**': { ssr: true },
    '/products': { ssr: true },
    '/': { ssr: true },
  },

  runtimeConfig: {
    public: {
      shopApiUrl: process.env.NUXT_PUBLIC_SHOP_API_URL || 'http://localhost:3000/shop-api',
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },
})
