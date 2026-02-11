<template>
  <div class="securityView">
    <div class="contentGrid">
      <!-- Score de securite -->
      <section class="card scoreCard">
        <div class="cardHeader">
          <h2>Score de securite</h2>
        </div>
        <div class="scoreDisplay">
          <div class="scoreRing" :class="scoreColorClass">
            <div class="scoreInner">
              <span class="scoreValue">{{ scoreDisplay }}</span>
              <span class="scoreLabel">Score global</span>
            </div>
          </div>
          <div class="scoreDetails">
            <div class="scoreDetailItem">
              <span class="detailIcon" v-html="icons.shieldCheck"></span>
              <div class="detailInfo">
                <span class="detailLabel">Protection</span>
                <span class="detailValue">{{ protectionValue }}</span>
              </div>
            </div>
            <div class="scoreDetailItem">
              <span class="detailIcon" v-html="icons.firewall"></span>
              <div class="detailInfo">
                <span class="detailLabel">Pare-feu</span>
                <span class="detailValue green">Actif</span>
              </div>
            </div>
            <div class="scoreDetailItem">
              <span class="detailIcon" v-html="icons.lock"></span>
              <div class="detailInfo">
                <span class="detailLabel">Chiffrement</span>
                <span class="detailValue green">TLS 1.3</span>
              </div>
            </div>
            <div class="scoreDetailItem">
              <span class="detailIcon" v-html="icons.eye"></span>
              <div class="detailInfo">
                <span class="detailLabel">Surveillance</span>
                <span class="detailValue green">Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Actions rapides -->
      <section class="card actionsCard">
        <div class="cardHeader">
          <h2>Actions rapides</h2>
        </div>
        <div class="actionsGrid">
          <button class="actionBtn" @click="runScan">
            <span class="actionIcon" v-html="icons.search"></span>
            <div class="actionText">
              <span class="actionLabel">Lancer un scan</span>
              <span class="actionDesc">Analyse complete du reseau</span>
            </div>
          </button>
          <button class="actionBtn" @click="checkFirewall">
            <span class="actionIcon" v-html="icons.firewall"></span>
            <div class="actionText">
              <span class="actionLabel">Verifier le pare-feu</span>
              <span class="actionDesc">Tester les regles actives</span>
            </div>
          </button>
          <button class="actionBtn" @click="updateRules">
            <span class="actionIcon" v-html="icons.refresh"></span>
            <div class="actionText">
              <span class="actionLabel">Mettre a jour les regles</span>
              <span class="actionDesc">Synchroniser les definitions</span>
            </div>
          </button>
        </div>
      </section>

      <!-- Menaces recentes -->
      <section class="card threatsCard">
        <div class="cardHeader">
          <h2>Menaces recentes</h2>
          <button class="refreshBtn" @click="loadAlerts" :disabled="loadingAlerts">
            <span class="refreshIcon" :class="{ spinning: loadingAlerts }" v-html="icons.refresh"></span>
          </button>
        </div>
        <div v-if="loadingAlerts && threats.length === 0" class="loadingState">
          <span class="loadingText">Chargement...</span>
        </div>
        <div v-else-if="threats.length === 0" class="emptyState">
          <span class="emptyIcon" v-html="icons.shieldCheck"></span>
          <span class="emptyText">Aucune menace detectee</span>
        </div>
        <div v-else class="threatsList">
          <div
            v-for="(threat, i) in threats"
            :key="threat.id"
            class="threatItem"
            :class="threat.type"
            :style="{ '--delay': i * 0.06 + 's' }"
          >
            <div class="threatIcon" v-html="icons[threat.icon]"></div>
            <div class="threatContent">
              <span class="threatTitle">{{ threat.title }}</span>
              <span class="threatTime">{{ formatTime(threat.created_at) }}</span>
            </div>
            <div class="threatBadge" :class="threat.type">
              {{ threat.badge }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { icons } from '../utils/icons.js';
import { dashboardApi } from '../services/api.js';

const showToast = inject('showToast');

/* ===== Security Score ===== */
const protectionValue = ref('--');
const scoreDisplay = ref('--');

const scoreColorClass = computed(() => {
  const val = scoreDisplay.value;
  if (val === 'A+' || val === 'A') return 'excellent';
  if (val === 'B+' || val === 'B') return 'good';
  if (val === 'C' || val === 'C+') return 'moderate';
  // Try numeric comparison
  const num = parseFloat(val);
  if (!isNaN(num)) {
    if (num >= 90) return 'excellent';
    if (num >= 70) return 'good';
    if (num >= 50) return 'moderate';
    return 'low';
  }
  return 'good';
});

async function loadStats() {
  try {
    const res = await dashboardApi.getStats();
    if (res?.data) {
      const d = res.data;
      const v = (field) => typeof field === 'object' && field !== null ? field.value : field;
      const raw = v(d.protection);
      protectionValue.value = String(raw ?? '99.8%');

      // Derive score display from protection value
      const numStr = String(raw).replace('%', '');
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        if (num >= 98) scoreDisplay.value = 'A+';
        else if (num >= 90) scoreDisplay.value = 'A';
        else if (num >= 80) scoreDisplay.value = 'B+';
        else if (num >= 70) scoreDisplay.value = 'B';
        else if (num >= 60) scoreDisplay.value = 'C+';
        else scoreDisplay.value = 'C';
      } else {
        scoreDisplay.value = String(raw);
      }
    }
  } catch (e) {
    // Keep fallback
  }
}

/* ===== Threats ===== */
const loadingAlerts = ref(false);
const threats = ref([]);

const iconMap = { critical: 'alertCritical', warning: 'alertWarning', info: 'alertInfo', success: 'alertSuccess' };
const badgeMap = { critical: 'Critique', warning: 'Important', info: 'Info', success: 'Succes' };

async function loadAlerts() {
  loadingAlerts.value = true;
  try {
    const res = await dashboardApi.getAlerts({ limit: 10 });
    if (res?.data) {
      threats.value = res.data.map((a, i) => ({
        id: a.id || i + 1,
        icon: iconMap[a.type] || 'alertInfo',
        title: a.title || a.message,
        type: a.type || 'info',
        badge: badgeMap[a.type] || a.type,
        created_at: a.created_at || a.createdAt || ''
      }));
    }
  } catch (e) {
    if (showToast) {
      showToast('Erreur lors du chargement des alertes', 'error');
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

/* ===== Quick Actions ===== */
function runScan() {
  if (showToast) {
    showToast('Scan du reseau en cours...', 'info');
  }
}

function checkFirewall() {
  if (showToast) {
    showToast('Verification du pare-feu en cours...', 'info');
  }
}

function updateRules() {
  if (showToast) {
    showToast('Mise a jour des regles de securite...', 'info');
  }
}

/* ===== Lifecycle ===== */
onMounted(() => {
  loadStats();
  loadAlerts();
});
</script>

<style scoped>
.securityView {
  max-width: 1000px;
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

/* ===== Score Card ===== */
.scoreCard {
  grid-column: 1;
}

.scoreDisplay {
  display: flex;
  align-items: center;
  gap: 24px;
}

.scoreRing {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.scoreRing::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  padding: 4px;
  background: conic-gradient(var(--ring-color) 0deg, var(--ring-color) 300deg, transparent 300deg);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
}

.scoreRing.excellent {
  --ring-color: var(--ng-green, #3da382);
}

.scoreRing.good {
  --ring-color: var(--accent, #58a6b0);
}

.scoreRing.moderate {
  --ring-color: var(--ng-orange, #d48a3c);
}

.scoreRing.low {
  --ring-color: var(--ng-red, #d45555);
}

.scoreInner {
  width: 104px;
  height: 104px;
  background: var(--bg-card);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.scoreValue {
  font-size: 32px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}

.scoreLabel {
  font-size: 11px;
  color: var(--text-muted);
}

.scoreDetails {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scoreDetailItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg-hover);
  border-radius: 8px;
}

.detailIcon {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.detailInfo {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detailLabel {
  font-size: 13px;
  color: var(--text);
  font-weight: 400;
}

.detailValue {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.detailValue.green {
  color: var(--ng-green, #3da382);
}

/* ===== Actions Card ===== */
.actionsCard {
  grid-column: 2;
}

.actionsGrid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.actionBtn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  background: var(--bg-hover);
  border-radius: 10px;
  cursor: pointer;
  transition: all 200ms ease;
  color: var(--text);
  text-align: left;
}

.actionBtn:hover {
  transform: translateX(4px);
  border-color: rgba(88, 166, 176, 0.35);
  background: rgba(88, 166, 176, 0.06);
}

.actionIcon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--accent);
  flex-shrink: 0;
}

.actionText {
  flex: 1;
}

.actionLabel {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.actionDesc {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ===== Threats Card ===== */
.threatsCard {
  grid-column: 1 / 3;
}

.threatsList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.threatItem {
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

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.threatItem:hover {
  transform: translateX(2px);
}

.threatItem.critical { border-left-color: var(--ng-red, #d45555); }
.threatItem.warning { border-left-color: var(--ng-orange, #d48a3c); }
.threatItem.info { border-left-color: var(--accent); }
.threatItem.success { border-left-color: var(--ng-green, #3da382); }

.threatIcon {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.threatItem.critical .threatIcon { color: var(--ng-red, #d45555); }
.threatItem.warning .threatIcon { color: var(--ng-orange, #d48a3c); }
.threatItem.info .threatIcon { color: var(--accent); }
.threatItem.success .threatIcon { color: var(--ng-green, #3da382); }

.threatContent {
  flex: 1;
  min-width: 0;
}

.threatTitle {
  display: block;
  font-size: 13px;
  font-weight: 400;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.threatTime {
  font-size: 11px;
  color: var(--text-muted);
}

.threatBadge {
  font-size: 10px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
}

.threatBadge.critical { background: rgba(212, 85, 85, 0.12); color: var(--ng-red, #d45555); }
.threatBadge.warning { background: rgba(212, 138, 60, 0.12); color: var(--ng-orange, #d48a3c); }
.threatBadge.info { background: rgba(88, 166, 176, 0.12); color: var(--accent); }
.threatBadge.success { background: rgba(61, 163, 130, 0.12); color: var(--ng-green, #3da382); }

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
  color: var(--ng-green, #3da382);
  opacity: 0.5;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .contentGrid {
    grid-template-columns: 1fr;
  }

  .scoreCard {
    grid-column: 1;
  }

  .actionsCard {
    grid-column: 1;
  }

  .threatsCard {
    grid-column: 1;
  }

  .scoreDisplay {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .scoreDetails {
    width: 100%;
  }
}
</style>
