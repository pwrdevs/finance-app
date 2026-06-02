<script setup lang="ts">
type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type AppButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    label?: string
    type?: 'button' | 'submit' | 'reset'
    variant?: AppButtonVariant
    size?: AppButtonSize
    block?: boolean
    disabled?: boolean
  }>(),
  {
    label: '',
    type: 'button',
    variant: 'primary',
    size: 'md',
    block: false,
    disabled: false
  }
)

const baseClass =
  'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-dark/50 disabled:cursor-not-allowed disabled:opacity-50'

const variantClassMap: Record<AppButtonVariant, string> = {
  primary: 'bg-primary-dark text-surface shadow-soft hover:-translate-y-0.5 hover:bg-primary',
  secondary: 'bg-primary-light text-foreground hover:bg-primary/30',
  ghost: 'bg-transparent text-foreground hover:bg-primary-light/45',
  danger: 'bg-rose-700 text-white hover:bg-rose-600'
}

const sizeClassMap: Record<AppButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base'
}

const buttonClasses = computed(() => [
  baseClass,
  variantClassMap[props.variant],
  sizeClassMap[props.size],
  props.block ? 'w-full' : ''
])
</script>

<template>
  <button :type="type" :disabled="disabled" :class="buttonClasses">
    <slot>
      {{ label }}
    </slot>
  </button>
</template>
