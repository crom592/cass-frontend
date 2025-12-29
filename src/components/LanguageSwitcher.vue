<template>
  <div class="language-switcher">
    <button
      @click="toggleDropdown"
      class="switcher-button"
      :aria-label="t('language.switchLanguage')"
      :aria-expanded="isOpen"
    >
      <span class="current-lang">{{ currentLocaleConfig.nativeName }}</span>
      <svg
        class="chevron-icon"
        :class="{ rotated: isOpen }"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown-menu" role="menu">
        <button
          v-for="locale in supportedLocales"
          :key="locale.code"
          @click="selectLocale(locale.code)"
          class="dropdown-item"
          :class="{ active: locale.code === currentLocale }"
          role="menuitem"
        >
          <span class="locale-native">{{ locale.nativeName }}</span>
          <span class="locale-name">{{ locale.name }}</span>
          <svg
            v-if="locale.code === currentLocale"
            class="check-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale, type SupportedLocale } from '@/composables/useI18n'

const { t } = useI18n()
const { currentLocale, currentLocaleConfig, supportedLocales, setLocale } = useLocale()

const isOpen = ref(false)

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectLocale(locale: SupportedLocale) {
  setLocale(locale)
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.language-switcher')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.language-switcher {
  position: relative;
}

.switcher-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #495057;
  transition: all 0.2s;
}

.switcher-button:hover {
  background-color: #f8f9fa;
  border-color: #ced4da;
}

.current-lang {
  font-weight: 500;
}

.chevron-icon {
  transition: transform 0.2s;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 160px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 1rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s;
}

.dropdown-item:hover {
  background-color: #f8f9fa;
}

.dropdown-item.active {
  background-color: #fff5f0;
}

.locale-native {
  font-weight: 500;
  color: #333;
}

.locale-name {
  font-size: 0.8rem;
  color: #868e96;
  flex: 1;
}

.check-icon {
  color: #EB5D19;
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
