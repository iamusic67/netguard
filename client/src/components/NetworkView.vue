<template>
  <div class="networkView">
    <!-- Stats Row -->
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
        <div v-if="stat.trend" class="statTrend" :class="stat.trendClass">
          {{ stat.trend }}
        </div>
      </div>
    </section>

    <div class="contentGrid">
      <!-- Activite recente -->
      <section class="card activityCard">
        <div class="cardHeader">
          <h2>Activite recente</h2>
          <button class="refreshBtn" @click="loadAlerts" :disabled="loadingAlerts">
            <span class="refreshIcon" :class="{ spinning: loadingAlerts }" v-html="icons.refresh"></span>
          </button>
        </div>
        <div v-if="loadingAlerts && recentActivity.length === 0" class="loadingState">
          <span class="loadingText">Chargement...</span>
        </div>
        <div v-else-if="recentActivity.length === 0" class="emptyState">
          <span class="emptyIcon" v-html="icons.activity"></span>
          <span class="emptyText">Aucune activite recente</span>
        </div>
        <div v-else class="activityList">
          <div
            v-for="(event, i) in recentActivity"
            :key="event.id"
            class="activityItem"
            :style="{ '--delay': i * 0.06 + 's' }"
          >
            <div class="activityIcon" :class="event.type">
              <span v-html="icons[event.icon]"></span>
            </div>
            <div class="activityContent">
              <span class="activityTitle">{{ event.title }}</span>
              <span class="activityTime">{{ formatTime(event.created_at) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Interfaces reseau -->
      <section class="card interfacesCard">
        <div class="cardHeader">
          <h2>Interfaces reseau</h2>
          <span class="interfaceCount">{{ interfaces.length }} detectees</span>
        </div>
        <div class="interfacesList">
          <div
            v-for="(iface, i) in interfaces"
            :key="iface.name"
            class="interfaceItem"
            :style="{ '--delay': i * 0.08 + 's' }"
          >
            <div class="ifaceLeft">
              <div class="ifaceIcon">
                <span v-html="icons[iface.icon]"></span>
              </div>
              <div class="ifaceInfo">
                <span class="ifaceName">{{ iface.name }}</span>
                <span class="ifaceType">{{ iface.type }}</span>
              </div>
            </div>
            <div class="ifaceRight">
              <div class="ifaceAddresses">
                <span class="ifaceIp">{{ iface.ip }}</span>
                <span class="ifaceMac">{{ iface.mac }}</span>
              </div>
              <div class="ifaceStatus" :class="iface.status">
                <span class="statusDot"></span>
                {{ iface.statusText }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { icons } from '../utils/icons.js';
import { dashboardApi } from '../services/api.js';

const showToast = inject('showToast');

/* ===== Stats ===== */
const loading = ref(false);
const stats = ref([
  { id: 1, icon: 'globe', value: '--', label: 'Connexions actives', trend: '', trendClass: 'up', colorClass: 'blue' },
  { id: 2, icon: 'activity', value: '--', label: 'Bande passante', trend: '', trendClass: 'up', colorClass: 'cyan' },
  { id: 3, icon: 'zap', value: '--', label: 'Latence moyenne', trend: '', trendClass: 'down', colorClass: 'green' },
  { id: 4, icon: 'server', value: '--', label: 'Paquets/sec', trend: '', trendClass: 'up', colorClass: 'accent' }
]);

async function loadStats() {
  loading.value = true;
  try {
    const res = await dashboardApi.getStats();
    if (res?.data) {
      const d = res.data;
      const v = (field) => typeof field === 'object' && field !== null ? field.value : field;
      const t = (field, fallback) => typeof field === 'object' && field !== null ? field.trend : fallback;
      const td = (field) => typeof field === 'object' && field !== null ? (field.trendDirection === 'down' ? 'down' : 'up') : 'up';

      stats.value = [
        { id: 1, icon: 'globe', value: String(v(d.connections) ?? '0'), label: 'Connexions actives', trend: t(d.connections, '+12%'), trendClass: td(d.connections), colorClass: 'blue' },
        { id: 2, icon: 'activity', value: String(v(d.bandwidth) ?? '0 Mb/s'), label: 'Bande passante', trend: t(d.bandwidth, '+5%'), trendClass: td(d.bandwidth), colorClass: 'cyan' },
        { id: 3, icon: 'zap', value: '12 ms', label: 'Latence moyenne', trend: '-2 ms', trendClass: 'down', colorClass: 'green' },
        { id: 4, icon: 'server', value: '1.4k', label: 'Paquets/sec', trend: '+8%', trendClass: 'up', colorClass: 'accent' }
      ];
    }
  } catch (e) {
    // Keep fallback values
  } finally {
    loading.value = false;
  }
}

/* ===== Recent Activity ===== */
const loadingAlerts = ref(false);
const recentActivity = ref([]);

async function loadAlerts() {
  loadingAlerts.value = true;
  try {
    const res = await dashboardApi.getAlerts({ limit: 12 });
    if (res?.data) {
      const iconMap = { info: 'alertInfo', success: 'alertSuccess', warning: 'alertWarning', critical: 'alertCritical' };
      recentActivity.value = res.data
        .filter(a => a.type === 'info' || a.type === 'success')
        .slice(0, 8)
        .map((a, i) => ({
          id: a.id || i + 1,
          icon: iconMap[a.type] || 'alertInfo',
          title: a.title || a.message,
          type: a.type || 'info',
          created_at: a.created_at || a.createdAt || ''
        }));
    }
  } catch (e) {
    if (showToast) {
      showToast('Erreur lors du chargement des activites', 'error');
    }
  } finally {
    loadingAlerts.value = false;
  }
}

/* ===== Format Time ===== */
function formatTime(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'A l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

/* ===== Network Interfaces (static placeholder) ===== */
const interfaces = ref([
  {
    name: 'eth0',
    type: 'Ethernet',
    icon: 'network',
    ip: '192.168.1.10',
    mac: '00:1A:2B:3C:4D:5E',
    status: 'online',
    statusText: 'Actif'
  },
  {
    name: 'wlan0',
    type: 'Wi-Fi',
    icon: 'wifi',
    ip: '192.168.1.25',
    mac: '00:1A:2B:3C:4D:6F',
    status: 'online',
    statusText: 'Actif'
  },
  {
    name: 'docker0',
    type: 'Bridge virtuel',
    icon: 'server',
    ip: '172.17.0.1',
    mac: '02:42:AC:11:00:01',
    status: 'idle',
    statusText: 'Inactif'
  },
  {
    name: 'lo',
    type: 'Loopback',
    icon: 'refresh',
    ip: '127.0.0.1',
    mac: '00:00:00:00:00:00',
    status: 'online',
    statusText: 'Actif'
  },
  {
    name: 'veth0',
    type: 'Virtual Ethernet',
    icon: 'network',
    ip: '172.18.0.2',
    mac: '02:42:AC:12:00:02',
    status: 'offline',
    statusText: 'Hors ligne'
  }
]);

/* ===== Lifecycle ===== */
onMounted(() => {
  loadStats();
  loadAlerts();
});
</script>

<style scoped>
.networkView {
  max-width: 1000px;
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
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.statCard:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.statCard.blue { border-color: rgba(88, 166, 176, 0.25); }
.statCard.cyan { border-color: rgba(88, 166, 176, 0.25); }
.statCard.green { border-color: rgba(61, 163, 130, 0.25); }
.statCard.accent { border-color: rgba(88, 166, 176, 0.25); }

.statIcon {
  width: 44px;
  height: 44px;
  background: var(--bg-hover);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}

.statInfo {
  flex: 1;
  min-width: 0;
}

.statValue {
  display: block;
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
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
  white-space: nowrap;
  flex-shrink: 0;
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
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* ===== Card Base ===== */
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
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  margin: 0;
}

/* ===== Refresh Button ===== */
.refreshBtn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 200ms ease;
}

.refreshBtn:hover {
  background: var(--bg-hover);
  color: var(--accent);
  border-color: var(--accent);
}

.refreshBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refreshIcon {
  display: flex;
  align-items: center;
}

.refreshIcon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ===== Activity List ===== */
.activityList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activityItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-hover);
  border-radius: 8px;
  animation: fadeInUp 300ms ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transition: all 200ms ease;
}

.activityItem:hover {
  transform: translateX(2px);
}

.activityIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
}

.activityIcon.info {
  background: rgba(88, 166, 176, 0.1);
  color: var(--accent);
}

.activityIcon.success {
  background: rgba(61, 163, 130, 0.1);
  color: var(--ng-green, #3da382);
}

.activityContent {
  flex: 1;
  min-width: 0;
}

.activityTitle {
  display: block;
  font-size: 13px;
  font-weight: 400;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activityTime {
  font-size: 11px;
  color: var(--text-muted);
}

/* ===== Loading / Empty States ===== */
.loadingState,
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 10px;
}

.loadingText,
.emptyText {
  font-size: 13px;
  color: var(--text-muted);
}

.emptyIcon {
  color: var(--text-muted);
  opacity: 0.4;
}

/* ===== Interfaces List ===== */
.interfaceCount {
  font-size: 12px;
  color: var(--accent);
  font-weight: 500;
}

.interfacesList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.interfaceItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-hover);
  border-radius: 8px;
  animation: fadeInUp 300ms ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transition: all 200ms ease;
}

.interfaceItem:hover {
  transform: translateX(2px);
  background: rgba(88, 166, 176, 0.04);
}

.ifaceLeft {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ifaceIcon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--accent);
  flex-shrink: 0;
}

.ifaceInfo {
  min-width: 0;
}

.ifaceName {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  font-family: monospace;
}

.ifaceType {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
}

.ifaceRight {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.ifaceAddresses {
  text-align: right;
}

.ifaceIp {
  display: block;
  font-size: 12px;
  color: var(--text);
  font-family: monospace;
}

.ifaceMac {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  font-family: monospace;
}

.ifaceStatus {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 400;
  min-width: 80px;
}

.statusDot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ifaceStatus.online { color: var(--ng-green, #3da382); }
.ifaceStatus.online .statusDot { background: var(--ng-green, #3da382); }

.ifaceStatus.idle { color: var(--ng-orange, #d48a3c); }
.ifaceStatus.idle .statusDot { background: var(--ng-orange, #d48a3c); }

.ifaceStatus.offline { color: var(--text-muted); }
.ifaceStatus.offline .statusDot { background: var(--text-muted); }

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .statsGrid {
    grid-template-columns: 1fr 1fr;
  }

  .contentGrid {
    grid-template-columns: 1fr;
  }

  .interfaceItem {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .ifaceRight {
    width: 100%;
    justify-content: space-between;
  }

  .ifaceAddresses {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .statsGrid {
    grid-template-columns: 1fr;
  }
}
</style>
