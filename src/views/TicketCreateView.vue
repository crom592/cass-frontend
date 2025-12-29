<template>
  <div class="ticket-create">
    <Navbar />

    <div class="content">
      <div class="page-header">
        <h1>{{ t('ticket.createNewTicket') }}</h1>
        <p class="subtitle">{{ t('ticket.fillDetailsBelow') }}</p>
      </div>

      <div class="form-card">
        <form @submit.prevent="handleSubmit">
          <!-- Ticket Information Section -->
          <div class="form-section">
            <h2 class="section-title">{{ t('ticket.ticketInformation') }}</h2>

            <div class="form-group">
              <label for="title" class="form-label">{{ t('ticket.title') }} *</label>
              <input
                id="title"
                v-model="form.title"
                type="text"
                class="form-input"
                :class="{ 'input-error': errors.title }"
                :placeholder="t('ticket.title')"
                @blur="validateTitle"
              />
              <span v-if="errors.title" class="error-message">{{ errors.title }}</span>
            </div>

            <div class="form-group">
              <label for="description" class="form-label">{{ t('ticket.description') }}</label>
              <textarea
                id="description"
                v-model="form.description"
                class="form-textarea"
                :placeholder="t('ticket.description')"
                rows="4"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="channel" class="form-label">{{ t('ticket.channel') }}</label>
                <select id="channel" v-model="form.channel" class="form-select">
                  <option v-for="option in channelOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="category" class="form-label">{{ t('ticket.category') }}</label>
                <select id="category" v-model="form.category" class="form-select">
                  <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="priority" class="form-label">{{ t('ticket.priority') }}</label>
                <select id="priority" v-model="form.priority" class="form-select">
                  <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Asset Information Section -->
          <div class="form-section">
            <h2 class="section-title">{{ t('asset.title') }}</h2>

            <div class="form-row">
              <div class="form-group">
                <label for="site" class="form-label">{{ t('asset.site') }} *</label>
                <select
                  id="site"
                  v-model="form.site_id"
                  class="form-select"
                  :class="{ 'input-error': errors.site_id }"
                  :disabled="loadingSites"
                  @change="handleSiteChange"
                >
                  <option value="">{{ loadingSites ? t('asset.loadingSites') : t('asset.selectSite') }}</option>
                  <option v-for="site in sites" :key="site.id" :value="site.id">
                    {{ site.name }} ({{ site.code }})
                  </option>
                </select>
                <span v-if="errors.site_id" class="error-message">{{ errors.site_id }}</span>
              </div>

              <div class="form-group">
                <label for="charger" class="form-label">{{ t('asset.charger') }}</label>
                <select
                  id="charger"
                  v-model="form.charger_id"
                  class="form-select"
                  :disabled="!form.site_id || loadingChargers"
                >
                  <option value="">
                    {{ loadingChargers ? t('asset.loadingChargers') : (form.site_id ? t('asset.selectCharger') : t('asset.selectSiteFirst')) }}
                  </option>
                  <option v-for="charger in chargers" :key="charger.id" :value="charger.id">
                    {{ charger.name }} ({{ charger.serial_number }})
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Reporter Information Section -->
          <div class="form-section">
            <h2 class="section-title">{{ t('reporter.title') }}</h2>

            <div class="form-row">
              <div class="form-group">
                <label for="reporter_name" class="form-label">{{ t('reporter.name') }}</label>
                <input
                  id="reporter_name"
                  v-model="form.reporter_name"
                  type="text"
                  class="form-input"
                  :placeholder="t('reporter.enterName')"
                />
              </div>

              <div class="form-group">
                <label for="reporter_email" class="form-label">{{ t('reporter.email') }}</label>
                <input
                  id="reporter_email"
                  v-model="form.reporter_email"
                  type="email"
                  class="form-input"
                  :class="{ 'input-error': errors.reporter_email }"
                  :placeholder="t('reporter.enterEmail')"
                  @blur="validateEmail"
                />
                <span v-if="errors.reporter_email" class="error-message">{{ errors.reporter_email }}</span>
              </div>

              <div class="form-group">
                <label for="reporter_phone" class="form-label">{{ t('reporter.phone') }}</label>
                <input
                  id="reporter_phone"
                  v-model="form.reporter_phone"
                  type="tel"
                  class="form-input"
                  :placeholder="t('reporter.enterPhone')"
                />
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="handleCancel" :disabled="isSubmitting">
              {{ t('common.cancel') }}
            </button>
            <button type="submit" class="btn-primary" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="loading-spinner"></span>
              {{ isSubmitting ? t('ticket.creatingTicket') : t('ticket.createTicket') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue3-toastify'
import Navbar from '@/components/Navbar.vue'
import { apiClient } from '@/services/api'
import type { Site, Charger } from '@/types/index'
import { TicketChannel, TicketCategory, TicketPriority } from '@/types/index'
import { useEnumTranslation } from '@/composables/useI18n'

const { t } = useI18n()
const router = useRouter()
const { getChannelOptions, getCategoryOptions, getPriorityOptions } = useEnumTranslation()

// Form state
const form = reactive({
  title: '',
  description: '',
  site_id: '',
  charger_id: '',
  channel: TicketChannel.WEB,
  category: TicketCategory.OTHER,
  priority: TicketPriority.MEDIUM,
  reporter_name: '',
  reporter_email: '',
  reporter_phone: '',
})

// Validation errors
const errors = reactive({
  title: '',
  site_id: '',
  reporter_email: '',
})

// Loading states
const isSubmitting = ref(false)
const loadingSites = ref(false)
const loadingChargers = ref(false)

// Data
const sites = ref<Site[]>([])
const chargers = ref<Charger[]>([])

// Dropdown options - computed to be reactive to locale changes
const channelOptions = computed(() => getChannelOptions())
const categoryOptions = computed(() => getCategoryOptions())
const priorityOptions = computed(() => getPriorityOptions())

// Load sites on mount
onMounted(async () => {
  await loadSites()
})

async function loadSites() {
  loadingSites.value = true
  try {
    const response = await apiClient.getSites()
    sites.value = response.items || response
  } catch (error) {
    console.error('Failed to load sites:', error)
  } finally {
    loadingSites.value = false
  }
}

async function handleSiteChange() {
  // Clear charger selection when site changes
  form.charger_id = ''
  chargers.value = []

  if (form.site_id) {
    await loadChargers()
  }
}

async function loadChargers() {
  if (!form.site_id) return

  loadingChargers.value = true
  try {
    const response = await apiClient.getChargers({ site_id: form.site_id })
    chargers.value = response.items || response
  } catch (error) {
    console.error('Failed to load chargers:', error)
  } finally {
    loadingChargers.value = false
  }
}

// Validation functions
function validateTitle(): boolean {
  if (!form.title.trim()) {
    errors.title = t('validation.titleRequired')
    return false
  }
  errors.title = ''
  return true
}

function validateSite(): boolean {
  if (!form.site_id) {
    errors.site_id = t('validation.siteRequired')
    return false
  }
  errors.site_id = ''
  return true
}

function validateEmail(): boolean {
  if (form.reporter_email && !isValidEmail(form.reporter_email)) {
    errors.reporter_email = t('validation.invalidEmail')
    return false
  }
  errors.reporter_email = ''
  return true
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateForm(): boolean {
  const titleValid = validateTitle()
  const siteValid = validateSite()
  const emailValid = validateEmail()

  return titleValid && siteValid && emailValid
}

async function handleSubmit() {
  if (!validateForm()) {
    toast.error(t('message.error.validationError'))
    return
  }

  isSubmitting.value = true

  try {
    const ticketData = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      site_id: form.site_id,
      charger_id: form.charger_id || null,
      channel: form.channel,
      category: form.category,
      priority: form.priority,
      reporter_name: form.reporter_name.trim() || null,
      reporter_email: form.reporter_email.trim() || null,
      reporter_phone: form.reporter_phone.trim() || null,
    }

    await apiClient.createTicket(ticketData)
    toast.success(t('message.success.ticketCreated'))
    router.push({ name: 'tickets' })
  } catch (error) {
    toast.error(t('message.error.ticketCreateFailed'))
    console.error('Failed to create ticket:', error)
  } finally {
    isSubmitting.value = false
  }
}

function handleCancel() {
  router.push({ name: 'tickets' })
}
</script>

<style scoped>
.ticket-create {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.content {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  color: #333;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  font-size: 0.95rem;
}

.form-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #eee;
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 1.5rem;
  padding-bottom: 0;
}

.section-title {
  font-size: 1.1rem;
  color: #212529;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #EB5D19;
  display: inline-block;
  font-weight: 700;
}

.form-group {
  margin-bottom: 1.25rem;
  flex: 1;
}

.form-row {
  display: flex;
  gap: 1.5rem;
}

.form-row .form-group {
  flex: 1;
}

.form-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #EB5D19;
  box-shadow: 0 0 0 3px rgba(235, 93, 25, 0.1);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #aaa;
}

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1.25em 1.25em;
  padding-right: 2.5rem;
}

.form-select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #999;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.input-error {
  border-color: #e74c3c;
}

.input-error:focus {
  border-color: #e74c3c;
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.15);
}

.error-message {
  display: block;
  color: #e74c3c;
  font-size: 0.8rem;
  margin-top: 0.35rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 140px;
}

.btn-primary {
  background-color: #EB5D19;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #d14d12;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background-color: white;
  color: #495057;
  border: 1px solid #dee2e6;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #ced4da;
  transform: translateY(-1px);
}

.btn-secondary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive styles */
@media (max-width: 768px) {
  .content {
    padding: 1rem;
  }

  .form-card {
    padding: 1.5rem;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>
