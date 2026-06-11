<script setup lang="ts">
import AppButton from '~/components/common/AppButton.vue'
import AppInput from '~/components/common/AppInput.vue'
import AppModal from '~/components/common/AppModal.vue'
import type { AccountItem, CardItem, CategoryItem, PersonItem } from '~/composables/useMasterData'

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
const formExpectedValue = ref('')
const formPurchaseDate = ref(new Date().toISOString().slice(0, 10))
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

function resetForm() {
  formTitle.value = ''
  formExpectedValue.value = ''
  formPurchaseDate.value = new Date().toISOString().slice(0, 10)
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

  if (!formPurchaseDate.value) {
    modalError.value = 'Data da compra obrigatoria.'
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

  saving.value = true

  try {
    await createTransaction({
      origin_type: 'single',
      title: formTitle.value.trim(),
      type: selectedCategory.value.type,
      expected_value: parsedExpectedValue,
      real_value: parsedExpectedValue,
      due_date: formPurchaseDate.value,
      instance_date: formPurchaseDate.value,
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
          <AppInput v-model="formExpectedValue" label="Valor" type="number" placeholder="0.00" required />
          <AppInput v-model="formPurchaseDate" label="Data da compra" type="date" required />

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