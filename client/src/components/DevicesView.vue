<template>
  <div class="devicesView">
    <!-- Header -->
    <div class="dvHeader">
      <div class="dvHeaderLeft">
        <h2>Appareils</h2>
        <span class="dvBadge">{{ devices.length }}</span>
      </div>
      <div class="dvHeaderRight">
        <button class="dvBtn dvBtnGhost" @click="refreshDevices" :disabled="loading">
          <span class="dvBtnIcon" v-html="icons.refresh"></span>
          <span>Actualiser</span>
        </button>
        <button class="dvBtn dvBtnPrimary" @click="openAddModal">
          <span class="dvBtnIcon" v-html="icons.plus"></span>
          <span>Ajouter</span>
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="dvSearchBar">
      <span class="dvSearchIcon" v-html="icons.search"></span>
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Rechercher par nom ou adresse IP..."
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="dvLoading">
      <div class="dvSpinner"></div>
      <span>Chargement des appareils...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredDevices.length === 0 && !loading" class="dvEmpty">
      <span class="dvEmptyIcon" v-html="icons.wifi"></span>
      <p v-if="searchQuery">Aucun appareil ne correspond a votre recherche.</p>
      <p v-else>Aucun appareil enregistre. Ajoutez votre premier appareil.</p>
    </div>

    <!-- Device List -->
    <div v-else class="dvList">
      <div
        v-for="(device, i) in filteredDevices"
        :key="device.id"
        class="dvCard"
        :style="{ '--delay': i * 0.05 + 's' }"
      >
        <div class="dvCardIcon" v-html="icons[getDeviceIcon(device.type)]"></div>
        <div class="dvCardInfo">
          <span class="dvCardName">{{ device.name }}</span>
          <span class="dvCardMeta">
            <span class="dvCardIp">{{ device.ip || device.ipAddress }}</span>
            <span v-if="device.mac" class="dvCardMac">{{ device.mac }}</span>
          </span>
        </div>
        <div class="dvCardStatus" :class="device.status || 'offline'">
          <span class="dvStatusDot"></span>
          <span>{{ getStatusLabel(device.status) }}</span>
        </div>
        <div class="dvCardActions">
          <button class="dvActionBtn" title="Modifier" @click="openEditModal(device)">
            <span v-html="icons.edit"></span>
          </button>
          <button class="dvActionBtn dvActionDanger" title="Supprimer" @click="openDeleteModal(device)">
            <span v-html="icons.trash"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <div v-if="showFormModal" class="dvOverlay" @click.self="closeFormModal">
      <div class="dvModal">
        <div class="dvModalHeader">
          <h3>{{ isEditing ? 'Modifier l\'appareil' : 'Ajouter un appareil' }}</h3>
          <button class="dvModalClose" @click="closeFormModal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="dvModalBody">
          <div class="dvField">
            <label>Nom de l'appareil</label>
            <input
              type="text"
              v-model="form.name"
              placeholder="ex: PC Bureau"
            />
          </div>
          <div class="dvField">
            <label>Type</label>
            <select v-model="form.type">
              <option value="" disabled>Selectionner un type</option>
              <option value="desktop">Bureau</option>
              <option value="laptop">Portable</option>
              <option value="mobile">Mobile</option>
              <option value="tv">TV</option>
              <option value="gaming">Gaming</option>
              <option value="server">Serveur</option>
            </select>
          </div>
          <div class="dvField">
            <label>Adresse IP</label>
            <input
              type="text"
              v-model="form.ip"
              placeholder="ex: 192.168.1.10"
            />
          </div>
          <div class="dvField">
            <label>Adresse MAC</label>
            <input
              type="text"
              v-model="form.mac"
              placeholder="ex: AA:BB:CC:DD:EE:FF"
            />
          </div>
        </div>
        <div class="dvModalFooter">
          <button class="dvBtn dvBtnGhost" @click="closeFormModal">Annuler</button>
          <button
            class="dvBtn dvBtnPrimary"
            @click="submitForm"
            :disabled="saving || !form.name || !form.type || !form.ip"
          >
            {{ saving ? 'Enregistrement...' : (isEditing ? 'Enregistrer' : 'Ajouter') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="dvOverlay" @click.self="closeDeleteModal">
      <div class="dvModal dvModalSmall">
        <div class="dvModalHeader">
          <h3>Confirmer la suppression</h3>
          <button class="dvModalClose" @click="closeDeleteModal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="dvModalBody">
          <p class="dvDeleteMsg">
            Etes-vous sur de vouloir supprimer l'appareil
            <strong>{{ deviceToDelete?.name }}</strong> ? Cette action est irreversible.
          </p>
        </div>
        <div class="dvModalFooter">
          <button class="dvBtn dvBtnGhost" @click="closeDeleteModal">Annuler</button>
          <button
            class="dvBtn dvBtnDanger"
            @click="confirmDelete"
            :disabled="deleting"
          >
            {{ deleting ? 'Suppression...' : 'Supprimer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { dashboardApi } from '../services/api.js';
import { icons } from '../utils/icons.js';

const showToast = inject('showToast');

// State
const devices = ref([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const searchQuery = ref('');

// Modal state
const showFormModal = ref(false);
const showDeleteModal = ref(false);
const isEditing = ref(false);
const editingDeviceId = ref(null);
const deviceToDelete = ref(null);

// Form
const form = ref({
  name: '',
  type: '',
  ip: '',
  mac: ''
});

// Computed
const filteredDevices = computed(() => {
  if (!searchQuery.value.trim()) return devices.value;
  const q = searchQuery.value.toLowerCase().trim();
  return devices.value.filter(d =>
    (d.name && d.name.toLowerCase().includes(q)) ||
    (d.ip && d.ip.toLowerCase().includes(q)) ||
    (d.ipAddress && d.ipAddress.toLowerCase().includes(q))
  );
});

// Helpers
function getDeviceIcon(type) {
  const map = {
    desktop: 'desktop',
    laptop: 'laptop',
    mobile: 'mobile',
    tv: 'tv',
    gaming: 'gaming',
    server: 'server'
  };
  return map[type] || 'desktop';
}

function getStatusLabel(status) {
  const labels = {
    online: 'En ligne',
    idle: 'Inactif',
    offline: 'Hors ligne'
  };
  return labels[status] || 'Hors ligne';
}

// API calls
async function loadDevices() {
  loading.value = true;
  try {
    const response = await dashboardApi.getDevices();
    if (response.success && response.data) {
      devices.value = response.data;
    }
  } catch (err) {
    showToast({ type: 'error', message: err.message || 'Erreur lors du chargement des appareils' });
  } finally {
    loading.value = false;
  }
}

async function refreshDevices() {
  await loadDevices();
  showToast({ type: 'success', message: 'Liste des appareils actualisee' });
}

// Add / Edit
function resetForm() {
  form.value = { name: '', type: '', ip: '', mac: '' };
  isEditing.value = false;
  editingDeviceId.value = null;
}

function openAddModal() {
  resetForm();
  showFormModal.value = true;
}

function openEditModal(device) {
  isEditing.value = true;
  editingDeviceId.value = device.id;
  form.value = {
    name: device.name || '',
    type: device.type || '',
    ip: device.ip || device.ipAddress || '',
    mac: device.mac || ''
  };
  showFormModal.value = true;
}

function closeFormModal() {
  showFormModal.value = false;
  resetForm();
}

async function submitForm() {
  if (!form.value.name || !form.value.type || !form.value.ip) return;
  saving.value = true;

  try {
    const payload = {
      name: form.value.name,
      type: form.value.type,
      ip: form.value.ip,
      mac: form.value.mac
    };

    if (isEditing.value) {
      await dashboardApi.updateDevice(editingDeviceId.value, payload);
      showToast({ type: 'success', message: 'Appareil modifie avec succes' });
    } else {
      await dashboardApi.addDevice(payload);
      showToast({ type: 'success', message: 'Appareil ajoute avec succes' });
    }

    closeFormModal();
    await loadDevices();
  } catch (err) {
    showToast({ type: 'error', message: err.message || 'Erreur lors de l\'enregistrement' });
  } finally {
    saving.value = false;
  }
}

// Delete
function openDeleteModal(device) {
  deviceToDelete.value = device;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  deviceToDelete.value = null;
}

async function confirmDelete() {
  if (!deviceToDelete.value) return;
  deleting.value = true;

  try {
    await dashboardApi.deleteDevice(deviceToDelete.value.id);
    showToast({ type: 'success', message: 'Appareil supprime avec succes' });
    closeDeleteModal();
    await loadDevices();
  } catch (err) {
    showToast({ type: 'error', message: err.message || 'Erreur lors de la suppression' });
  } finally {
    deleting.value = false;
  }
}

// Lifecycle
onMounted(() => {
  loadDevices();
});
</script>

<style scoped>
.devicesView {
  max-width: 1000px;
}

/* ===== Header ===== */
.dvHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.dvHeaderLeft {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dvHeaderLeft h2 {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  margin: 0;
}

.dvBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 7px;
  background: rgba(88, 166, 176, 0.12);
  color: var(--accent);
  font-size: 11px;
  font-weight: 500;
  border-radius: 999px;
}

.dvHeaderRight {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ===== Buttons ===== */
.dvBtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 400;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;
  border: 1px solid transparent;
}

.dvBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dvBtnIcon {
  display: flex;
  align-items: center;
}

.dvBtnGhost {
  background: transparent;
  border-color: var(--border);
  color: var(--text-muted);
}

.dvBtnGhost:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--text);
}

.dvBtnPrimary {
  background: var(--accent);
  border-color: var(--accent);
  color: #0d1117;
  font-weight: 500;
}

.dvBtnPrimary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.dvBtnDanger {
  background: rgba(212, 85, 85, 0.9);
  border-color: rgba(212, 85, 85, 0.9);
  color: white;
  font-weight: 500;
}

.dvBtnDanger:hover:not(:disabled) {
  background: rgba(212, 85, 85, 1);
}

/* ===== Search Bar ===== */
.dvSearchBar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 16px;
  transition: border-color 150ms ease;
}

.dvSearchBar:focus-within {
  border-color: var(--accent);
}

.dvSearchIcon {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.dvSearchBar input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  color: var(--text);
  font-size: 13px;
}

.dvSearchBar input::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}

/* ===== Loading ===== */
.dvLoading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 13px;
}

.dvSpinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: dvSpin 700ms linear infinite;
}

@keyframes dvSpin {
  to { transform: rotate(360deg); }
}

/* ===== Empty State ===== */
.dvEmpty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  color: var(--text-muted);
}

.dvEmptyIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-muted);
}

.dvEmpty p {
  margin: 0;
  font-size: 13px;
  text-align: center;
}

/* ===== Device List ===== */
.dvList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dvCard {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  animation: dvFadeIn 300ms ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transition: all 200ms ease;
}

.dvCard:hover {
  transform: translateX(2px);
  background: var(--bg-hover);
}

@keyframes dvFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dvCardIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: var(--bg-hover);
  border-radius: 8px;
  color: var(--accent);
  flex-shrink: 0;
}

.dvCardInfo {
  flex: 1;
  min-width: 0;
}

.dvCardName {
  display: block;
  font-size: 13px;
  font-weight: 400;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dvCardMeta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}

.dvCardIp {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.dvCardMac {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  opacity: 0.7;
}

/* ===== Status ===== */
.dvCardStatus {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 400;
  flex-shrink: 0;
}

.dvStatusDot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.dvCardStatus.online {
  color: var(--ng-green, #3da382);
}

.dvCardStatus.online .dvStatusDot {
  background: var(--ng-green, #3da382);
  box-shadow: 0 0 6px rgba(61, 163, 130, 0.4);
}

.dvCardStatus.idle {
  color: var(--ng-orange, #d48a3c);
}

.dvCardStatus.idle .dvStatusDot {
  background: var(--ng-orange, #d48a3c);
}

.dvCardStatus.offline {
  color: var(--text-muted);
}

.dvCardStatus.offline .dvStatusDot {
  background: var(--text-muted);
}

/* ===== Card Actions ===== */
.dvCardActions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.dvActionBtn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 150ms ease;
}

.dvActionBtn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(88, 166, 176, 0.06);
}

.dvActionBtn.dvActionDanger:hover {
  border-color: rgba(212, 85, 85, 0.5);
  color: var(--ng-red, #d45555);
  background: rgba(212, 85, 85, 0.06);
}

/* ===== Modal Overlay ===== */
.dvOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  animation: dvOverlayIn 200ms ease;
}

@keyframes dvOverlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ===== Modal ===== */
.dvModal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  width: min(480px, 92vw);
  max-height: 90vh;
  overflow-y: auto;
  backdrop-filter: blur(20px);
  animation: dvModalIn 250ms ease;
}

.dvModal.dvModalSmall {
  width: min(420px, 92vw);
}

@keyframes dvModalIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dvModalHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.dvModalHeader h3 {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  margin: 0;
}

.dvModalClose {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  background: transparent;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 150ms ease;
}

.dvModalClose:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.dvModalBody {
  padding: 20px;
}

.dvModalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}

/* ===== Form Fields ===== */
.dvField {
  margin-bottom: 14px;
}

.dvField:last-child {
  margin-bottom: 0;
}

.dvField label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 5px;
}

.dvField input,
.dvField select {
  width: 100%;
  padding: 9px 12px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  transition: border-color 150ms ease;
  box-sizing: border-box;
}

.dvField input:focus,
.dvField select:focus {
  outline: none;
  border-color: var(--accent);
}

.dvField input::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
}

.dvField select {
  cursor: pointer;
}

/* ===== Delete Message ===== */
.dvDeleteMsg {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}

.dvDeleteMsg strong {
  color: var(--text);
}

/* ===== Responsive ===== */
@media (max-width: 640px) {
  .dvHeader {
    flex-direction: column;
    align-items: flex-start;
  }

  .dvHeaderRight {
    width: 100%;
  }

  .dvHeaderRight .dvBtn {
    flex: 1;
    justify-content: center;
  }

  .dvCard {
    flex-wrap: wrap;
    gap: 10px;
  }

  .dvCardInfo {
    flex-basis: calc(100% - 52px);
  }

  .dvCardStatus {
    margin-left: 52px;
  }

  .dvCardActions {
    margin-left: auto;
  }

  .dvCardMeta {
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
}
</style>
