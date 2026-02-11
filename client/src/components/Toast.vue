<template>
  <Teleport to="body">
    <TransitionGroup
      name="toast"
      tag="div"
      class="toastContainer"
      :class="theme"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="[toast.type, { closable: toast.closable }]"
        role="alert"
        :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
      >
        <div class="toastIcon" v-html="getIcon(toast.type)">
        </div>
        <div class="toastContent">
          <strong v-if="toast.title" class="toastTitle">{{ toast.title }}</strong>
          <p class="toastMessage">{{ toast.message }}</p>
        </div>
        <button
          v-if="toast.closable"
          class="toastClose"
          @click="remove(toast.id)"
          aria-label="Fermer"
        >
          ×
        </button>
        <div
          v-if="toast.duration"
          class="toastProgress"
          :style="{ animationDuration: toast.duration + 'ms' }"
        ></div>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup>
import { ref, reactive, inject, provide, onMounted, onUnmounted } from 'vue';
import { icons } from '../utils/icons.js';

const theme = inject('theme', ref('dark'));

const toasts = reactive([]);
let toastId = 0;

const getIcon = (type) => {
  const iconMap = {
    success: icons.toastSuccess,
    error: icons.toastError,
    warning: icons.toastWarning,
    info: icons.toastInfo,
    security: icons.toastSecurity,
    loading: icons.toastLoading
  };
  return iconMap[type] || iconMap.info;
};

const add = (options) => {
  const id = ++toastId;
  const toast = {
    id,
    type: options.type || 'info',
    title: options.title || '',
    message: options.message || '',
    duration: options.duration ?? 5000,
    closable: options.closable ?? true
  };

  toasts.push(toast);

  if (toast.duration > 0) {
    setTimeout(() => remove(id), toast.duration);
  }

  return id;
};

const remove = (id) => {
  const index = toasts.findIndex(t => t.id === id);
  if (index > -1) {
    toasts.splice(index, 1);
  }
};

const clear = () => {
  toasts.splice(0, toasts.length);
};

// Shorthand methods
const success = (message, options = {}) => add({ ...options, type: 'success', message });
const error = (message, options = {}) => add({ ...options, type: 'error', message });
const warning = (message, options = {}) => add({ ...options, type: 'warning', message });
const info = (message, options = {}) => add({ ...options, type: 'info', message });
const security = (message, options = {}) => add({ ...options, type: 'security', message });
const loading = (message, options = {}) => add({ ...options, type: 'loading', message, duration: 0, closable: false });

// Provide toast API
const toastApi = { add, remove, clear, success, error, warning, info, security, loading };
provide('toast', toastApi);

// Global event listener for toast events
const handleToastEvent = (event) => {
  if (event.detail) {
    add(event.detail);
  }
};

onMounted(() => {
  window.addEventListener('toast', handleToastEvent);
});

onUnmounted(() => {
  window.removeEventListener('toast', handleToastEvent);
});

// Expose API
defineExpose(toastApi);
</script>

<style scoped>
.toastContainer {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
  width: 100%;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(7, 31, 52, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(118, 204, 214, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  position: relative;
  overflow: hidden;
}

.toast.success {
  border-color: rgba(57, 255, 20, 0.4);
  background: rgba(7, 31, 52, 0.95);
}

.toast.error {
  border-color: rgba(237, 64, 59, 0.4);
  background: rgba(45, 15, 15, 0.95);
}

.toast.warning {
  border-color: rgba(255, 193, 7, 0.4);
  background: rgba(45, 35, 10, 0.95);
}

.toast.info {
  border-color: rgba(118, 204, 214, 0.4);
}

.toast.security {
  border-color: rgba(156, 39, 176, 0.4);
  background: rgba(35, 15, 45, 0.95);
}

.toast.loading {
  border-color: rgba(118, 204, 214, 0.4);
}

.toastIcon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
}

.toast.success .toastIcon {
  background: rgba(57, 255, 20, 0.2);
  color: var(--ng-green, #3da382);
}

.toast.error .toastIcon {
  background: rgba(237, 64, 59, 0.2);
  color: #ed403b;
}

.toast.warning .toastIcon {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.toast.info .toastIcon {
  background: rgba(118, 204, 214, 0.2);
  color: #76ccd6;
}

.toast.security .toastIcon {
  background: rgba(156, 39, 176, 0.2);
  color: #9c27b0;
}

.toast.loading .toastIcon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.toastContent {
  flex: 1;
  min-width: 0;
}

.toastTitle {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.toastMessage {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  word-wrap: break-word;
}

.toastClose {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.toastClose:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.toastProgress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: currentColor;
  opacity: 0.3;
  animation: progress linear forwards;
}

@keyframes progress {
  from { width: 100%; }
  to { width: 0%; }
}

.toast.success .toastProgress { background: var(--ng-green, #3da382); }
.toast.error .toastProgress { background: #ed403b; }
.toast.warning .toastProgress { background: #ffc107; }
.toast.info .toastProgress { background: #76ccd6; }

/* Transitions */
.toast-enter-active {
  animation: toastIn 0.3s ease-out;
}

.toast-leave-active {
  animation: toastOut 0.3s ease-in forwards;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* Light theme */
.light .toast {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(7, 31, 52, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.light .toastTitle {
  color: #071f34;
}

.light .toastMessage {
  color: rgba(7, 31, 52, 0.7);
}

.light .toast.error {
  background: rgba(255, 240, 240, 0.95);
}

.light .toast.warning {
  background: rgba(255, 250, 230, 0.95);
}

.light .toast.success {
  background: rgba(240, 255, 240, 0.95);
}

/* Mobile */
@media (max-width: 480px) {
  .toastContainer {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
}
</style>
