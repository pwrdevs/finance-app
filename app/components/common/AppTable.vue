<script setup lang="ts">
interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows: Record<string, unknown>[]
    rowKey?: string
    emptyMessage?: string
  }>(),
  {
    rowKey: 'id',
    emptyMessage: 'No data found.'
  }
)

function cellAlignClass(align?: 'left' | 'center' | 'right') {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

function getRowKey(row: Record<string, unknown>, index: number) {
  const key = row[props.rowKey]
  return typeof key === 'string' || typeof key === 'number' ? key : index
}
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-border bg-surface shadow-panel">
    <table class="min-w-full divide-y divide-border text-sm">
      <thead class="bg-primary-light/35">
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            class="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
            :class="cellAlignClass(column.align)"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-border">
        <tr v-for="(row, rowIndex) in rows" :key="getRowKey(row, rowIndex)" class="hover:bg-primary-light/20">
          <td
            v-for="column in columns"
            :key="column.key"
            class="whitespace-nowrap px-4 py-3 text-foreground"
            :class="cellAlignClass(column.align)"
          >
            <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>

        <tr v-if="rows.length === 0">
          <td :colspan="columns.length" class="px-4 py-8 text-center text-muted">
            {{ emptyMessage }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
