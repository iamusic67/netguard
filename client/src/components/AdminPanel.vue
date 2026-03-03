<template>
  <div class="admin-panel">
    <!-- Header -->
    <header class="admin-header">
      <div class="header-left">
        <h1>Administration</h1>
        <p>Gestion des utilisateurs</p>
      </div>
      <button class="back-btn" @click="$router.push({ name: 'dashboard' })">
        <span>←</span> Retour au dashboard
      </button>
    </header>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-value">{{ users.length }}</span>
        <span class="stat-label">Utilisateurs</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ activeUsers }}</span>
        <span class="stat-label">Actifs</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ adminCount }}</span>
        <span class="stat-label">Admins</span>
      </div>
    </div>

    <!-- Search & Actions -->
    <div class="toolbar">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Rechercher un utilisateur..."
        />
      </div>
      <button class="refresh-btn" @click="loadUsers" :disabled="loading">
        {{ loading ? 'Chargement...' : 'Actualiser' }}
      </button>
    </div>

    <!-- Users Table -->
    <div class="table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Statut</th>
            <th>Dernière connexion</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in filteredUsers" :key="user.id" :class="{ inactive: !user.is_active }">
            <td class="user-cell">
              <div class="user-avatar">{{ getInitials(user.full_name) }}</div>
              <div class="user-info">
                <span class="user-name">{{ user.full_name }}</span>
                <span class="user-id">ID: {{ user.id }}</span>
              </div>
            </td>
            <td>{{ user.email }}</td>
            <td>
              <span class="role-badge" :class="user.role">{{ user.role }}</span>
            </td>
            <td>
              <span class="status-badge" :class="user.is_active ? 'active' : 'inactive'">
                {{ user.is_active ? 'Actif' : 'Inactif' }}
              </span>
            </td>
            <td class="date-cell">{{ formatDate(user.last_login) }}</td>
            <td class="actions-cell">
              <button class="action-btn edit" @click="openEditModal(user)" title="Modifier" v-html="icons.edit"></button>
              <button class="action-btn reset" @click="openResetModal(user)" title="Réinitialiser mot de passe" v-html="icons.key"></button>
              <button
                class="action-btn toggle"
                @click="toggleUserStatus(user)"
                :title="user.is_active ? 'Désactiver' : 'Activer'"
              >
                <span v-html="user.is_active ? icons.ban : icons.check"></span>
              </button>
              <button
                class="action-btn delete"
                @click="openDeleteModal(user)"
                title="Supprimer"
                :disabled="isCurrentUser(user)"
                v-html="icons.trash"
              ></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal">
        <div class="modal-header">
          <h2>Modifier l'utilisateur</h2>
          <button class="close-btn" @click="closeModals">×</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>Prénom</label>
            <input type="text" v-model="editForm.firstName" placeholder="Prénom" />
          </div>
          <div class="field">
            <label>Nom</label>
            <input type="text" v-model="editForm.lastName" placeholder="Nom" />
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" v-model="editForm.email" placeholder="Email" />
          </div>
          <div class="field">
            <label>Rôle</label>
            <select v-model="editForm.role" :disabled="isEditingSelf">
              <option value="user">Utilisateur</option>
              <option value="moderator">Moderateur</option>
            </select>
            <span v-if="isEditingSelf" class="field-hint">Vous ne pouvez pas modifier votre propre rôle.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeModals">Annuler</button>
          <button class="btn-primary" @click="saveUser" :disabled="saving">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reset Password Modal -->
    <div v-if="showResetModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal">
        <div class="modal-header">
          <h2>Réinitialiser le mot de passe</h2>
          <button class="close-btn" @click="closeModals">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">
            Choisissez une méthode pour réinitialiser le mot de passe de <strong>{{ selectedUser?.full_name }}</strong>
          </p>

          <div class="reset-options">
            <button 
              class="reset-option" 
              :class="{ active: resetMethod === 'email' }"
              @click="resetMethod = 'email'"
            >
              <span class="option-icon" v-html="icons.mail"></span>
              <span class="option-title">Envoyer par email</span>
              <span class="option-desc">Un lien de réinitialisation sera envoyé à l'utilisateur</span>
            </button>

            <button 
              class="reset-option" 
              :class="{ active: resetMethod === 'temporary' }"
              @click="resetMethod = 'temporary'"
            >
              <span class="option-icon" v-html="icons.lock"></span>
              <span class="option-title">Mot de passe temporaire</span>
              <span class="option-desc">Générer un mot de passe que l'utilisateur devra changer à la prochaine connexion</span>
            </button>
          </div>

          <!-- Generated Password Display -->
          <div v-if="generatedPassword" class="generated-password">
            <label>Mot de passe temporaire généré :</label>
            <div class="password-display">
              <code>{{ generatedPassword }}</code>
              <button class="copy-btn" @click="copyPassword" title="Copier">
                <span v-html="copied ? icons.check : icons.copy"></span>
              </button>
            </div>
            <p class="password-note">
              ⚠️ Communiquez ce mot de passe à l'utilisateur de manière sécurisée. 
              Il devra le changer à sa prochaine connexion.
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeModals">Annuler</button>
          <button class="btn-primary" @click="executeReset" :disabled="resetting || !resetMethod">
            {{ resetting ? 'En cours...' : 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete User Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal">
        <div class="modal-header">
          <h2>Supprimer l'utilisateur</h2>
          <button class="close-btn" @click="closeModals">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc delete-warning">
            Etes-vous sur de vouloir supprimer le compte de <strong>{{ selectedUser?.full_name }}</strong> ?
            Cette action est irreversible.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeModals">Annuler</button>
          <button class="btn-danger" @click="confirmDeleteUser" :disabled="deleting">
            {{ deleting ? 'Suppression...' : 'Supprimer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Status Message -->
    <div v-if="statusMessage" class="status-toast" :class="statusType">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { adminApi } from '../services/api.js';
import { icons } from '../utils/icons.js';

const props = defineProps({
  currentUser: { type: Object, default: null }
});

const emit = defineEmits(['close']);

// State
const users = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const showEditModal = ref(false);
const showResetModal = ref(false);
const showDeleteModal = ref(false);
const selectedUser = ref(null);
const deleting = ref(false);
const saving = ref(false);
const resetting = ref(false);
const resetMethod = ref('');
const generatedPassword = ref('');
const copied = ref(false);
const statusMessage = ref('');
const statusType = ref('success');

const editForm = ref({
  firstName: '',
  lastName: '',
  email: '',
  role: 'user'
});

// Computed
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  const query = searchQuery.value.toLowerCase();
  return users.value.filter(user => 
    user.full_name.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query)
  );
});

const activeUsers = computed(() => users.value.filter(u => u.is_active).length);
const adminCount = computed(() => users.value.filter(u => u.role === 'admin').length);
const isEditingSelf = computed(() => {
  if (!selectedUser.value || !props.currentUser) return false;
  return selectedUser.value.id === props.currentUser.id ||
         selectedUser.value.uuid === props.currentUser.uuid;
});

// Methods
async function loadUsers() {
  loading.value = true;
  try {
    const response = await adminApi.getUsers();
    users.value = response.data || [];
  } catch (error) {
    showStatus('Erreur lors du chargement des utilisateurs', 'error');
  } finally {
    loading.value = false;
  }
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(date) {
  if (!date) return 'Jamais';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function openEditModal(user) {
  selectedUser.value = user;
  const names = user.full_name.split(' ');
  editForm.value = {
    firstName: names[0] || '',
    lastName: names.slice(1).join(' ') || '',
    email: user.email,
    role: user.role
  };
  showEditModal.value = true;
}

function openResetModal(user) {
  selectedUser.value = user;
  resetMethod.value = '';
  generatedPassword.value = '';
  showResetModal.value = true;
}

function closeModals() {
  showEditModal.value = false;
  showResetModal.value = false;
  showDeleteModal.value = false;
  selectedUser.value = null;
  resetMethod.value = '';
  generatedPassword.value = '';
}

function isCurrentUser(user) {
  if (!props.currentUser) return false;
  return user.id === props.currentUser.id ||
         user.uuid === props.currentUser.id;
}

function openDeleteModal(user) {
  if (isCurrentUser(user)) return;
  selectedUser.value = user;
  showDeleteModal.value = true;
}

async function confirmDeleteUser() {
  if (!selectedUser.value) return;
  deleting.value = true;

  try {
    await adminApi.deleteUser(selectedUser.value.id);
    showStatus('Utilisateur supprime avec succes', 'success');
    closeModals();
    await loadUsers();
  } catch (error) {
    showStatus(error.message || 'Erreur lors de la suppression', 'error');
  } finally {
    deleting.value = false;
  }
}

async function saveUser() {
  if (!selectedUser.value) return;
  saving.value = true;
  
  try {
    await adminApi.updateUser(selectedUser.value.id, {
      firstName: editForm.value.firstName,
      lastName: editForm.value.lastName,
      email: editForm.value.email,
      role: editForm.value.role
    });
    
    showStatus('Utilisateur mis à jour avec succès', 'success');
    closeModals();
    await loadUsers();
  } catch (error) {
    showStatus(error.message || 'Erreur lors de la mise à jour', 'error');
  } finally {
    saving.value = false;
  }
}

async function executeReset() {
  if (!selectedUser.value || !resetMethod.value) return;
  resetting.value = true;
  
  try {
    if (resetMethod.value === 'email') {
      await adminApi.sendResetEmail(selectedUser.value.id);
      showStatus('Email de réinitialisation envoyé', 'success');
      closeModals();
    } else if (resetMethod.value === 'temporary') {
      const response = await adminApi.generateTempPassword(selectedUser.value.id);
      generatedPassword.value = response.data.temporaryPassword;
      showStatus('Mot de passe temporaire généré', 'success');
    }
  } catch (error) {
    showStatus(error.message || 'Erreur lors de la réinitialisation', 'error');
  } finally {
    resetting.value = false;
  }
}

async function toggleUserStatus(user) {
  try {
    await adminApi.toggleUserStatus(user.id, !user.is_active);
    showStatus(`Utilisateur ${user.is_active ? 'désactivé' : 'activé'}`, 'success');
    await loadUsers();
  } catch (error) {
    showStatus(error.message || 'Erreur lors du changement de statut', 'error');
  }
}

function copyPassword() {
  navigator.clipboard.writeText(generatedPassword.value);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
}

function showStatus(message, type) {
  statusMessage.value = message;
  statusType.value = type;
  setTimeout(() => statusMessage.value = '', 4000);
}

onMounted(() => {
  loadUsers();
});
</script>

<style scoped>
.admin-panel {
  padding: 24px;
  min-height: 100vh;
  background: var(--ng-bg-darker);
  color: var(--ng-text);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.admin-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px;
}

.admin-header p {
  color: var(--ng-text-muted);
  margin: 0;
  font-size: 14px;
}

.back-btn {
  background: transparent;
  border: 1px solid var(--ng-border);
  color: var(--ng-text);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 150ms ease;
}

.back-btn:hover {
  border-color: var(--ng-cyan);
  color: var(--ng-cyan);
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--ng-bg-card);
  border: 1px solid var(--ng-border);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32px;
  font-weight: 600;
  color: var(--ng-cyan);
  margin-bottom: 4px;
}

.stat-label {
  color: var(--ng-text-muted);
  font-size: 13px;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-box {
  flex: 1;
}

.search-box input {
  width: 100%;
  padding: 10px 14px;
  background: var(--ng-bg-card);
  border: 1px solid var(--ng-border);
  border-radius: 6px;
  color: var(--ng-text);
  font-size: 14px;
}

.search-box input:focus {
  outline: none;
  border-color: var(--ng-cyan);
}

.refresh-btn {
  padding: 10px 20px;
  background: var(--ng-bg-card);
  border: 1px solid var(--ng-border);
  border-radius: 6px;
  color: var(--ng-text);
  cursor: pointer;
  font-size: 13px;
  transition: all 150ms ease;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--ng-cyan);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Table */
.table-container {
  background: var(--ng-bg-card);
  border: 1px solid var(--ng-border);
  border-radius: 8px;
  overflow: hidden;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  text-align: left;
  padding: 12px 16px;
  background: var(--ng-bg-elevated);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ng-text-muted);
  border-bottom: 1px solid var(--ng-border);
}

.users-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--ng-border);
  font-size: 13px;
}

.users-table tr:last-child td {
  border-bottom: none;
}

.users-table tr.inactive {
  opacity: 0.5;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ng-cyan), var(--ng-purple));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #0d1117;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 500;
}

.user-id {
  font-size: 11px;
  color: var(--ng-text-muted);
}

.role-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.role-badge.admin {
  background: rgba(168, 85, 247, 0.15);
  color: var(--ng-purple);
}

.role-badge.user {
  background: rgba(0, 212, 255, 0.15);
  color: var(--ng-cyan);
}

.role-badge.moderator {
  background: rgba(245, 158, 11, 0.15);
  color: var(--ng-orange, #f59e0b);
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.active {
  background: rgba(16, 185, 129, 0.15);
  color: var(--ng-green);
}

.status-badge.inactive {
  background: rgba(239, 68, 68, 0.15);
  color: var(--ng-red);
}

.date-cell {
  color: var(--ng-text-muted);
  font-size: 12px;
}

.actions-cell {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--ng-border);
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  transition: all 150ms ease;
}

.action-btn:hover {
  border-color: var(--ng-cyan);
  background: rgba(0, 212, 255, 0.1);
}

.action-btn.delete {
  color: var(--ng-red, #d45555);
}

.action-btn.delete:hover {
  border-color: var(--ng-red, #d45555);
  background: rgba(212, 85, 85, 0.1);
}

.action-btn.delete:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.action-btn.delete:disabled:hover {
  border-color: var(--ng-border);
  background: transparent;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--ng-bg-card);
  border: 1px solid var(--ng-border);
  border-radius: 12px;
  width: min(480px, 90%);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--ng-border);
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--ng-text-muted);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: var(--ng-text);
}

.modal-body {
  padding: 20px;
}

.modal-desc {
  color: var(--ng-text-muted);
  font-size: 14px;
  margin: 0 0 20px;
  line-height: 1.5;
}

.field {
  margin-bottom: 16px;
}

.field label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--ng-text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field input,
.field select {
  width: 100%;
  padding: 10px 12px;
  background: var(--ng-bg-dark);
  border: 1px solid var(--ng-border);
  border-radius: 6px;
  color: var(--ng-text);
  font-size: 14px;
}

.field input:focus,
.field select:focus {
  outline: none;
  border-color: var(--ng-cyan);
}

.field select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.field-hint {
  display: block;
  font-size: 11px;
  color: var(--ng-orange, #f59e0b);
  margin-top: 6px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--ng-border);
}

.btn-secondary {
  padding: 10px 20px;
  background: transparent;
  border: 1px solid var(--ng-border);
  border-radius: 6px;
  color: var(--ng-text);
  cursor: pointer;
  font-size: 13px;
  transition: all 150ms ease;
}

.btn-secondary:hover {
  border-color: var(--ng-text-muted);
}

.btn-primary {
  padding: 10px 20px;
  background: var(--ng-cyan);
  border: none;
  border-radius: 6px;
  color: #0d1117;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 150ms ease;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  padding: 10px 20px;
  background: var(--ng-red, #d45555);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 150ms ease;
}

.btn-danger:hover:not(:disabled) {
  filter: brightness(1.1);
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-warning {
  color: var(--ng-red, #d45555) !important;
}

/* Reset Options */
.reset-options {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.reset-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px;
  background: var(--ng-bg-dark);
  border: 1px solid var(--ng-border);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 150ms ease;
}

.reset-option:hover {
  border-color: var(--ng-cyan);
}

.reset-option.active {
  border-color: var(--ng-cyan);
  background: rgba(0, 212, 255, 0.05);
}

.option-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.option-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--ng-text);
}

.option-desc {
  font-size: 12px;
  color: var(--ng-text-muted);
  line-height: 1.4;
}

/* Generated Password */
.generated-password {
  background: var(--ng-bg-dark);
  border: 1px solid var(--ng-green);
  border-radius: 8px;
  padding: 16px;
}

.generated-password label {
  display: block;
  font-size: 12px;
  color: var(--ng-text-muted);
  margin-bottom: 8px;
}

.password-display {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--ng-bg-darker);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.password-display code {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 16px;
  color: var(--ng-green);
  letter-spacing: 1px;
}

.copy-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
}

.password-note {
  font-size: 12px;
  color: var(--ng-orange);
  margin: 0;
  line-height: 1.4;
}

/* Status Toast */
.status-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  z-index: 2000;
  animation: slideIn 200ms ease;
}

.status-toast.success {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid var(--ng-green);
  color: var(--ng-green);
}

.status-toast.error {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid var(--ng-red);
  color: var(--ng-red);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
  }

  .table-container {
    overflow-x: auto;
  }

  .users-table {
    min-width: 700px;
  }
}
</style>
