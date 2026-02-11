<template>
  <main class="page" :class="{ 'dashboard-page': isAuthenticated }">
    <router-view
      v-slot="{ Component, route }"
    >
      <transition name="pageTransition" mode="out-in">
        <!-- Login wrapped in shell for centering -->
        <section v-if="route.meta.guest" class="shell" key="auth">
          <component :is="Component" v-bind="routeProps" />
        </section>
        <!-- Dashboard rendered directly -->
        <component
          v-else
          :is="Component"
          key="dashboard"
          v-bind="routeProps"
        />
      </transition>
    </router-view>

    <!-- Login footer (only on login page) -->
    <footer v-if="!isAuthenticated" class="footer">
      <a class="link" href="#" aria-label="NetGUARD">
        &copy; {{ new Date().getFullYear() }} NetGUARD
      </a>
      <span class="dot">&bull;</span>
      <a class="link" href="#" aria-label="Support">Support</a>
      <span class="dot">&bull;</span>
      <a class="link" href="#" aria-label="Politique de confidentialite">Confidentialite</a>
    </footer>
  </main>

  <!-- Toast Notifications -->
  <Toast ref="toastRef" />
</template>

<script setup>
import { ref, computed, provide, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import Toast from "./components/Toast.vue";
import { wsService } from "./services/websocket.js";
import { authApi } from "./services/api.js";

const router = useRouter();
const route = useRoute();

const isAuthenticated = ref(false);
const currentUser = ref(null);
const toastRef = ref(null);
const theme = ref('dark');

// Provide theme globally
provide('theme', theme);

// Toast helper
const showToast = (options) => {
  if (toastRef.value) {
    toastRef.value.add(options);
  }
};
provide('showToast', showToast);

// Props passed to the current route component
const routeProps = computed(() => {
  if (route.meta.guest) {
    return { onLoginSuccess: handleLoginSuccess };
  }
  return { user: currentUser.value, onLogout: handleLogout };
});

function handleLoginSuccess(userData) {
  currentUser.value = userData;
  isAuthenticated.value = true;

  // Connect WebSocket
  const token = localStorage.getItem('ng-token');
  if (token) {
    wsService.connect(token);
    wsService.on('notification', (data) => {
      showToast({
        type: data.type || 'info',
        title: data.title,
        message: data.message
      });
    });
  }

  showToast({
    type: 'success',
    title: 'Bienvenue !',
    message: `Connecte en tant que ${userData.fullName || userData.email}`
  });

  router.push({ name: 'dashboard' });
}

function handleLogout() {
  isAuthenticated.value = false;
  currentUser.value = null;
  authApi.clear();
  wsService.disconnect();

  showToast({
    type: 'info',
    message: 'Vous etes deconnecte'
  });

  router.push({ name: 'login' });
}

// Check for existing session on mount
onMounted(() => {
  const token = localStorage.getItem('ng-token');
  const user = localStorage.getItem('ng-user');

  if (token && user) {
    try {
      currentUser.value = JSON.parse(user);
      isAuthenticated.value = true;
      wsService.connect(token);
    } catch (e) {
      localStorage.removeItem('ng-token');
      localStorage.removeItem('ng-user');
    }
  }

  // Handle OAuth callback
  const urlParams = new URLSearchParams(window.location.search);
  const oauthToken = urlParams.get('token');
  const oauthUser = urlParams.get('user');

  if (oauthToken && oauthUser) {
    localStorage.setItem('ng-token', oauthToken);
    localStorage.setItem('ng-user', oauthUser);
    handleLoginSuccess(JSON.parse(oauthUser));
  }

  // Listen for auth logout event (from API 401)
  window.addEventListener('auth:logout', handleLogout);
});

onUnmounted(() => {
  wsService.disconnect();
  window.removeEventListener('auth:logout', handleLogout);
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px 16px;
}

.page.dashboard-page {
  padding: 0;
  display: block;
}

.shell {
  width: min(980px, 100%);
  display: grid;
  gap: 18px;
  justify-items: center;
}

/* ===== PAGE TRANSITIONS ===== */
.pageTransition-enter-active,
.pageTransition-leave-active {
  transition: all 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

.pageTransition-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.pageTransition-leave-to {
  opacity: 0;
  transform: scale(1.02) translateY(-10px);
}

/* ===== FOOTER ===== */
.footer {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  padding-top: 18px;
}

.dot {
  opacity: 0.6;
}

.link {
  color: rgba(118, 204, 214, 0.95);
  transition: opacity 160ms ease;
}
.link:hover {
  opacity: 0.85;
}

/* ===== FIX MODE CLAIR ===== */
:global(html[data-theme="light"]) .footer {
  color: rgba(54, 57, 63, 0.65);
}

:global(html[data-theme="light"]) .link {
  color: rgba(12, 75, 130, 0.85);
}
</style>
