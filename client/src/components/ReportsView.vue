<template>
  <div class="reportsView">
    <div class="contentGrid">
      <!-- Exporter -->
      <section class="card exportCard">
        <div class="cardHeader">
          <h2>Exporter</h2>
        </div>
        <div class="exportGrid">
          <button
            class="exportBtn"
            @click="downloadExport('loginHistory', 'csv')"
            :disabled="exporting.loginCsv"
          >
            <span class="exportIcon" v-html="icons.download"></span>
            <div class="exportText">
              <span class="exportLabel">Historique connexions (CSV)</span>
              <span class="exportDesc">Format tableur</span>
            </div>
            <span v-if="exporting.loginCsv" class="exportSpinner"></span>
          </button>
          <button
            class="exportBtn"
            @click="downloadExport('loginHistory', 'json')"
            :disabled="exporting.loginJson"
          >
            <span class="exportIcon" v-html="icons.fileText"></span>
            <div class="exportText">
              <span class="exportLabel">Historique connexions (JSON)</span>
              <span class="exportDesc">Format structure</span>
            </div>
            <span v-if="exporting.loginJson" class="exportSpinner"></span>
          </button>
          <button
            class="exportBtn"
            @click="downloadExport('myData', 'json')"
            :disabled="exporting.dataJson"
          >
            <span class="exportIcon" v-html="icons.fileText"></span>
            <div class="exportText">
              <span class="exportLabel">Donnees personnelles (JSON)</span>
              <span class="exportDesc">Export RGPD complet</span>
            </div>
            <span v-if="exporting.dataJson" class="exportSpinner"></span>
          </button>
          <button
            class="exportBtn"
            @click="downloadExport('myData', 'csv')"
            :disabled="exporting.dataCsv"
          >
            <span class="exportIcon" v-html="icons.download"></span>
            <div class="exportText">
              <span class="exportLabel">Donnees personnelles (CSV)</span>
              <span class="exportDesc">Format tableur</span>
            </div>
            <span v-if="exporting.dataCsv" class="exportSpinner"></span>
          </button>
        </div>
      </section>

      <!-- Historique de connexion -->
      <section class="card historyCard">
        <div class="cardHeader">
          <h2>Historique de connexion</h2>
          <button class="refreshBtn" @click="loadHistory(true)" :disabled="loadingHistory">
            <span class="refreshIcon" :class="{ spinning: loadingHistory }" v-html="icons.refresh"></span>
          </button>
        </div>
        <div v-if="loadingHistory && history.length === 0" class="loadingState">
          <span class="loadingText">Chargement...</span>
        </div>
        <div v-else-if="history.length === 0" class="emptyState">
          <span class="emptyIcon" v-html="icons.clock"></span>
          <span class="emptyText">Aucun historique disponible</span>
        </div>
        <template v-else>
          <div class="tableWrapper">
            <table class="historyTable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>IP</th>
                  <th>Navigateur</th>
                  <th>Appareil</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(entry, i) in history"
                  :key="entry.id || i"
                  :style="{ '--delay': i * 0.04 + 's' }"
                  class="historyRow"
                >
                  <td class="cellDate">{{ formatDate(entry.loginAt) }}</td>
                  <td class="cellIp">{{ entry.ip || '--' }}</td>
                  <td class="cellBrowser">{{ entry.browser || '--' }}</td>
                  <td class="cellDevice">{{ entry.device || '--' }}</td>
                  <td>
                    <span class="statusBadge" :class="entry.success ? 'success' : 'fail'">
                      {{ entry.success ? 'Succes' : 'Echec' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="tableFooter">
            <span class="footerInfo">{{ history.length }} entrees chargees</span>
            <button
              class="loadMoreBtn"
              @click="loadMore"
              :disabled="loadingMore || !hasMore"
            >
              <span v-if="loadingMore" class="exportSpinner small"></span>
              <span v-else>Charger plus</span>
            </button>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue';
import { icons } from '../utils/icons.js';
import { sessionApi, exportApi } from '../services/api.js';

const showToast = inject('showToast');

/* ===== Export ===== */
const exporting = reactive({
  loginCsv: false,
  loginJson: false,
  dataJson: false,
  dataCsv: false
});

async function downloadExport(type, format) {
  const key = type === 'loginHistory'
    ? (format === 'csv' ? 'loginCsv' : 'loginJson')
    : (format === 'csv' ? 'dataCsv' : 'dataJson');

  exporting[key] = true;
  try {
    const url = type === 'loginHistory'
      ? exportApi.loginHistory(format)
      : exportApi.myData(format);

    const response = await exportApi.download(url);

    if (!response.ok) {
      throw new Error('Erreur de telechargement');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = type === 'loginHistory'
      ? `historique-connexions.${format}`
      : `donnees-personnelles.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);

    if (showToast) {
      showToast('Fichier telecharge avec succes', 'success');
    }
  } catch (e) {
    if (showToast) {
      showToast('Erreur lors du telechargement', 'error');
    }
  } finally {
    exporting[key] = false;
  }
}

/* ===== Login History ===== */
const loadingHistory = ref(false);
const loadingMore = ref(false);
const history = ref([]);
const offset = ref(0);
const limit = 20;
const hasMore = ref(true);

async function loadHistory(reset = false) {
  if (reset) {
    offset.value = 0;
    history.value = [];
    hasMore.value = true;
  }

  loadingHistory.value = true;
  try {
    const res = await sessionApi.getHistory({ limit, offset: offset.value });
    if (res?.data) {
      const entries = Array.isArray(res.data) ? res.data : [];
      if (reset) {
        history.value = entries;
      } else {
        history.value = [...history.value, ...entries];
      }
      if (entries.length < limit) {
        hasMore.value = false;
      }
      offset.value += entries.length;
    }
  } catch (e) {
    if (showToast) {
      showToast('Erreur lors du chargement de l\'historique', 'error');
    }
  } finally {
    loadingHistory.value = false;
  }
}

async function loadMore() {
  loadingMore.value = true;
  try {
    const res = await sessionApi.getHistory({ limit, offset: offset.value });
    if (res?.data) {
      const entries = Array.isArray(res.data) ? res.data : [];
      history.value = [...history.value, ...entries];
      if (entries.length < limit) {
        hasMore.value = false;
      }
      offset.value += entries.length;
    }
  } catch (e) {
    if (showToast) {
      showToast('Erreur lors du chargement', 'error');
    }
  } finally {
    loadingMore.value = false;
  }
}

/* ===== Format Date ===== */
function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

/* ===== Lifecycle ===== */
onMounted(() => {
  loadHistory(true);
});
</script>

<style scoped>
.reportsView {
  max-width: 1000px;
}

/* ===== Content Grid ===== */
.contentGrid {
  display: flex;
  flex-direction: column;
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

/* ===== Export Card ===== */
.exportGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.exportBtn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  background: var(--bg-hover);
  border-radius: 10px;
  cursor: pointer;
  transition: all 200ms ease;
  color: var(--text);
  text-align: left;
}

.exportBtn:hover {
  border-color: rgba(88, 166, 176, 0.35);
  background: rgba(88, 166, 176, 0.06);
  transform: translateY(-1px);
}

.exportBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.exportIcon {
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

.exportText {
  flex: 1;
  min-width: 0;
}

.exportLabel {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exportDesc {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.exportSpinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.exportSpinner.small {
  width: 14px;
  height: 14px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ===== History Table ===== */
.tableWrapper {
  overflow-x: auto;
  margin: 0 -18px;
  padding: 0 18px;
}

.historyTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.historyTable thead th {
  text-align: left;
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.historyRow {
  animation: fadeInUp 300ms ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transition: background 150ms ease;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.historyRow:hover {
  background: var(--bg-hover);
}

.historyTable tbody td {
  padding: 10px 12px;
  color: var(--text);
  font-weight: 400;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.cellDate {
  font-size: 12px;
  color: var(--text-muted);
}

.cellIp {
  font-family: monospace;
  font-size: 12px;
}

.cellBrowser,
.cellDevice {
  font-size: 12px;
}

.statusBadge {
  display: inline-block;
  font-size: 10px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 999px;
}

.statusBadge.success {
  background: rgba(61, 163, 130, 0.12);
  color: var(--ng-green, #3da382);
}

.statusBadge.fail {
  background: rgba(212, 85, 85, 0.12);
  color: var(--ng-red, #d45555);
}

/* ===== Table Footer ===== */
.tableFooter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.footerInfo {
  font-size: 12px;
  color: var(--text-muted);
}

.loadMoreBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 200ms ease;
}

.loadMoreBtn:hover {
  background: rgba(88, 166, 176, 0.08);
  border-color: var(--accent);
}

.loadMoreBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .exportGrid {
    grid-template-columns: 1fr;
  }

  .historyTable thead th,
  .historyTable tbody td {
    padding: 8px 8px;
    font-size: 11px;
  }

  .cellIp {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .tableWrapper {
    margin: 0 -12px;
    padding: 0 12px;
  }
}
</style>
