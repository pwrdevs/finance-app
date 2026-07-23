<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'

type AppErrorAlertTone = 'error' | 'warning'

const props = withDefaults(
  defineProps<{
    title: string
    message: string
    tone?: AppErrorAlertTone
    actionLabel?: string
    actionLoading?: boolean
    actionDisabled?: boolean
  }>(),
  {
    tone: 'error',
    actionLabel: '',
    actionLoading: false,
    actionDisabled: false
  }
)

const emit = defineEmits<{
  (event: 'action'): void
}>()

const containerClass = computed(() => {
  if (props.tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-900'
  }

  return 'border-rose-200 bg-rose-50 text-rose-900'
})

const iconClass = computed(() => (props.tone === 'warning' ? 'text-amber-700' : 'text-rose-700'))
const textClass = computed(() => (props.tone === 'warning' ? 'text-amber-800' : 'text-rose-800'))
</script>

<template>
  <div class="rounded-xl border px-4 py-3" :class="containerClass" role="alert" aria-live="polite">
    <div class="flex items-start gap-3">
      <svg
        class="mt-0.5 h-4 w-4 shrink-0"
        :class="iconClass"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-11a1 1 0 011 1v3a1 1 0 11-2 0V8a1 1 0 011-1zm0 7a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 14z"
          clip-rule="evenodd"
        />
      </svg>

      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold" :class="textClass">{{ title }}</p>
        <p class="mt-1 text-xs leading-relaxed" :class="textClass">{{ message }}</p>

        <div v-if="actionLabel" class="mt-3">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            :disabled="actionDisabled || actionLoading"
            @click="emit('action')"
          >
            {{ actionLoading ? 'Tentando...' : actionLabel }}
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>