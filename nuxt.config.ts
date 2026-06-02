// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@nuxt/eslint', '@nuxtjs/supabase'],
  srcDir: 'app/',
  runtimeConfig: {
    public: {
      appEnv: process.env.NUXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development'
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
