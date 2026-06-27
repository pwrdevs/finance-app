<script setup lang="ts">
import AppCard from '~/components/common/AppCard.vue'

definePageMeta({ middleware: 'auth' })

const route = useRoute()

const sections = [
  {
    key: 'people',
    label: 'Responsáveis',
    description: 'Gerencie os responsáveis pelos lançamentos.',
    to: '/people'
  },
  {
    key: 'categories',
    label: 'Categorias',
    description: 'Organize categorias de entrada e saída.',
    to: '/categories'
  },
  {
    key: 'accounts',
    label: 'Contas',
    description: 'Cadastre e mantenha contas bancárias e carteiras.',
    to: '/accounts'
  },
  {
    key: 'cards',
    label: 'Cartões',
    description: 'Cadastre cartões e ciclo de fatura.',
    to: '/cards'
  }
] as const

const activeSection = computed(() => {
  const sectionParam = typeof route.query.section === 'string' ? route.query.section : ''
  return sections.find(section => section.key === sectionParam) ?? sections[0]
})
</script>

<template>
  <section class="space-y-5">
    <AppCard>
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-border/80 bg-surface px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Cadastros</span>
          <span class="rounded-full border border-border/80 bg-surface px-2.5 py-1 text-xs font-semibold text-foreground">Tela principal</span>
        </div>

        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="section in sections"
            :key="section.key"
            :to="{ path: '/cadastro', query: { section: section.key } }"
            class="rounded-xl border px-3 py-2 text-sm font-semibold transition"
            :class="activeSection.key === section.key ? 'border-primary-dark bg-primary-light/30 text-foreground' : 'border-border bg-surface text-muted hover:text-foreground'"
          >
            {{ section.label }}
          </NuxtLink>
        </div>

        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-sm font-semibold text-foreground">{{ activeSection.label }}</p>
          <p class="mt-1 text-xs text-muted">{{ activeSection.description }}</p>

          <div class="mt-4">
            <NuxtLink
              :to="activeSection.to"
              class="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:border-primary"
            >
              Abrir {{ activeSection.label }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </AppCard>
  </section>
</template>
