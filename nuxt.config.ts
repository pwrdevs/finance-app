// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  modules: ['@nuxtjs/tailwindcss', '@nuxt/eslint', '@nuxtjs/supabase'],
  app: {
    head: {
      title: 'PWRDEVS Finance',
      meta: [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'PWRDEVS Finance' }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/pwrdevs-logo.png' },
        { rel: 'apple-touch-icon', href: '/pwrdevs-logo.png' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  },
  supabase: {
    redirect: false
  },
  tailwindcss: {
    exposeConfig: true,
    viewer: false
  },
  srcDir: 'app/',
  runtimeConfig: {
    adminEmail: process.env.ADMIN_EMAIL || '',
    public: {
      adminEmail: process.env.ADMIN_EMAIL || '',
      appEnv: process.env.NUXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development',
      sessionInactivityDays: Number(process.env.NUXT_PUBLIC_SESSION_INACTIVITY_DAYS || 7)
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
