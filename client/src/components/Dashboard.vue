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
          <span v-if="item.badge" class="navBadge">{{ item.badge }}</span>
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
          <span v-if="item.badge" class="navBadge">{{ item.badge }}</span>
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
          <div class="searchBox">
            <span class="searchIcon" v-html="icons.search"></span>
            <input type="text" placeholder="Rechercher..." v-model="searchQuery" />
          </div>

          <button class="notifBtn">
            <span v-html="icons.bell"></span>
            <span class="notifDot"></span>
          </button>

          <div class="userAvatar" @click="navigateTo('profile')" title="Mon profil">
            <span>{{ userInitials }}</span>
          </div>
        </div>
      </header>

      <!-- Admin Panel -->
      <AdminPanel v-if="currentSection === 'admin'" :currentUser="user" />

      <!-- Network Tools -->
      <NetworkTools v-else-if="currentSection === 'networkTools'" />

      <!-- Dedicated Pages -->
      <NetworkView v-else-if="currentSection === 'network'" />
      <SecurityView v-else-if="currentSection === 'security'" />
      <DevicesView v-else-if="currentSection === 'devices'" />
      <ReportsView v-else-if="currentSection === 'reports'" />
      <ProfileView v-else-if="currentSection === 'profile'" :user="user" />

      <!-- Alerts (dedicated page) -->
      <section v-else-if="currentSection === 'alerts'" class="alertsFullPage">
        <div class="card">
          <div class="cardHeader">
            <h2>Toutes les alertes</h2>
            <button class="markAllBtn" @click="markAllRead" :disabled="markingAllRead">
              {{ markingAllRead ? 'Marquage...' : 'Tout marquer comme lu' }}
            </button>
          </div>
          <div v-if="allAlerts.length === 0" class="emptyAlerts">Aucune alerte</div>
          <div v-else class="alertsList">
            <div
              v-for="(alert, i) in allAlerts"
              :key="alert.id"
              class="alertItem"
              :class="alert.type"
              :style="{ '--delay': i * 0.04 + 's' }"
            >
              <div class="alertIcon" v-html="icons[alert.icon]"></div>
              <div class="alertContent">
                <span class="alertTitle">{{ alert.title }}</span>
                <span class="alertTime">{{ alert.time }}</span>
              </div>
              <div class="alertStatus" :class="alert.type">
                {{ alert.status }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Settings Panel -->
      <section v-else-if="currentSection === 'settings'" class="settingsPanel">
        <!-- Apparence -->
        <div class="card settingsCard">
          <div class="cardHeader">
            <h2>Apparence</h2>
          </div>
          <div class="settingsItem">
            <div class="settingsInfo">
              <span class="settingsIcon" v-html="icons.palette"></span>
              <div>
                <span class="settingsLabel">Theme de l'interface</span>
                <span class="settingsDesc">Choisis entre le mode sombre et le mode clair</span>
              </div>
            </div>
            <div class="themeSwitch">
              <button
                class="themeSwitchBtn"
                :class="{ active: theme === 'dark' }"
                @click="theme = 'dark'"
              >
                <span v-html="icons.moon"></span> Sombre
              </button>
              <button
                class="themeSwitchBtn"
                :class="{ active: theme === 'light' }"
                @click="theme = 'light'"
              >
                <span v-html="icons.sun"></span> Clair
              </button>
            </div>
          </div>
        </div>

        <!-- Modules -->
        <div class="card settingsCard" style="margin-top: 16px;">
          <div class="cardHeader">
            <h2>Modules</h2>
          </div>
          <p class="settingsSubtitle">Active ou desactive les sections du tableau de bord</p>
          <div class="modulesList">
            <div
              v-for="(mod, key) in moduleStore"
              :key="key"
              class="moduleItem"
            >
              <div class="moduleInfo">
                <span class="moduleIcon" v-html="icons[mod.icon]"></span>
                <div>
                  <span class="moduleLabel">{{ mod.label }}</span>
                  <span class="moduleDesc">{{ mod.description }}</span>
                </div>
              </div>
              <button
                class="moduleToggle"
                :class="{ active: mod.enabled }"
                @click="toggleModule(key)"
                :aria-label="mod.enabled ? 'Desactiver ' + mod.label : 'Activer ' + mod.label"
              >
                <span class="toggleTrack">
                  <span class="toggleThumb"></span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Dashboard Content -->
      <template v-else>
      <!-- Stats Cards -->
      <section class="statsGrid">
        <div
          v-for="(stat, index) in stats"
          :key="stat.id"
          class="statCard"
          :class="stat.colorClass"
          :style="{ '--delay': index * 0.1 + 's' }"
        >
          <div class="statIcon" v-html="icons[stat.icon]"></div>
          <div class="statInfo">
            <span class="statValue">{{ stat.value }}</span>
            <span class="statLabel">{{ stat.label }}</span>
          </div>
          <div class="statTrend" :class="stat.trendClass">
            <span>{{ stat.trend }}</span>
          </div>
        </div>
      </section>

      <!-- Main Grid -->
      <div class="contentGrid" :class="{ noAlerts: !isModuleEnabled('alerts'), noDevices: !isModuleEnabled('devices') }">
        <!-- Activity Chart -->
        <section class="card chartCard">
          <div class="cardHeader">
            <h2>Activite reseau</h2>
            <div class="cardActions">
              <button
                v-for="period in periods"
                :key="period"
                class="periodBtn"
                :class="{ active: activePeriod === period }"
                @click="activePeriod = period"
              >
                {{ period }}
              </button>
            </div>
          </div>
          <div class="chartContainer">
            <canvas ref="chartCanvas"></canvas>
          </div>
        </section>

        <!-- Recent Alerts -->
        <section v-if="isModuleEnabled('alerts')" class="card alertsCard">
          <div class="cardHeader">
            <h2>Alertes recentes</h2>
            <button class="seeAllBtn">Voir tout</button>
          </div>
          <div class="alertsList">
            <div
              v-for="(alert, i) in alerts"
              :key="alert.id"
              class="alertItem"
              :class="alert.type"
              :style="{ '--delay': i * 0.08 + 's' }"
            >
              <div class="alertIcon" v-html="icons[alert.icon]"></div>
              <div class="alertContent">
                <span class="alertTitle">{{ alert.title }}</span>
                <span class="alertTime">{{ alert.time }}</span>
              </div>
              <div class="alertStatus" :class="alert.type">
                {{ alert.status }}
              </div>
            </div>
          </div>
        </section>

        <!-- Connected Devices -->
        <section v-if="isModuleEnabled('devices')" class="card devicesCard">
          <div class="cardHeader">
            <h2>Appareils connectes</h2>
            <span class="deviceCount">{{ devices.length }} actifs</span>
          </div>
          <div class="devicesList">
            <div
              v-for="(device, i) in devices"
              :key="device.id"
              class="deviceItem"
              :style="{ '--delay': i * 0.06 + 's' }"
            >
              <div class="deviceIcon" v-html="icons[device.icon]"></div>
              <div class="deviceInfo">
                <span class="deviceName">{{ device.name }}</span>
                <span class="deviceIp">{{ device.ip }}</span>
              </div>
              <div class="deviceStatus" :class="device.status">
                <span class="statusDot"></span>
                {{ device.statusText }}
              </div>
            </div>
          </div>
        </section>

        <!-- Quick Actions -->
        <section class="card actionsCard">
          <div class="cardHeader">
            <h2>Actions rapides</h2>
          </div>
          <div class="actionsGrid">
            <button
              v-for="action in quickActions"
              :key="action.id"
              class="actionBtn"
              :class="action.colorClass"
            >
              <span class="actionIcon" v-html="icons[action.icon]"></span>
              <span class="actionLabel">{{ action.label }}</span>
            </button>
          </div>
        </section>
      </div>
      </template>
    </main>

    <!-- ===== BOTTOM NAV BAR (Mobile) ===== -->
    <nav class="bottomNav">
      <button
        v-for="item in bottomNavItems"
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
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Chart from 'chart.js/auto';
import logoUrl from '../assets/netguard-logo.png';
import AdminPanel from './AdminPanel.vue';
import NetworkTools from './NetworkTools.vue';
import NetworkView from './NetworkView.vue';
import SecurityView from './SecurityView.vue';
import DevicesView from './DevicesView.vue';
import ReportsView from './ReportsView.vue';
import ProfileView from './ProfileView.vue';
import { icons } from '../utils/icons.js';
import { moduleStore, isModuleEnabled, toggleModule } from '../stores/modules.js';
import { dashboardApi } from '../services/api.js';
import { wsService } from '../services/websocket.js';

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
  admin: 'Administration',
  settings: 'Parametres',
  network: 'Reseau',
  security: 'Securite',
  devices: 'Appareils',
  alerts: 'Alertes',
  reports: 'Rapports',
  networkTools: 'Outils reseau',
  profile: 'Mon profil'
};

const pageTitle = computed(() => pageTitles[currentSection.value] || 'Tableau de bord');

const navItems = computed(() => {
  const items = [
    { id: 'dashboard', icon: 'dashboard', label: 'Tableau de bord' }
  ];

  if (isModuleEnabled('network')) items.push({ id: 'network', icon: 'network', label: 'Reseau', badge: '3' });
  if (isModuleEnabled('security')) items.push({ id: 'security', icon: 'security', label: 'Securite' });
  if (isModuleEnabled('devices')) items.push({ id: 'devices', icon: 'devices', label: 'Appareils' });
  if (isModuleEnabled('alerts')) items.push({ id: 'alerts', icon: 'alerts', label: 'Alertes', badge: '5' });
  if (isModuleEnabled('reports')) items.push({ id: 'reports', icon: 'reports', label: 'Rapports' });
  if (isModuleEnabled('networkTools')) items.push({ id: 'networkTools', icon: 'terminal', label: 'Outils reseau' });

  items.push({ id: 'settings', icon: 'settings', label: 'Parametres' });
  if (isAdmin.value) items.push({ id: 'admin', icon: 'admin', label: 'Administration' });

  return items;
});

const bottomNavItems = computed(() => {
  const items = [
    { id: 'dashboard', icon: 'dashboard', label: 'Accueil' }
  ];
  if (isModuleEnabled('networkTools')) items.push({ id: 'networkTools', icon: 'terminal', label: 'Outils' });
  if (isModuleEnabled('alerts')) items.push({ id: 'alerts', icon: 'alerts', label: 'Alertes' });
  items.push({ id: 'settings', icon: 'settings', label: 'Reglages' });
  return items;
});

/* ===== Search ===== */
const searchQuery = ref('');

/* ===== Dashboard Data (loaded from API) ===== */
const loading = ref(false);

// Fallback data used when API is unreachable
const fallbackStats = [
  { id: 1, icon: 'shieldCheck', value: '—', label: 'Protection active', trend: '', trendClass: 'up', colorClass: 'green' },
  { id: 2, icon: 'globe', value: '—', label: 'Connexions actives', trend: '', trendClass: 'up', colorClass: 'blue' },
  { id: 3, icon: 'alertTriangle', value: '—', label: 'Menaces bloquees', trend: '', trendClass: 'down', colorClass: 'red' },
  { id: 4, icon: 'radio', value: '—', label: 'Bande passante', trend: '', trendClass: 'up', colorClass: 'cyan' }
];

const stats = ref(fallbackStats);
const alerts = ref([]);
const devices = ref([]);
const chartLabels = ref([]);
const chartValues = ref([]);

const activePeriod = ref('7d');
const periods = ['24h', '7d', '30d', '90d'];

async function loadDashboardData() {
  loading.value = true;
  try {
    const [statsRes, alertsRes, devicesRes, chartRes] = await Promise.allSettled([
      dashboardApi.getStats(),
      dashboardApi.getAlerts({ limit: 5 }),
      dashboardApi.getDevices(),
      dashboardApi.getChartData(activePeriod.value)
    ]);

    // Stats — API returns nested objects: { protection: { value, trend, trendDirection }, ... }
    if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
      const d = statsRes.value.data;
      const v = (field) => typeof field === 'object' && field !== null ? field.value : field;
      const t = (field, fallback) => typeof field === 'object' && field !== null ? field.trend : fallback;
      const td = (field, fallback) => typeof field === 'object' && field !== null ? (field.trendDirection === 'down' ? 'down' : 'up') : fallback;

      stats.value = [
        { id: 1, icon: 'shieldCheck', value: String(v(d.protection) ?? '99.8%'), label: 'Protection active', trend: t(d.protection, '+0.2%'), trendClass: td(d.protection, 'up'), colorClass: 'green' },
        { id: 2, icon: 'globe', value: String(v(d.connections) ?? 0), label: 'Connexions actives', trend: t(d.connections, '+12%'), trendClass: td(d.connections, 'up'), colorClass: 'blue' },
        { id: 3, icon: 'alertTriangle', value: String(v(d.threats) ?? 0), label: 'Menaces bloquees', trend: t(d.threats, '-8%'), trendClass: td(d.threats, 'down'), colorClass: 'red' },
        { id: 4, icon: 'radio', value: String(v(d.bandwidth) ?? '0 Mb/s'), label: 'Bande passante', trend: t(d.bandwidth, '+5%'), trendClass: td(d.bandwidth, 'up'), colorClass: 'cyan' }
      ];
    }

    // Alerts
    if (alertsRes.status === 'fulfilled' && alertsRes.value?.data) {
      const iconMap = { critical: 'alertCritical', warning: 'alertWarning', info: 'alertInfo', success: 'alertSuccess' };
      const statusMap = { critical: 'Critique', warning: 'Important', info: 'Info', success: 'Succes' };
      alerts.value = alertsRes.value.data.map((a, i) => ({
        id: a.id || i + 1,
        icon: iconMap[a.type] || 'alertInfo',
        title: a.title || a.message,
        time: a.time || a.createdAt || '',
        status: statusMap[a.type] || a.type,
        type: a.type || 'info'
      }));
    }

    // Devices
    if (devicesRes.status === 'fulfilled' && devicesRes.value?.data) {
      const devIconMap = { desktop: 'desktop', laptop: 'laptop', mobile: 'mobile', tablet: 'mobile', tv: 'tv', gaming: 'gaming' };
      devices.value = devicesRes.value.data.map((d, i) => ({
        id: d.id || i + 1,
        icon: devIconMap[d.type] || 'desktop',
        name: d.name,
        ip: d.ip || d.ipAddress || '',
        status: d.status || 'online',
        statusText: d.status === 'online' ? 'En ligne' : d.status === 'idle' ? 'Inactif' : 'Hors ligne'
      }));
    }

    // Chart — API returns { chartData: [{ label, connections, ... }], period }
    if (chartRes.status === 'fulfilled' && chartRes.value?.data) {
      const cd = chartRes.value.data;
      const points = cd.chartData || cd.data || cd;
      if (Array.isArray(points)) {
        chartLabels.value = points.map(p => p.label || p.date || '');
        chartValues.value = points.map(p => p.connections || p.value || 0);
      } else if (cd.labels && cd.values) {
        chartLabels.value = cd.labels;
        chartValues.value = cd.values;
      }
    }
  } catch (e) {
    // Silently fall back to defaults
  } finally {
    loading.value = false;
    await nextTick();
    renderChart();
  }
}

/* ===== Chart.js ===== */
const chartCanvas = ref(null);
let chartInstance = null;

function renderChart() {
  if (!chartCanvas.value) return;
  if (chartInstance) chartInstance.destroy();

  const labels = chartLabels.value.length
    ? chartLabels.value
    : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const data = chartValues.value.length
    ? chartValues.value
    : [65, 80, 72, 90, 85, 45, 38];

  const isDark = theme.value === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Activite',
        data,
        backgroundColor: 'rgba(88, 166, 176, 0.35)',
        borderColor: 'rgba(88, 166, 176, 0.8)',
        borderWidth: 1,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(88, 166, 176, 0.55)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255,255,255,0.95)',
          titleColor: isDark ? '#fff' : '#1e293b',
          bodyColor: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          borderWidth: 1,
          cornerRadius: 6,
          padding: 10,
          titleFont: { size: 12, weight: '500' },
          bodyFont: { size: 11 }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 11 } }
        }
      }
    }
  });
}

watch(activePeriod, async (period) => {
  try {
    const res = await dashboardApi.getChartData(period);
    if (res?.data) {
      const cd = res.data;
      const points = cd.chartData || cd.data || cd;
      if (Array.isArray(points)) {
        chartLabels.value = points.map(p => p.label || p.date || '');
        chartValues.value = points.map(p => p.connections || p.value || 0);
      } else if (cd.labels && cd.values) {
        chartLabels.value = cd.labels;
        chartValues.value = cd.values;
      }
    }
  } catch (e) {
    // Keep existing data
  }
  await nextTick();
  renderChart();
});

watch(theme, () => {
  nextTick(() => renderChart());
});

/* ===== Quick Actions ===== */
const quickActions = [
  { id: 1, icon: 'scanNetwork', label: 'Scanner le reseau', colorClass: 'blue' },
  { id: 2, icon: 'firewall', label: 'Activer le pare-feu', colorClass: 'green' },
  { id: 3, icon: 'generateReport', label: 'Generer un rapport', colorClass: 'purple' },
  { id: 4, icon: 'restart', label: 'Redemarrer le systeme', colorClass: 'orange' }
];

/* ===== Alerts full page ===== */
const allAlerts = ref([]);
const markingAllRead = ref(false);

async function loadAllAlerts() {
  try {
    const res = await dashboardApi.getAlerts({ limit: 50 });
    if (res?.data) {
      const iconMap = { critical: 'alertCritical', warning: 'alertWarning', info: 'alertInfo', success: 'alertSuccess' };
      const statusMap = { critical: 'Critique', warning: 'Important', info: 'Info', success: 'Succes' };
      allAlerts.value = res.data.map((a, i) => ({
        id: a.id || i + 1,
        icon: iconMap[a.type] || 'alertInfo',
        title: a.title || a.message,
        time: a.time || a.createdAt || a.created_at || '',
        status: statusMap[a.type] || a.type,
        type: a.type || 'info'
      }));
    }
  } catch (e) {
    // Keep empty
  }
}

async function markAllRead() {
  markingAllRead.value = true;
  try {
    await dashboardApi.markAllAlertsRead();
    allAlerts.value = [];
  } catch (e) {
    // Silently fail
  } finally {
    markingAllRead.value = false;
  }
}

watch(currentSection, (section) => {
  if (section === 'alerts') {
    loadAllAlerts();
  }
});

/* ===== WebSocket real-time ===== */
const wsCleanups = [];

function setupWebSocket() {
  const token = localStorage.getItem('ng-token');
  if (!token || !wsService.isConnected) return;

  // Subscribe to dashboard channel
  wsService.subscribe('dashboard');

  // Listen for real-time alert updates
  const offAlert = wsService.on('alert', (data) => {
    if (data?.alert) {
      const iconMap = { critical: 'alertCritical', warning: 'alertWarning', info: 'alertInfo', success: 'alertSuccess' };
      const statusMap = { critical: 'Critique', warning: 'Important', info: 'Info', success: 'Succes' };
      const newAlert = {
        id: data.alert.id || Date.now(),
        icon: iconMap[data.alert.type] || 'alertInfo',
        title: data.alert.title || data.alert.message,
        time: 'A l\'instant',
        status: statusMap[data.alert.type] || data.alert.type,
        type: data.alert.type || 'info'
      };
      alerts.value = [newAlert, ...alerts.value].slice(0, 5);
      allAlerts.value = [newAlert, ...allAlerts.value];
    }
  });
  wsCleanups.push(offAlert);

  // Listen for device status changes
  const offDevice = wsService.on('device_update', (data) => {
    if (data?.device) {
      const idx = devices.value.findIndex(d => d.id === data.device.id);
      if (idx >= 0) {
        devices.value[idx].status = data.device.status;
        devices.value[idx].statusText = data.device.status === 'online' ? 'En ligne' : data.device.status === 'idle' ? 'Inactif' : 'Hors ligne';
      }
    }
  });
  wsCleanups.push(offDevice);

  // Listen for stats refresh
  const offStats = wsService.on('stats_update', (data) => {
    if (data?.stats) {
      loadDashboardData();
    }
  });
  wsCleanups.push(offStats);
}

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

  loadDashboardData();

  // Setup WebSocket listeners after a short delay to ensure connection is established
  setTimeout(setupWebSocket, 1000);

  // Also setup when WebSocket connects/authenticates
  const offAuth = wsService.on('authenticated', setupWebSocket);
  wsCleanups.push(offAuth);
});

onBeforeUnmount(() => {
  if (chartInstance) chartInstance.destroy();
  wsCleanups.forEach(fn => fn());
  wsService.unsubscribe('dashboard');
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

  .navBadge {
    position: absolute;
    top: 4px;
    right: 4px;
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

  .statsGrid {
    grid-template-columns: 1fr 1fr;
  }

  .contentGrid {
    grid-template-columns: 1fr;
  }

  .hamburgerBtn {
    display: flex;
  }

  .bottomNav {
    display: flex;
  }

  .searchBox {
    display: none;
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

.navBadge {
  margin-left: auto;
  background: var(--ng-red, #d45555);
  color: white;
  font-size: 10px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 999px;
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

.searchBox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  min-width: 220px;
  transition: all 200ms ease;
}

.searchBox:focus-within {
  border-color: var(--accent);
}

.searchBox input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  color: var(--text);
  font-size: 13px;
}

.searchBox input::placeholder {
  color: var(--text-muted);
}

.searchIcon {
  display: flex;
  align-items: center;
  color: var(--text-muted);
}

.notifBtn {
  position: relative;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 200ms ease;
}

.notifBtn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.notifDot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: var(--ng-red, #d45555);
  border-radius: 50%;
  border: 2px solid var(--bg-card);
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
  cursor: pointer;
  transition: all 200ms ease;
}

.userAvatar:hover {
  opacity: 0.85;
}

/* ===== Stats Grid ===== */
.statsGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.statCard {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  backdrop-filter: blur(10px);
  transition: all 200ms ease;
  animation: fadeInUp 400ms ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.statCard:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.statCard.green { border-color: rgba(61, 163, 130, 0.25); }
.statCard.blue { border-color: rgba(88, 166, 176, 0.25); }
.statCard.red { border-color: rgba(212, 85, 85, 0.25); }
.statCard.cyan { border-color: rgba(88, 166, 176, 0.25); }

.statCard.green:hover { box-shadow: 0 4px 16px rgba(61, 163, 130, 0.08); }
.statCard.blue:hover { box-shadow: 0 4px 16px rgba(88, 166, 176, 0.08); }
.statCard.red:hover { box-shadow: 0 4px 16px rgba(212, 85, 85, 0.08); }
.statCard.cyan:hover { box-shadow: 0 4px 16px rgba(88, 166, 176, 0.08); }

.statIcon {
  width: 44px;
  height: 44px;
  background: var(--bg-hover);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.statInfo {
  flex: 1;
}

.statValue {
  display: block;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
}

.statLabel {
  font-size: 12px;
  color: var(--text-muted);
}

.statTrend {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 999px;
}

.statTrend.up {
  background: rgba(61, 163, 130, 0.12);
  color: var(--ng-green, #3da382);
}

.statTrend.down {
  background: rgba(212, 85, 85, 0.12);
  color: var(--ng-red, #d45555);
}

/* ===== Content Grid ===== */
.contentGrid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
}

.contentGrid.noAlerts .alertsCard { display: none; }
.contentGrid.noDevices .devicesCard { display: none; }

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 18px;
  backdrop-filter: blur(10px);
}

.cardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.cardHeader h2 {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  margin: 0;
}

/* ===== Chart Card ===== */
.chartCard {
  grid-column: 1;
  grid-row: 1;
}

.cardActions {
  display: flex;
  gap: 4px;
}

.periodBtn {
  padding: 5px 12px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.periodBtn:hover {
  background: var(--bg-hover);
}

.periodBtn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.chartContainer {
  height: 220px;
  position: relative;
}

/* ===== Alerts Card ===== */
.alertsCard {
  grid-column: 2;
  grid-row: 1 / 3;
}

.seeAllBtn {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.seeAllBtn:hover {
  opacity: 0.7;
}

.alertsList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alertItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg-hover);
  border-radius: 8px;
  border-left: 3px solid transparent;
  animation: fadeInUp 300ms ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transition: all 200ms ease;
}

.alertItem:hover {
  transform: translateX(2px);
}

.alertItem.critical { border-left-color: var(--ng-red, #d45555); }
.alertItem.warning { border-left-color: var(--ng-orange, #d48a3c); }
.alertItem.info { border-left-color: var(--accent); }
.alertItem.success { border-left-color: var(--ng-green, #3da382); }

.alertIcon {
  display: flex;
  align-items: center;
  color: var(--text-muted);
}

.alertItem.critical .alertIcon { color: var(--ng-red, #d45555); }
.alertItem.warning .alertIcon { color: var(--ng-orange, #d48a3c); }
.alertItem.info .alertIcon { color: var(--accent); }
.alertItem.success .alertIcon { color: var(--ng-green, #3da382); }

.alertContent {
  flex: 1;
}

.alertTitle {
  display: block;
  font-size: 13px;
  color: var(--text);
  font-weight: 400;
  margin-bottom: 2px;
}

.alertTime {
  font-size: 11px;
  color: var(--text-muted);
}

.alertStatus {
  font-size: 10px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 999px;
}

.alertStatus.critical { background: rgba(212, 85, 85, 0.12); color: var(--ng-red, #d45555); }
.alertStatus.warning { background: rgba(212, 138, 60, 0.12); color: var(--ng-orange, #d48a3c); }
.alertStatus.info { background: rgba(88, 166, 176, 0.12); color: var(--accent); }
.alertStatus.success { background: rgba(61, 163, 130, 0.12); color: var(--ng-green, #3da382); }

/* ===== Devices Card ===== */
.devicesCard {
  grid-column: 1;
  grid-row: 2;
}

.deviceCount {
  font-size: 12px;
  color: var(--accent);
  font-weight: 500;
}

.devicesList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deviceItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-hover);
  border-radius: 8px;
  animation: fadeInUp 300ms ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transition: all 200ms ease;
}

.deviceItem:hover {
  transform: translateX(2px);
  background: rgba(88, 166, 176, 0.06);
}

.deviceIcon {
  display: flex;
  align-items: center;
  color: var(--text-muted);
}

.deviceInfo {
  flex: 1;
}

.deviceName {
  display: block;
  font-size: 13px;
  color: var(--text);
  font-weight: 400;
}

.deviceIp {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.deviceStatus {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 400;
}

.statusDot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.deviceStatus.online { color: var(--ng-green, #3da382); }
.deviceStatus.online .statusDot { background: var(--ng-green, #3da382); }

.deviceStatus.idle { color: var(--ng-orange, #d48a3c); }
.deviceStatus.idle .statusDot { background: var(--ng-orange, #d48a3c); }

.deviceStatus.offline { color: var(--text-muted); }
.deviceStatus.offline .statusDot { background: var(--text-muted); }

/* ===== Actions Card ===== */
.actionsCard {
  grid-column: 1 / 3;
  grid-row: 3;
}

.actionsGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.actionBtn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--border);
  background: var(--bg-hover);
  border-radius: 10px;
  cursor: pointer;
  transition: all 200ms ease;
  color: var(--text-muted);
}

.actionBtn:hover {
  transform: translateY(-2px);
  color: var(--text);
}

.actionBtn.blue:hover {
  border-color: rgba(88, 166, 176, 0.35);
  box-shadow: 0 4px 16px rgba(88, 166, 176, 0.08);
}

.actionBtn.green:hover {
  border-color: rgba(61, 163, 130, 0.35);
  box-shadow: 0 4px 16px rgba(61, 163, 130, 0.08);
}

.actionBtn.purple:hover {
  border-color: rgba(139, 111, 192, 0.35);
  box-shadow: 0 4px 16px rgba(139, 111, 192, 0.08);
}

.actionBtn.orange:hover {
  border-color: rgba(212, 138, 60, 0.35);
  box-shadow: 0 4px 16px rgba(212, 138, 60, 0.08);
}

.actionIcon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.actionLabel {
  font-size: 12px;
  color: var(--text);
  font-weight: 400;
  text-align: center;
}

@media (max-width: 768px) {
  .actionsGrid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ===== Alerts Full Page ===== */
.alertsFullPage {
  max-width: 800px;
}

.markAllBtn {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.markAllBtn:hover:not(:disabled) {
  background: rgba(88, 166, 176, 0.08);
  border-color: var(--accent);
}

.markAllBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.emptyAlerts {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

/* ===== Settings Panel ===== */
.settingsPanel {
  max-width: 680px;
}

.settingsCard {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.settingsItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  background: var(--bg-hover);
  border-radius: 8px;
}

.settingsInfo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settingsIcon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-muted);
}

.settingsLabel {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.settingsDesc {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.settingsSubtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0 0 16px;
  display: block;
}

.themeSwitch {
  display: flex;
  gap: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 3px;
}

.themeSwitchBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.themeSwitchBtn:hover {
  color: var(--text);
}

.themeSwitchBtn.active {
  background: var(--accent);
  color: white;
}

/* Module toggles */
.modulesList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.moduleItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  background: var(--bg-hover);
  border-radius: 8px;
  transition: background 150ms ease;
}

.moduleItem:hover {
  background: rgba(255, 255, 255, 0.06);
}

.moduleInfo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.moduleIcon {
  display: flex;
  align-items: center;
  color: var(--text-muted);
}

.moduleLabel {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.moduleDesc {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
}

.moduleToggle {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.toggleTrack {
  display: block;
  width: 40px;
  height: 22px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 11px;
  position: relative;
  transition: background 200ms ease;
}

.moduleToggle.active .toggleTrack {
  background: var(--accent);
}

.toggleThumb {
  display: block;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 200ms ease;
}

.moduleToggle.active .toggleThumb {
  transform: translateX(18px);
}

@media (max-width: 768px) {
  .settingsItem {
    flex-direction: column;
    align-items: flex-start;
  }
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
  .statsGrid {
    grid-template-columns: 1fr;
  }

  .main {
    padding: 12px;
  }

  .header {
    gap: 10px;
  }

  .headerLeft h1 {
    font-size: 16px;
  }

  .headerRight {
    gap: 8px;
  }

  .notifBtn,
  .userAvatar {
    width: 36px;
    height: 36px;
  }

  .actionsGrid {
    grid-template-columns: 1fr 1fr;
  }

  .bottomNavItem {
    min-width: 48px;
    padding: 6px 8px;
  }
}
</style>
