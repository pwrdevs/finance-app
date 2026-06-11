<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import type { AccountItem, CardItem, CategoryItem, PersonItem } from '~/composables/useMasterData'
import type { RecurringEndMode, RecurringFrequency, TransactionOriginType } from '~/composables/useTransactions'

const { createTransaction, listFilterOptions } = useTransactions()

const openTransactionModalSignal = useState<number>('transactions-open-modal-signal', () => 0)

const isOpen = ref(false)
const loadingOptions = ref(false)
const saving = ref(false)
const modalError = ref('')
const successMessage = ref('')

const people = ref<PersonItem[]>([])
const accounts = ref<AccountItem[]>([])
const cards = ref<CardItem[]>([])
const categories = ref<CategoryItem[]>([])

const formTitle = ref('')
const formOriginType = ref<TransactionOriginType>('single')
const formExpectedValue = ref('')
const formPurchaseDate = ref(new Date().toISOString().slice(0, 10))
const formInstallmentTotal = ref('1')
const formRecurringStartDate = ref(new Date().toISOString().slice(0, 10))
const formRecurringFrequency = ref<RecurringFrequency>('monthly')
const formRecurringEndingMode = ref<RecurringEndMode>('count')
const formRecurringOccurrences = ref('12')
const formRecurringEndDate = ref('')
const formPersonId = ref('')
const formCategoryId = ref('')
const formPaymentMethod = ref('')
const formDescription = ref('')

const paymentMethodOptions = computed(() => {
  const accountOptions = accounts.value.map(entry => ({ value: `account:${entry.id}`, label: `Conta - ${entry.name}` }))
  const cardOptions = cards.value.map(entry => ({ value: `card:${entry.id}`, label: `Cartao - ${entry.name}` }))
  return [...accountOptions, ...cardOptions]
})

const selectedCategory = computed(() => categories.value.find(entry => entry.id === formCategoryId.value) ?? null)
const selectedCard = computed(() => {
  const payment = getPaymentMethodParts(formPaymentMethod.value)
  return payment.kind === 'card' ? cards.value.find(entry => entry.id === payment.id) ?? null : null
})
const showInstallmentSelector = computed(() => formOriginType.value === 'single' && Boolean(selectedCard.value))
const expectedValueLabel = computed(() => {
  if (formOriginType.value === 'recurring') {
    return 'Valor por ocorrencia'
  }

  if (showInstallmentSelector.value && Number(formInstallmentTotal.value) > 1) {
    return 'Valor da parcela'
  }

  return 'Valor'
})
const expectedValueHelpText = computed(() => {
  if (showInstallmentSelector.value && Number(formInstallmentTotal.value) > 1) {
    return 'Informe o valor de cada parcela. O sistema criara uma ocorrencia por parcela.'
  }

  return ''
})

function resetForm() {
  formTitle.value = ''
  formOriginType.value = 'single'
  formExpectedValue.value = ''
  formPurchaseDate.value = new Date().toISOString().slice(0, 10)
  formInstallmentTotal.value = '1'
  formRecurringStartDate.value = new Date().toISOString().slice(0, 10)
  formRecurringFrequency.value = 'monthly'
  formRecurringEndingMode.value = 'count'
  formRecurringOccurrences.value = '12'
  formRecurringEndDate.value = ''
  formPersonId.value = ''
  formCategoryId.value = ''
  formPaymentMethod.value = ''
  formDescription.value = ''
  modalError.value = ''
}

async function loadOptionsIfNeeded() {
  if (people.value.length || accounts.value.length || cards.value.length || categories.value.length) {
    return
  }

  loadingOptions.value = true

  try {
    const options = await listFilterOptions()
    people.value = options.people
    accounts.value = options.accounts
    cards.value = options.cards
    categories.value = options.categories
  } catch (error) {
    modalError.value = error instanceof Error ? error.message : 'Nao foi possivel carregar os dados do formulario.'
  } finally {
    loadingOptions.value = false
  }
}

function getPaymentMethodParts(value: string) {
  const [kind, id] = value.split(':')

  if (!kind || !id) {
    return { kind: null, id: null }
  }

  if (kind !== 'account' && kind !== 'card') {
    return { kind: null, id: null }
  }

  return { kind, id }
}

function openModalFromFab() {
  isOpen.value = true
  successMessage.value = ''
  resetForm()
  void loadOptionsIfNeeded()
}

function closeModal() {
  isOpen.value = false
  modalError.value = ''
}

async function submit() {
  modalError.value = ''

  if (!formTitle.value.trim()) {
    modalError.value = 'Descricao obrigatoria.'
    return
  }

  const parsedExpectedValue = Number(formExpectedValue.value)
  if (Number.isNaN(parsedExpectedValue) || parsedExpectedValue <= 0) {
    modalError.value = 'Valor deve ser maior que zero.'
    return
  }

  if (!formCategoryId.value || !selectedCategory.value) {
    modalError.value = 'Categoria obrigatoria.'
    return
  }

  const payment = getPaymentMethodParts(formPaymentMethod.value)
  if (!payment.id || !payment.kind) {
    modalError.value = 'Forma de pagamento obrigatoria.'
    return
  }

  const parsedInstallmentTotal = Number(formInstallmentTotal.value)
  const parsedRecurringOccurrences = Number(formRecurringOccurrences.value)

  if (showInstallmentSelector.value) {
    if (!Number.isInteger(parsedInstallmentTotal) || parsedInstallmentTotal < 1 || parsedInstallmentTotal > 24) {
      modalError.value = 'Parcelas devem estar entre 1 e 24.'
      return
    }
  }

  if (formOriginType.value === 'single' && !formPurchaseDate.value) {
    modalError.value = 'Data da compra obrigatoria.'
    return
  }

  if (formOriginType.value === 'recurring') {
    if (!formRecurringStartDate.value) {
      modalError.value = 'Data inicial da recorrencia obrigatoria.'
      return
    }

    if (formRecurringEndingMode.value === 'end_date' && !formRecurringEndDate.value) {
      modalError.value = 'Data final da recorrencia obrigatoria.'
      return
    }

    if (formRecurringEndingMode.value === 'end_date' && formRecurringEndDate.value < formRecurringStartDate.value) {
      modalError.value = 'Data final deve ser maior ou igual a data inicial da recorrencia.'
      return
    }

    if (formRecurringEndingMode.value === 'count' && (!Number.isInteger(parsedRecurringOccurrences) || parsedRecurringOccurrences < 1)) {
      modalError.value = 'Quantidade de recorrencias deve ser maior ou igual a 1.'
      return
    }
  }

  const resolvedOriginType = formOriginType.value === 'single' && payment.kind === 'card' && parsedInstallmentTotal > 1
    ? 'installment'
    : formOriginType.value

  saving.value = true

  try {
    await createTransaction({
      origin_type: resolvedOriginType,
      title: formTitle.value.trim(),
      type: selectedCategory.value.type,
      expected_value: parsedExpectedValue,
      real_value: parsedExpectedValue,
      due_date: formOriginType.value === 'recurring' ? formRecurringStartDate.value : formPurchaseDate.value,
      instance_date: formOriginType.value === 'recurring' ? formRecurringStartDate.value : formPurchaseDate.value,
      installment_total: resolvedOriginType === 'installment' ? parsedInstallmentTotal : undefined,
      installment_start_date: resolvedOriginType === 'installment' ? formPurchaseDate.value : undefined,
      recurring_start_date: formOriginType.value === 'recurring' ? formRecurringStartDate.value : undefined,
      recurring_end_mode: formOriginType.value === 'recurring' ? formRecurringEndingMode.value : undefined,
      recurring_end_date: formOriginType.value === 'recurring' && formRecurringEndingMode.value === 'end_date'
        ? formRecurringEndDate.value
        : null,
      recurring_no_end_date: false,
      recurring_frequency: formOriginType.value === 'recurring' ? formRecurringFrequency.value : undefined,
      recurring_occurrences_count: formOriginType.value === 'recurring' && formRecurringEndingMode.value === 'count'
        ? parsedRecurringOccurrences
        : null,
      recurring_occurrences_limit: formOriginType.value === 'recurring' && formRecurringEndingMode.value === 'count'
        ? parsedRecurringOccurrences
        : null,
      person_id: formPersonId.value || null,
      account_id: payment.kind === 'account' ? payment.id : null,
      card_id: payment.kind === 'card' ? payment.id : null,
      category_id: formCategoryId.value,
      description: formDescription.value.trim() || null,
      status: 'pending',
      is_checked: false
    })

    closeModal()
    successMessage.value = 'Lancamento criado com sucesso.'
  } catch (error) {
    modalError.value = error instanceof Error ? error.message : 'Nao foi possivel criar o lancamento.'
  } finally {
    saving.value = false
  }
}

watch(formPaymentMethod, () => {
  if (!showInstallmentSelector.value) {
    formInstallmentTotal.value = '1'
  }
})

watch(openTransactionModalSignal, (nextValue, prevValue) => {
  if (!nextValue || nextValue === prevValue) {
    return
  }

  openModalFromFab()
})
</script>

<template>
  <AppModal
    v-model="isOpen"
    title="Novo lancamento"
    description="Crie um lancamento rapido sem sair da tela atual."
    max-width-class="max-w-2xl"
  >
    <div class="space-y-4">
      <p v-if="loadingOptions" class="text-sm text-muted">Carregando opcoes...</p>

      <template v-else>
        <div class="grid gap-4 sm:grid-cols-2">
          <AppInput v-model="formTitle" label="Descricao" placeholder="Ex.: Mercado" required />

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Tipo do lancamento</label>
            <select v-model="formOriginType" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="single">Compra unica</option>
              <option value="recurring">Compra recorrente</option>
            </select>
          </div>

          <AppInput v-model="formExpectedValue" :label="expectedValueLabel" type="number" placeholder="0.00" required />

          <AppInput
            v-if="formOriginType === 'single'"
            v-model="formPurchaseDate"
            label="Data da compra"
            type="date"
            required
          />

          <AppInput
            v-if="showInstallmentSelector"
            v-model="formInstallmentTotal"
            label="Parcelas"
            type="number"
            placeholder="1 a 24"
            required
          />

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Forma de pagamento</label>
            <select v-model="formPaymentMethod" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground" required>
              <option value="">Selecione</option>
              <option v-for="entry in paymentMethodOptions" :key="entry.value" :value="entry.value">{{ entry.label }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Categoria</label>
            <select v-model="formCategoryId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground" required>
              <option value="">Selecione</option>
              <option v-for="entry in categories" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Responsavel</label>
            <select v-model="formPersonId" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="">Nenhum</option>
              <option v-for="entry in people" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
            </select>
          </div>
        </div>

        <p v-if="expectedValueHelpText" class="text-xs text-muted">{{ expectedValueHelpText }}</p>

        <div v-if="formOriginType === 'recurring'" class="grid gap-4 rounded-xl border border-border p-3 sm:grid-cols-2">
          <AppInput v-model="formRecurringStartDate" label="Data inicial" type="date" required />

          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">Frequencia</label>
            <select v-model="formRecurringFrequency" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>

          <div class="space-y-2 sm:col-span-2">
            <label class="block text-sm font-medium text-foreground">Encerrar recorrencia por</label>
            <select v-model="formRecurringEndingMode" class="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground">
              <option value="count">Quantidade</option>
              <option value="end_date">Data final</option>
            </select>
          </div>

          <AppInput
            v-if="formRecurringEndingMode === 'count'"
            v-model="formRecurringOccurrences"
            label="Quantidade de recorrencias"
            type="number"
            placeholder="Ex.: 12"
          />

          <AppInput
            v-if="formRecurringEndingMode === 'end_date'"
            v-model="formRecurringEndDate"
            label="Data final"
            type="date"
          />
        </div>

        <AppInput v-model="formDescription" label="Observacoes" placeholder="Detalhes opcionais" />

        <p v-if="modalError" class="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{{ modalError }}</p>
      </template>
    </div>

    <template #footer>
      <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
        <AppButton label="Cancelar" variant="ghost" :disabled="saving" block @click="closeModal" />
        <AppButton :label="saving ? 'Salvando...' : 'Salvar'" :disabled="saving || loadingOptions" block @click="submit" />
      </div>
    </template>
  </AppModal>

  <Transition name="fade-toast">
    <div
      v-if="successMessage"
      class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-soft sm:bottom-6"
      role="status"
      aria-live="polite"
      @click="successMessage = ''"
    >
      {{ successMessage }}
    </div>
  </Transition>
</template>

<style scoped>
.fade-toast-enter-active,
.fade-toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-toast-enter-from,
.fade-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>