<template>
  <div class="date-range-picker">
    <div class="date-input-group">
      <label>{{ t('reports.dateRange.from') }}</label>
      <input 
        type="date" 
        v-model="localStartDate" 
        @change="emitChange"
        :max="localEndDate"
        class="date-input"
      />
    </div>
    <div class="date-input-group">
      <label>{{ t('reports.dateRange.to') }}</label>
      <input 
        type="date" 
        v-model="localEndDate" 
        @change="emitChange"
        :min="localStartDate"
        :max="today"
        class="date-input"
      />
    </div>
    <button @click="applyRange" class="btn-apply">
      {{ t('common.apply') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  startDate?: string
  endDate?: string
}

const props = withDefaults(defineProps<Props>(), {
  startDate: () => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  },
  endDate: () => new Date().toISOString().split('T')[0]
})

const emit = defineEmits<{
  (e: 'update:startDate', value: string): void
  (e: 'update:endDate', value: string): void
  (e: 'change', value: { startDate: string; endDate: string }): void
}>()

const localStartDate = ref(props.startDate)
const localEndDate = ref(props.endDate)
const today = new Date().toISOString().split('T')[0]

watch(() => props.startDate, (val) => { localStartDate.value = val })
watch(() => props.endDate, (val) => { localEndDate.value = val })

function emitChange() {
  emit('update:startDate', localStartDate.value)
  emit('update:endDate', localEndDate.value)
}

function applyRange() {
  emit('change', {
    startDate: localStartDate.value,
    endDate: localEndDate.value
  })
}
</script>

<style scoped>
.date-range-picker {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date-input-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
}

.date-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: 'Pretendard', sans-serif;
  transition: border-color 0.2s;
}

.date-input:focus {
  outline: none;
  border-color: #EB5D19;
  box-shadow: 0 0 0 3px rgba(235, 93, 25, 0.1);
}

.btn-apply {
  padding: 0.5rem 1.25rem;
  background-color: #EB5D19;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  height: fit-content;
}

.btn-apply:hover {
  background-color: #d14d12;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .date-range-picker {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn-apply {
    width: 100%;
  }
}
</style>
