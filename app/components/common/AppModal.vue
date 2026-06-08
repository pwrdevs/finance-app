<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    description?: string
    maxWidthClass?: string
  }>(),
  {
    title: '',
    description: '',
    maxWidthClass: 'max-w-lg'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function closeModal() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 z-40 bg-foreground/45 backdrop-blur-sm" @click="closeModal" />
    </Transition>

    <Transition name="slide-up">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-2 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
      >
        <div
          class="flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-panel sm:max-h-[calc(100dvh-2rem)]"
          :class="maxWidthClass"
        >
          <header class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h3 class="text-base font-semibold text-foreground">{{ title }}</h3>
              <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
            </div>

            <button
              type="button"
              class="rounded-lg p-1 text-muted transition hover:bg-primary-light/50 hover:text-foreground"
              aria-label="Close modal"
              @click="closeModal"
            >
              <span aria-hidden="true">x</span>
            </button>
          </header>

          <div class="min-h-0 overflow-y-auto p-5">
            <slot />
          </div>

          <footer class="flex justify-end gap-2 border-t border-border px-5 py-4">
            <slot name="footer">
              <AppButton variant="ghost" label="Cancel" @click="closeModal" />
            </slot>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.24s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
