import { computed } from 'vue'
import { useI18n as useVueI18n } from 'vue-i18n'
import { setStoredLocale } from '@/i18n'

export type SupportedLocale = 'ko' | 'en'

export interface LocaleConfig {
  code: SupportedLocale
  name: string
  nativeName: string
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'en', name: 'English', nativeName: 'English' },
]

export function useLocale() {
  const { locale, t } = useVueI18n()

  const currentLocale = computed<SupportedLocale>(() => locale.value as SupportedLocale)

  const currentLocaleConfig = computed(() =>
    SUPPORTED_LOCALES.find(l => l.code === currentLocale.value) || SUPPORTED_LOCALES[0]
  )

  function setLocale(newLocale: SupportedLocale): void {
    locale.value = newLocale
    setStoredLocale(newLocale)
    // Update document lang attribute for accessibility
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale
    }
  }

  function toggleLocale(): void {
    const newLocale = currentLocale.value === 'ko' ? 'en' : 'ko'
    setLocale(newLocale)
  }

  return {
    currentLocale,
    currentLocaleConfig,
    supportedLocales: SUPPORTED_LOCALES,
    setLocale,
    toggleLocale,
    t,
  }
}

// Date/Time formatting by locale
export function useDateTimeFormat() {
  const { currentLocale } = useLocale()

  const dateLocale = computed(() => {
    return currentLocale.value === 'ko' ? 'ko-KR' : 'en-US'
  })

  function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-'

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'

    return date.toLocaleDateString(dateLocale.value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return '-'

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'

    return date.toLocaleString(dateLocale.value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatTime(dateString: string | null | undefined): string {
    if (!dateString) return '-'

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'

    return date.toLocaleTimeString(dateLocale.value, {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatRelativeTime(dateString: string | null | undefined): string {
    if (!dateString) return '-'

    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '-'

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (currentLocale.value === 'ko') {
      if (diffSec < 60) return '방금 전'
      if (diffMin < 60) return `${diffMin}분 전`
      if (diffHour < 24) return `${diffHour}시간 전`
      if (diffDay < 7) return `${diffDay}일 전`
      return formatDate(dateString)
    } else {
      if (diffSec < 60) return 'just now'
      if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
      if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
      if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
      return formatDate(dateString)
    }
  }

  return {
    dateLocale,
    formatDate,
    formatDateTime,
    formatTime,
    formatRelativeTime,
  }
}

// Number formatting by locale
export function useNumberFormat() {
  const { currentLocale } = useLocale()

  const numberLocale = computed(() => {
    return currentLocale.value === 'ko' ? 'ko-KR' : 'en-US'
  })

  function formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-'
    return value.toLocaleString(numberLocale.value)
  }

  function formatCurrency(value: number | null | undefined, currency?: string): string {
    if (value === null || value === undefined) return '-'

    const currencyCode = currency || (currentLocale.value === 'ko' ? 'KRW' : 'USD')

    return value.toLocaleString(numberLocale.value, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'KRW' ? 0 : 2,
      maximumFractionDigits: currencyCode === 'KRW' ? 0 : 2,
    })
  }

  function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-'

    return value.toLocaleString(numberLocale.value, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })
  }

  function formatMinutes(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) return '-'

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (currentLocale.value === 'ko') {
      if (hours > 0) {
        return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`
      }
      return `${mins}분`
    } else {
      if (hours > 0) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
      }
      return `${mins}m`
    }
  }

  return {
    numberLocale,
    formatNumber,
    formatCurrency,
    formatPercent,
    formatMinutes,
  }
}

// Enum value translations
export function useEnumTranslation() {
  const { t } = useVueI18n()

  function translateStatus(status: string): string {
    const key = `status.${status}` as const
    const translated = t(key)
    // If translation key not found, return formatted original
    if (translated === key) {
      return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }
    return translated
  }

  function translatePriority(priority: string): string {
    const key = `priority.${priority}` as const
    const translated = t(key)
    if (translated === key) {
      return priority.charAt(0).toUpperCase() + priority.slice(1)
    }
    return translated
  }

  function translateCategory(category: string): string {
    const key = `category.${category}` as const
    const translated = t(key)
    if (translated === key) {
      return category.charAt(0).toUpperCase() + category.slice(1)
    }
    return translated
  }

  function translateChannel(channel: string): string {
    const key = `channel.${channel}` as const
    const translated = t(key)
    if (translated === key) {
      return channel.charAt(0).toUpperCase() + channel.slice(1)
    }
    return translated
  }

  function translateWorkType(workType: string): string {
    const key = `workType.${workType}` as const
    const translated = t(key)
    if (translated === key) {
      return workType.charAt(0).toUpperCase() + workType.slice(1)
    }
    return translated
  }

  function translateChargerStatus(status: string): string {
    const key = `chargerStatus.${status}` as const
    const translated = t(key)
    if (translated === key) {
      return status.charAt(0).toUpperCase() + status.slice(1)
    }
    return translated
  }

  // Get options array for select dropdowns with translated labels
  function getStatusOptions() {
    const statuses = ['new', 'assigned', 'in_progress', 'pending_customer', 'pending_vendor', 'resolved', 'closed', 'cancelled']
    return statuses.map(status => ({
      value: status,
      label: translateStatus(status),
    }))
  }

  function getPriorityOptions() {
    const priorities = ['critical', 'high', 'medium', 'low']
    return priorities.map(priority => ({
      value: priority,
      label: translatePriority(priority),
    }))
  }

  function getCategoryOptions() {
    const categories = ['hardware', 'software', 'network', 'power', 'connector', 'firmware', 'other']
    return categories.map(category => ({
      value: category,
      label: translateCategory(category),
    }))
  }

  function getChannelOptions() {
    const channels = ['phone', 'email', 'web', 'mobile', 'auto']
    return channels.map(channel => ({
      value: channel,
      label: translateChannel(channel),
    }))
  }

  function getWorkTypeOptions() {
    const workTypes = ['diagnosis', 'repair', 'testing', 'communication', 'travel', 'waiting', 'other']
    return workTypes.map(workType => ({
      value: workType,
      label: translateWorkType(workType),
    }))
  }

  return {
    translateStatus,
    translatePriority,
    translateCategory,
    translateChannel,
    translateWorkType,
    translateChargerStatus,
    getStatusOptions,
    getPriorityOptions,
    getCategoryOptions,
    getChannelOptions,
    getWorkTypeOptions,
  }
}
