<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: true
})
</script>

<template>
  <section class="rounded-2xl border border-border/70 bg-background/40 p-2.5 md:p-3">
    <div class="space-y-2">
      <div class="flex flex-wrap items-center gap-2">
        <slot name="line1" />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="line2" />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="line3" />
      </div>
    </div>
  </section>
</template>
