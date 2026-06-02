<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string | number
    id?: string
    label?: string
    placeholder?: string
    type?: string
    hint?: string
    error?: string
    required?: boolean
  }>(),
  {
    id: undefined,
    label: '',
    placeholder: '',
    type: 'text',
    hint: '',
    error: '',
    required: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const generatedInputId = useId()
const inputId = computed(() => props.id || `input-${generatedInputId}`)
const hasError = computed(() => Boolean(props.error))

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="space-y-2">
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-foreground">
      {{ label }}
      <span v-if="required" class="text-primary-dark">*</span>
    </label>

    <input
      :id="inputId"
      :value="modelValue"
      :placeholder="placeholder"
      :type="type"
      :aria-invalid="hasError"
      class="h-11 w-full rounded-xl border bg-surface px-3 text-sm text-foreground shadow-sm transition placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
      :class="hasError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : 'border-border'"
      @input="onInput"
    />

    <p v-if="error" class="text-xs text-rose-700">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted">{{ hint }}</p>
  </div>
</template>
