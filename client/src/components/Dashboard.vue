<template>
  <div class="dashboard" :class="theme">
    <!-- ===== SIDEBAR ===== -->
    <aside class="sidebar">
      <div class="sidebarHeader">
        <img :src="logoUrl" alt="NetGUARD" class="sidebarLogo" />
        <span class="logoText">NetGUARD</span>
      </div>

      <nav class="nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="navItem"
          :class="{ active: currentSection === item.id }"
          @click="navigateTo(item.id)"
        >
          <span class="navIcon" v-html="icons[item.icon]"></span>
          <span class="navLabel">{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebarFooter">
        <button class="themeBtn" @click="toggleTheme">
          <span v-html="isLight ? icons.moon : icons.sun"></span>
        </button>
        <button class="logoutBtn" @click="logout">
          <span class="logoutIcon" v-html="icons.logout"></span>
          <span>Deconnexion</span>
        </button>
      </div>
    </aside>

    <!-- ===== MOBILE SIDEBAR OVERLAY ===== -->
    <div
      v-if="mobileMenuOpen"
      class="mobileOverlay"
      @click="mobileMenuOpen = false"
    ></div>
    <aside v-if="mobileMenuOpen" class="mobileSidebar">
      <div class="mobileSidebarHeader">
        <img :src="logoUrl" alt="NetGUARD" class="mobileSidebarLogo" />
        <span class="mobileLogoText">NetGUARD</span>
        <button class="mobileCloseBtn" @click="mobileMenuOpen = false">
          <span v-html="icons.close"></span>
        </button>
      </div>
      <nav class="mobileNav">
        <button
          v-for="item in navItems"
          :key="'m-' + item.id"
          class="mobileNavItem"
          :class="{ active: currentSection === item.id }"
          @click="navigateTo(item.id); mobileMenuOpen = false"
        >
          <span class="navIcon" v-html="icons[item.icon]"></span>
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <div class="mobileSidebarFooter">
        <button class="themeBtn" @click="toggleTheme">
          <span v-html="isLight ? icons.moon : icons.sun"></span>
        </button>
        <button class="logoutBtn" @click="logout">
          <span class="logoutIcon" v-html="icons.logout"></span>
          <span>Deconnexion</span>
        </button>
      </div>
    </aside>

    <!-- ===== MAIN CONTENT ===== -->
    <main class="main">
      <!-- Header -->
      <header class="header">
        <div class="headerLeft">
          <button class="hamburgerBtn" @click="mobileMenuOpen = true">
            <span v-html="icons.menu"></span>
          </button>
          <div>
            <h1>{{ pageTitle }}</h1>
            <p>Bienvenue, <span class="userName">{{ userName }}</span></p>
          </div>
        </div>

        <div class="headerRight">
          <div class="userAvatar">
            <span>{{ userInitials }}</span>
          </div>
        </div>
      </header>

      <!-- Admin Panel -->
      <AdminPanel v-if="currentSection === 'admin'" :currentUser="user" />

      <!-- Empty Dashboard -->
      <section v-else class="emptyDashboard">
        <div class="emptyContent">
          <div class="emptyIcon" v-html="icons.dashboard"></div>
          <h2>Tableau de bord</h2>
          <p>Bienvenue sur NetGUARD. Votre espace est pret.</p>
        </div>
      </section>
    </main>

    <!-- ===== BOTTOM NAV BAR (Mobile) ===== -->
    <nav class="bottomNav">
      <button
        v-for="item in navItems"
        :key="'b-' + item.id"
        class="bottomNavItem"
        :class="{ active: currentSection === item.id }"
        @click="navigateTo(item.id)"
      >
        <span class="bottomNavIcon" v-html="icons[item.icon]"></span>
        <span class="bottomNavLabel">{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import logoUrl from '../assets/netguard-logo.png';
import AdminPanel from './AdminPanel.vue';
import { icons } from '../utils/icons.js';

const route = useRoute();
const router = useRouter();

const props = defineProps({
  user: {
    type: Object,
    default: () => ({ email: 'admin@netguard.io', name: 'Administrateur', role: 'user' })
  }
});

const emit = defineEmits(['logout']);

/* ===== Theme ===== */
const theme = ref('dark');
const isLight = computed(() => theme.value === 'light');

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

watch(theme, (t) => {
  localStorage.setItem('ng-theme', t);
  document.documentElement.setAttribute('data-theme', t);
});

/* ===== User ===== */
const isAdmin = computed(() => props.user?.role === 'admin');
const userName = computed(() => {
  if (props.user?.firstName && props.user?.lastName) {
    return `${props.user.firstName} ${props.user.lastName}`;
  }
  return props.user?.fullName || props.user?.name || props.user?.email?.split('@')[0] || 'Utilisateur';
});
const userInitials = computed(() => {
  const name = userName.value;
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

/* ===== Navigation (route-based) ===== */
const mobileMenuOpen = ref(false);

const currentSection = computed(() => route.name || 'dashboard');

function navigateTo(name) {
  router.push({ name });
}

const pageTitles = {
  dashboard: 'Tableau de bord',
  admin: 'Administration'
};

const pageTitle = computed(() => pageTitles[currentSection.value] || 'Tableau de bord');

const navItems = computed(() => {
  const items = [
    { id: 'dashboard', icon: 'dashboard', label: 'Tableau de bord' }
  ];

  if (isAdmin.value) {
    items.push({ id: 'admin', icon: 'admin', label: 'Admin Panel' });
  }

  return items;
});

/* ===== Logout ===== */
function logout() {
  emit('logout');
}

/* ===== Lifecycle ===== */
onMounted(() => {
  const saved = localStorage.getItem('ng-theme');
  if (saved === 'dark' || saved === 'light') {
    theme.value = saved;
  }
  document.documentElement.setAttribute('data-theme', theme.value);
});
</script>

<style scoped>
/* ===========================
   VARIABLES
   =========================== */
.dashboard {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 100vh;

  --bg: #0a0f1a;
  --bg-card: rgba(15, 23, 42, 0.8);
  --bg-hover: rgba(255, 255, 255, 0.04);
  --border: rgba(255, 255, 255, 0.07);
  --text: rgba(255, 255, 255, 0.9);
  --text-muted: rgba(255, 255, 255, 0.55);
  --accent: #58a6b0;
  --accent-glow: rgba(88, 166, 176, 0.2);
}

.dashboard.light {
  --bg: #f0f4f8;
  --bg-card: rgba(255, 255, 255, 0.9);
  --bg-hover: rgba(0, 0, 0, 0.03);
  --border: rgba(0, 0, 0, 0.07);
  --text: rgba(15, 23, 42, 0.9);
  --text-muted: rgba(15, 23, 42, 0.55);
}

@media (max-width: 1024px) {
  .dashboard {
    grid-template-columns: 72px 1fr;
  }

  .sidebarLogo {
    width: 36px !important;
  }

  .logoText,
  .navLabel,
  .logoutBtn span:last-child {
    display: none;
  }

  .nav {
    align-items: center;
  }

  .navItem {
    justify-content: center;
    padding: 12px !important;
  }
}

@media (max-width: 768px) {
  .dashboard {
    grid-template-columns: 1fr;
    padding-bottom: 64px;
  }

  .sidebar {
    display: none;
  }

  .hamburgerBtn {
    display: flex;
  }

  .bottomNav {
    display: flex;
  }

  .main {
    padding: 16px;
  }

  .headerLeft h1 {
    font-size: 18px;
  }
}

/* ===========================
   SIDEBAR
   =========================== */
.sidebar {
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  backdrop-filter: blur(20px);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.sidebarHeader {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}

.sidebarLogo {
  width: 44px;
  filter: drop-shadow(0 2px 8px rgba(88, 166, 176, 0.15));
}

.logoText {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.3px;
}

.nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.navItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 400;
  border-radius: 8px;
  cursor: pointer;
  transition: all 200ms ease;
  position: relative;
}

.navItem:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.navItem.active {
  background: rgba(88, 166, 176, 0.1);
  color: var(--accent);
}

.navItem.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 55%;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
}

.navIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.sidebarFooter {
  display: flex;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.themeBtn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  background: var(--bg-hover);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 200ms ease;
}

.themeBtn:hover {
  background: rgba(88, 166, 176, 0.1);
  border-color: var(--accent);
  color: var(--accent);
}

.logoutBtn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid rgba(212, 85, 85, 0.25);
  background: rgba(212, 85, 85, 0.06);
  color: var(--ng-red, #d45555);
  font-size: 13px;
  font-weight: 400;
  border-radius: 8px;
  cursor: pointer;
  transition: all 200ms ease;
}

.logoutBtn:hover {
  background: rgba(212, 85, 85, 0.12);
  border-color: rgba(212, 85, 85, 0.4);
}

.logoutIcon {
  display: flex;
  align-items: center;
}

/* ===========================
   MAIN
   =========================== */
.main {
  padding: 24px;
  overflow-y: auto;
  background: var(--bg);
}

/* ===== Header ===== */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 12px;
}

.headerLeft h1 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.headerLeft p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 400;
}

.userName {
  font-weight: 500;
  color: var(--text);
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 12px;
}

.userAvatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--ng-blue-night, #0d1117), var(--accent));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
  font-size: 13px;
  cursor: default;
}

/* ===== Empty Dashboard ===== */
.emptyDashboard {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 140px);
}

.emptyContent {
  text-align: center;
  color: var(--text-muted);
}

.emptyIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  color: var(--accent);
  opacity: 0.7;
}

.emptyIcon :deep(svg) {
  width: 32px;
  height: 32px;
}

.emptyContent h2 {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px;
}

.emptyContent p {
  font-size: 14px;
  margin: 0;
  color: var(--text-muted);
}

/* ===========================
   HAMBURGER BUTTON
   =========================== */
.hamburgerBtn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 200ms ease;
  flex-shrink: 0;
}

.hamburgerBtn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

/* ===========================
   MOBILE SIDEBAR OVERLAY
   =========================== */
.mobileOverlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 900;
  backdrop-filter: blur(2px);
}

.mobileSidebar {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  max-width: 85vw;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  backdrop-filter: blur(20px);
  z-index: 1000;
  flex-direction: column;
  padding: 16px;
  overflow-y: auto;
  animation: slideInLeft 200ms ease;
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.mobileSidebarHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}

.mobileSidebarLogo {
  width: 36px;
  filter: drop-shadow(0 2px 8px rgba(88, 166, 176, 0.15));
}

.mobileLogoText {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
}

.mobileCloseBtn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 150ms ease;
}

.mobileCloseBtn:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.mobileNav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mobileNavItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 400;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;
}

.mobileNavItem:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.mobileNavItem.active {
  background: rgba(88, 166, 176, 0.1);
  color: var(--accent);
}

.mobileSidebarFooter {
  display: flex;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  margin-top: 12px;
}

/* ===========================
   BOTTOM NAVIGATION BAR
   =========================== */
.bottomNav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  backdrop-filter: blur(20px);
  z-index: 800;
  align-items: center;
  justify-content: space-around;
  padding: 0 8px;
}

.bottomNavItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 150ms ease;
  border-radius: 8px;
  min-width: 56px;
}

.bottomNavItem:hover {
  color: var(--text);
}

.bottomNavItem.active {
  color: var(--accent);
}

.bottomNavIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.bottomNavLabel {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

@media (max-width: 768px) {
  .mobileOverlay {
    display: block;
  }

  .mobileSidebar {
    display: flex;
  }
}

@media (min-width: 769px) {
  .mobileOverlay,
  .mobileSidebar,
  .bottomNav {
    display: none !important;
  }
}

/* ===========================
   SMALL SCREENS (< 480px)
   =========================== */
@media (max-width: 480px) {
  .main {
    padding: 12px;
  }

  .header {
    gap: 10px;
  }

  .headerLeft h1 {
    font-size: 16px;
  }

  .userAvatar {
    width: 36px;
    height: 36px;
  }

  .bottomNavItem {
    min-width: 48px;
    padding: 6px 8px;
  }
}
</style>
