<template>
  <div class="profileView">
    <!-- ===== Informations personnelles ===== -->
    <div class="card">
      <div class="cardHeader">
        <h2>
          <span class="headerIcon" v-html="icons.user"></span>
          Informations personnelles
        </h2>
      </div>

      <div class="formGroup">
        <label class="formLabel">Prenom</label>
        <input
          v-model="profileForm.firstName"
          type="text"
          class="formInput"
          placeholder="Votre prenom"
        />
      </div>

      <div class="formGroup">
        <label class="formLabel">Nom</label>
        <input
          v-model="profileForm.lastName"
          type="text"
          class="formInput"
          placeholder="Votre nom"
        />
      </div>

      <div class="formGroup">
        <label class="formLabel">Adresse e-mail</label>
        <div class="inputWithIcon">
          <span class="inputIcon" v-html="icons.mail"></span>
          <input
            :value="profile.email"
            type="email"
            class="formInput readOnly"
            readonly
          />
        </div>
        <span class="formHint" v-if="profile.emailVerified">
          <span class="verifiedBadge">
            <span v-html="icons.check"></span> Verifie
          </span>
        </span>
        <span class="formHint unverified" v-else-if="profile.email">
          Non verifie
        </span>
      </div>

      <div class="formActions">
        <button
          class="btn btnPrimary"
          :disabled="savingProfile"
          @click="saveProfile"
        >
          <span v-if="savingProfile" class="spinner"></span>
          <span v-else v-html="icons.check"></span>
          {{ savingProfile ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </div>
    </div>

    <!-- ===== Mot de passe ===== -->
    <div class="card">
      <div class="cardHeader">
        <h2>
          <span class="headerIcon" v-html="icons.lock"></span>
          Mot de passe
        </h2>
      </div>

      <div class="formGroup">
        <label class="formLabel">Mot de passe actuel</label>
        <div class="inputWithIcon">
          <span class="inputIcon" v-html="icons.lock"></span>
          <input
            v-model="passwordForm.currentPassword"
            :type="showCurrentPassword ? 'text' : 'password'"
            class="formInput"
            placeholder="Mot de passe actuel"
          />
          <button class="togglePassword" @click="showCurrentPassword = !showCurrentPassword">
            <span v-html="showCurrentPassword ? icons.eyeOff : icons.eye"></span>
          </button>
        </div>
      </div>

      <div class="formGroup">
        <label class="formLabel">Nouveau mot de passe</label>
        <div class="inputWithIcon">
          <span class="inputIcon" v-html="icons.key"></span>
          <input
            v-model="passwordForm.newPassword"
            :type="showNewPassword ? 'text' : 'password'"
            class="formInput"
            placeholder="Nouveau mot de passe"
          />
          <button class="togglePassword" @click="showNewPassword = !showNewPassword">
            <span v-html="showNewPassword ? icons.eyeOff : icons.eye"></span>
          </button>
        </div>
      </div>

      <div class="formGroup">
        <label class="formLabel">Confirmer le nouveau mot de passe</label>
        <div class="inputWithIcon">
          <span class="inputIcon" v-html="icons.key"></span>
          <input
            v-model="passwordForm.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            class="formInput"
            placeholder="Confirmer le mot de passe"
          />
          <button class="togglePassword" @click="showConfirmPassword = !showConfirmPassword">
            <span v-html="showConfirmPassword ? icons.eyeOff : icons.eye"></span>
          </button>
        </div>
      </div>

      <div class="formActions">
        <button
          class="btn btnPrimary"
          :disabled="changingPassword"
          @click="changePassword"
        >
          <span v-if="changingPassword" class="spinner"></span>
          <span v-else v-html="icons.lock"></span>
          {{ changingPassword ? 'Modification...' : 'Modifier le mot de passe' }}
        </button>
      </div>
    </div>

    <!-- ===== Authentification a deux facteurs (2FA) ===== -->
    <div class="card">
      <div class="cardHeader">
        <h2>
          <span class="headerIcon" v-html="icons.shieldCheck"></span>
          Authentification a deux facteurs (2FA)
        </h2>
        <span class="statusBadge" :class="twoFactor.enabled ? 'enabled' : 'disabled'">
          {{ twoFactor.enabled ? 'Active' : 'Desactive' }}
        </span>
      </div>

      <!-- 2FA disabled: show enable flow -->
      <template v-if="!twoFactor.enabled">
        <p class="cardDesc">
          Ajoutez une couche de securite supplementaire a votre compte en activant
          l'authentification a deux facteurs.
        </p>

        <!-- Step 1: Not yet started setup -->
        <template v-if="!tfaSetup.qrCode">
          <div class="formActions">
            <button
              class="btn btnPrimary"
              :disabled="settingUp2FA"
              @click="setup2FA"
            >
              <span v-if="settingUp2FA" class="spinner"></span>
              <span v-else v-html="icons.shieldCheck"></span>
              {{ settingUp2FA ? 'Configuration...' : 'Activer' }}
            </button>
          </div>
        </template>

        <!-- Step 2: QR code shown, verify -->
        <template v-else>
          <div class="tfaSetupBlock">
            <div class="qrCodeWrapper">
              <img :src="tfaSetup.qrCode" alt="QR Code 2FA" class="qrCodeImage" />
            </div>

            <div class="secretBlock">
              <label class="formLabel">Cle secrete (saisie manuelle)</label>
              <div class="secretDisplay">
                <code>{{ tfaSetup.secret }}</code>
              </div>
            </div>

            <div class="formGroup">
              <label class="formLabel">Code de verification (6 chiffres)</label>
              <input
                v-model="tfaSetup.verifyCode"
                type="text"
                class="formInput"
                placeholder="000000"
                maxlength="6"
              />
            </div>

            <div class="formActions">
              <button
                class="btn btnPrimary"
                :disabled="verifying2FA"
                @click="verify2FASetup"
              >
                <span v-if="verifying2FA" class="spinner"></span>
                <span v-else v-html="icons.check"></span>
                {{ verifying2FA ? 'Verification...' : 'Verifier et activer' }}
              </button>
              <button class="btn btnGhost" @click="cancel2FASetup">
                <span v-html="icons.close"></span>
                Annuler
              </button>
            </div>

            <!-- Backup codes shown after setup -->
            <div v-if="tfaSetup.backupCodes && tfaSetup.backupCodes.length" class="backupCodesBlock">
              <h3 class="backupCodesTitle">Codes de secours</h3>
              <p class="backupCodesDesc">
                Conservez ces codes dans un endroit sur. Ils vous permettront d'acceder
                a votre compte si vous perdez l'acces a votre application d'authentification.
              </p>
              <div class="backupCodesGrid">
                <code v-for="code in tfaSetup.backupCodes" :key="code" class="backupCode">
                  {{ code }}
                </code>
              </div>
            </div>
          </div>
        </template>
      </template>

      <!-- 2FA enabled: show status + disable -->
      <template v-else>
        <div class="tfaEnabledInfo">
          <div class="tfaInfoRow">
            <span class="tfaInfoLabel">Codes de secours restants</span>
            <span class="tfaInfoValue">{{ twoFactor.backupCodesCount }}</span>
          </div>
        </div>

        <div class="tfaDisableSection" v-if="!showDisable2FA">
          <button class="btn btnDanger" @click="showDisable2FA = true">
            <span v-html="icons.close"></span>
            Desactiver
          </button>
        </div>

        <div class="tfaDisableForm" v-else>
          <div class="formGroup">
            <label class="formLabel">Mot de passe</label>
            <input
              v-model="disable2FAForm.password"
              type="password"
              class="formInput"
              placeholder="Votre mot de passe"
            />
          </div>
          <div class="formGroup">
            <label class="formLabel">Code 2FA</label>
            <input
              v-model="disable2FAForm.code"
              type="text"
              class="formInput"
              placeholder="000000"
              maxlength="6"
            />
          </div>
          <div class="formActions">
            <button
              class="btn btnDanger"
              :disabled="disabling2FA"
              @click="disable2FA"
            >
              <span v-if="disabling2FA" class="spinner"></span>
              <span v-else v-html="icons.close"></span>
              {{ disabling2FA ? 'Desactivation...' : 'Confirmer la desactivation' }}
            </button>
            <button class="btn btnGhost" @click="showDisable2FA = false">
              Annuler
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- ===== Sessions actives ===== -->
    <div class="card">
      <div class="cardHeader">
        <h2>
          <span class="headerIcon" v-html="icons.smartphone"></span>
          Sessions actives
        </h2>
        <button
          v-if="sessions.length > 1"
          class="btn btnDangerSmall"
          :disabled="revokingAll"
          @click="revokeAllSessions"
        >
          <span v-if="revokingAll" class="spinner"></span>
          <span v-else v-html="icons.power"></span>
          Revoquer toutes
        </button>
      </div>

      <div v-if="loadingSessions" class="loadingState">
        <span class="spinner"></span>
        <span>Chargement des sessions...</span>
      </div>

      <div v-else-if="sessions.length === 0" class="emptyState">
        Aucune session active.
      </div>

      <div v-else class="sessionsList">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="sessionItem"
          :class="{ current: session.current }"
        >
          <div class="sessionIcon">
            <span v-html="getSessionIcon(session)"></span>
          </div>
          <div class="sessionInfo">
            <div class="sessionMain">
              <span class="sessionDevice">{{ session.device || 'Appareil inconnu' }}</span>
              <span v-if="session.current" class="currentBadge">Session actuelle</span>
            </div>
            <div class="sessionDetails">
              <span>{{ session.browser || 'Navigateur inconnu' }}</span>
              <span class="sessionSep">&middot;</span>
              <span>{{ session.ip || 'IP inconnue' }}</span>
              <span v-if="session.location" class="sessionSep">&middot;</span>
              <span v-if="session.location">{{ session.location }}</span>
            </div>
            <div class="sessionTime">
              <span v-html="icons.clock"></span>
              {{ session.lastActivity || 'Activite inconnue' }}
            </div>
          </div>
          <button
            v-if="!session.current"
            class="btn btnDangerSmall"
            :disabled="revokingSession === session.id"
            @click="revokeSession(session.id)"
          >
            <span v-if="revokingSession === session.id" class="spinner"></span>
            <span v-else v-html="icons.power"></span>
            Revoquer
          </button>
        </div>
      </div>
    </div>

    <!-- ===== Exporter mes donnees ===== -->
    <div class="card">
      <div class="cardHeader">
        <h2>
          <span class="headerIcon" v-html="icons.download"></span>
          Exporter mes donnees
        </h2>
      </div>

      <p class="cardDesc">
        Telechargez une copie de vos donnees personnelles conformement au RGPD.
      </p>

      <div class="exportActions">
        <button
          class="btn btnSecondary"
          :disabled="exportingHistory"
          @click="exportLoginHistory"
        >
          <span v-if="exportingHistory" class="spinner"></span>
          <span v-else v-html="icons.clock"></span>
          {{ exportingHistory ? 'Export...' : 'Historique connexions (CSV)' }}
        </button>
        <button
          class="btn btnSecondary"
          :disabled="exportingData"
          @click="exportMyData"
        >
          <span v-if="exportingData" class="spinner"></span>
          <span v-else v-html="icons.download"></span>
          {{ exportingData ? 'Export...' : 'Mes donnees (JSON)' }}
        </button>
      </div>
    </div>

    <!-- ===== Zone dangereuse ===== -->
    <div class="card dangerCard">
      <div class="cardHeader">
        <h2>
          <span class="headerIcon" v-html="icons.trash"></span>
          Zone dangereuse
        </h2>
      </div>

      <p class="cardDesc dangerDesc">
        La suppression de votre compte est irreversible. Toutes vos donnees seront
        definitivement supprimees.
      </p>

      <template v-if="!showDeleteAccount">
        <div class="formActions">
          <button class="btn btnDanger" @click="showDeleteAccount = true">
            <span v-html="icons.trash"></span>
            Supprimer mon compte
          </button>
        </div>
      </template>

      <template v-else>
        <div class="deleteForm">
          <div class="formGroup">
            <label class="formLabel">Mot de passe</label>
            <input
              v-model="deleteForm.password"
              type="password"
              class="formInput"
              placeholder="Votre mot de passe"
            />
          </div>

          <div class="formGroup">
            <label class="formLabel">
              Tapez <strong>SUPPRIMER</strong> pour confirmer
            </label>
            <input
              v-model="deleteForm.confirmation"
              type="text"
              class="formInput"
              placeholder="SUPPRIMER"
            />
          </div>

          <div class="formActions">
            <button
              class="btn btnDanger"
              :disabled="deletingAccount || deleteForm.confirmation !== 'SUPPRIMER'"
              @click="deleteAccount"
            >
              <span v-if="deletingAccount" class="spinner"></span>
              <span v-else v-html="icons.trash"></span>
              {{ deletingAccount ? 'Suppression...' : 'Confirmer la suppression' }}
            </button>
            <button class="btn btnGhost" @click="cancelDelete">
              Annuler
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, inject } from 'vue';
import { icons } from '../utils/icons.js';
import { profileApi, twoFactorApi, sessionApi, exportApi } from '../services/api.js';

const props = defineProps({
  user: Object
});

const showToast = inject('showToast');

// ===== Profile =====
const profile = reactive({
  id: null,
  email: '',
  firstName: '',
  lastName: '',
  avatar: null,
  hasPassword: true,
  emailVerified: false
});

const profileForm = reactive({
  firstName: '',
  lastName: ''
});

const savingProfile = ref(false);

async function loadProfile() {
  try {
    const res = await profileApi.get();
    if (res.success && res.data) {
      Object.assign(profile, res.data);
      profileForm.firstName = res.data.firstName || '';
      profileForm.lastName = res.data.lastName || '';
    }
  } catch (err) {
    showToast?.('Erreur lors du chargement du profil', 'error');
  }
}

async function saveProfile() {
  savingProfile.value = true;
  try {
    const res = await profileApi.update({
      firstName: profileForm.firstName,
      lastName: profileForm.lastName
    });
    if (res.success) {
      profile.firstName = profileForm.firstName;
      profile.lastName = profileForm.lastName;
      showToast?.('Profil mis a jour avec succes', 'success');
    }
  } catch (err) {
    showToast?.(err.message || 'Erreur lors de la mise a jour du profil', 'error');
  } finally {
    savingProfile.value = false;
  }
}

// ===== Password =====
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const changingPassword = ref(false);

async function changePassword() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    showToast?.('Les mots de passe ne correspondent pas', 'error');
    return;
  }
  if (!passwordForm.currentPassword || !passwordForm.newPassword) {
    showToast?.('Veuillez remplir tous les champs', 'error');
    return;
  }

  changingPassword.value = true;
  try {
    const res = await profileApi.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
    if (res.success) {
      passwordForm.currentPassword = '';
      passwordForm.newPassword = '';
      passwordForm.confirmPassword = '';
      showToast?.('Mot de passe modifie avec succes', 'success');
    }
  } catch (err) {
    showToast?.(err.message || 'Erreur lors du changement de mot de passe', 'error');
  } finally {
    changingPassword.value = false;
  }
}

// ===== 2FA =====
const twoFactor = reactive({
  enabled: false,
  backupCodesCount: 0
});

const tfaSetup = reactive({
  secret: '',
  qrCode: '',
  verifyCode: '',
  backupCodes: []
});

const settingUp2FA = ref(false);
const verifying2FA = ref(false);
const showDisable2FA = ref(false);
const disabling2FA = ref(false);

const disable2FAForm = reactive({
  password: '',
  code: ''
});

async function load2FAStatus() {
  try {
    const res = await twoFactorApi.getStatus();
    if (res.success && res.data) {
      twoFactor.enabled = res.data.enabled;
      twoFactor.backupCodesCount = res.data.backupCodesCount || 0;
    }
  } catch {
    // silently fail
  }
}

async function setup2FA() {
  settingUp2FA.value = true;
  try {
    const res = await twoFactorApi.setup();
    if (res.success && res.data) {
      tfaSetup.secret = res.data.secret;
      tfaSetup.qrCode = res.data.qrCode;
      tfaSetup.backupCodes = res.data.backupCodes || [];
      tfaSetup.verifyCode = '';
    }
  } catch (err) {
    showToast?.(err.message || 'Erreur lors de la configuration 2FA', 'error');
  } finally {
    settingUp2FA.value = false;
  }
}

async function verify2FASetup() {
  if (!tfaSetup.verifyCode || tfaSetup.verifyCode.length !== 6) {
    showToast?.('Veuillez saisir un code a 6 chiffres', 'error');
    return;
  }

  verifying2FA.value = true;
  try {
    const res = await twoFactorApi.verifySetup(tfaSetup.verifyCode);
    if (res.success) {
      twoFactor.enabled = true;
      showToast?.('Authentification a deux facteurs activee', 'success');
      cancel2FASetup();
      await load2FAStatus();
    }
  } catch (err) {
    showToast?.(err.message || 'Code invalide', 'error');
  } finally {
    verifying2FA.value = false;
  }
}

function cancel2FASetup() {
  tfaSetup.secret = '';
  tfaSetup.qrCode = '';
  tfaSetup.verifyCode = '';
  tfaSetup.backupCodes = [];
}

async function disable2FA() {
  if (!disable2FAForm.password || !disable2FAForm.code) {
    showToast?.('Veuillez remplir tous les champs', 'error');
    return;
  }

  disabling2FA.value = true;
  try {
    const res = await twoFactorApi.disable({
      password: disable2FAForm.password,
      code: disable2FAForm.code
    });
    if (res.success) {
      twoFactor.enabled = false;
      twoFactor.backupCodesCount = 0;
      showDisable2FA.value = false;
      disable2FAForm.password = '';
      disable2FAForm.code = '';
      showToast?.('Authentification a deux facteurs desactivee', 'success');
    }
  } catch (err) {
    showToast?.(err.message || 'Erreur lors de la desactivation 2FA', 'error');
  } finally {
    disabling2FA.value = false;
  }
}

// ===== Sessions =====
const sessions = ref([]);
const loadingSessions = ref(false);
const revokingSession = ref(null);
const revokingAll = ref(false);

async function loadSessions() {
  loadingSessions.value = true;
  try {
    const res = await sessionApi.getAll();
    if (res.success && res.data) {
      sessions.value = res.data;
    }
  } catch {
    // silently fail
  } finally {
    loadingSessions.value = false;
  }
}

function getSessionIcon(session) {
  const device = (session.device || '').toLowerCase();
  if (device.includes('mobile') || device.includes('phone') || device.includes('android') || device.includes('iphone')) {
    return icons.smartphone;
  }
  return icons.desktop;
}

async function revokeSession(sessionId) {
  revokingSession.value = sessionId;
  try {
    const res = await sessionApi.revoke(sessionId);
    if (res.success) {
      sessions.value = sessions.value.filter(s => s.id !== sessionId);
      showToast?.('Session revoquee', 'success');
    }
  } catch (err) {
    showToast?.(err.message || 'Erreur lors de la revocation', 'error');
  } finally {
    revokingSession.value = null;
  }
}

async function revokeAllSessions() {
  revokingAll.value = true;
  try {
    const res = await sessionApi.revokeAll();
    if (res.success) {
      sessions.value = sessions.value.filter(s => s.current);
      showToast?.('Toutes les autres sessions ont ete revoquees', 'success');
    }
  } catch (err) {
    showToast?.(err.message || 'Erreur lors de la revocation', 'error');
  } finally {
    revokingAll.value = false;
  }
}

// ===== Export =====
const exportingHistory = ref(false);
const exportingData = ref(false);

async function exportLoginHistory() {
  exportingHistory.value = true;
  try {
    const url = exportApi.loginHistory('csv');
    const response = await exportApi.download(url);
    if (response.ok) {
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'historique-connexions.csv';
      link.click();
      URL.revokeObjectURL(link.href);
      showToast?.('Historique exporte avec succes', 'success');
    } else {
      showToast?.('Erreur lors de l\'export', 'error');
    }
  } catch (err) {
    showToast?.(err.message || 'Erreur lors de l\'export', 'error');
  } finally {
    exportingHistory.value = false;
  }
}

async function exportMyData() {
  exportingData.value = true;
  try {
    const url = exportApi.myData('json');
    const response = await exportApi.download(url);
    if (response.ok) {
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'mes-donnees.json';
      link.click();
      URL.revokeObjectURL(link.href);
      showToast?.('Donnees exportees avec succes', 'success');
    } else {
      showToast?.('Erreur lors de l\'export', 'error');
    }
  } catch (err) {
    showToast?.(err.message || 'Erreur lors de l\'export', 'error');
  } finally {
    exportingData.value = false;
  }
}

// ===== Delete Account =====
const showDeleteAccount = ref(false);
const deletingAccount = ref(false);

const deleteForm = reactive({
  password: '',
  confirmation: ''
});

async function deleteAccount() {
  if (deleteForm.confirmation !== 'SUPPRIMER') {
    showToast?.('Veuillez taper SUPPRIMER pour confirmer', 'error');
    return;
  }
  if (!deleteForm.password) {
    showToast?.('Veuillez saisir votre mot de passe', 'error');
    return;
  }

  deletingAccount.value = true;
  try {
    const res = await profileApi.deleteAccount({
      password: deleteForm.password,
      confirmation: deleteForm.confirmation
    });
    if (res.success) {
      showToast?.('Compte supprime avec succes', 'success');
    }
  } catch (err) {
    showToast?.(err.message || 'Erreur lors de la suppression du compte', 'error');
  } finally {
    deletingAccount.value = false;
  }
}

function cancelDelete() {
  showDeleteAccount.value = false;
  deleteForm.password = '';
  deleteForm.confirmation = '';
}

// ===== Lifecycle =====
onMounted(async () => {
  await Promise.allSettled([
    loadProfile(),
    load2FAStatus(),
    loadSessions()
  ]);
});
</script>

<style scoped>
.profileView {
  max-width: 780px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== Card ===== */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.headerIcon {
  display: flex;
  align-items: center;
  color: var(--accent);
}

.cardDesc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 16px;
  line-height: 1.5;
}

/* ===== Forms ===== */
.formGroup {
  margin-bottom: 14px;
}

.formLabel {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.formInput {
  width: 100%;
  padding: 9px 12px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 200ms ease;
  box-sizing: border-box;
}

.formInput:focus {
  border-color: var(--accent);
}

.formInput.readOnly {
  opacity: 0.6;
  cursor: not-allowed;
}

.formInput::placeholder {
  color: var(--text-muted);
}

.inputWithIcon {
  position: relative;
  display: flex;
  align-items: center;
}

.inputWithIcon .formInput {
  padding-left: 36px;
  padding-right: 36px;
}

.inputIcon {
  position: absolute;
  left: 10px;
  display: flex;
  align-items: center;
  color: var(--text-muted);
  pointer-events: none;
}

.togglePassword {
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: color 150ms ease;
}

.togglePassword:hover {
  color: var(--text);
}

.formHint {
  display: inline-flex;
  align-items: center;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.verifiedBadge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ng-green, #3da382);
  font-size: 11px;
  font-weight: 500;
}

.formHint.unverified {
  color: var(--ng-red, #d45555);
  font-weight: 500;
}

.formActions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

/* ===== Buttons ===== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 200ms ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btnPrimary {
  background: var(--accent);
  color: white;
}

.btnPrimary:hover:not(:disabled) {
  background: #4d96a0;
}

.btnSecondary {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  color: var(--text);
}

.btnSecondary:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--accent);
  color: var(--accent);
}

.btnDanger {
  background: rgba(212, 85, 85, 0.15);
  border: 1px solid rgba(212, 85, 85, 0.3);
  color: var(--ng-red, #d45555);
}

.btnDanger:hover:not(:disabled) {
  background: rgba(212, 85, 85, 0.25);
  border-color: rgba(212, 85, 85, 0.5);
}

.btnDangerSmall {
  padding: 6px 12px;
  font-size: 11px;
  background: rgba(212, 85, 85, 0.1);
  border: 1px solid rgba(212, 85, 85, 0.25);
  color: var(--ng-red, #d45555);
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: all 200ms ease;
  white-space: nowrap;
}

.btnDangerSmall:hover:not(:disabled) {
  background: rgba(212, 85, 85, 0.2);
  border-color: rgba(212, 85, 85, 0.4);
}

.btnDangerSmall:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btnGhost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.btnGhost:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text);
}

/* ===== Spinner ===== */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Status Badge ===== */
.statusBadge {
  font-size: 11px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
}

.statusBadge.enabled {
  background: rgba(61, 163, 130, 0.12);
  color: var(--ng-green, #3da382);
}

.statusBadge.disabled {
  background: rgba(212, 85, 85, 0.12);
  color: var(--ng-red, #d45555);
}

/* ===== 2FA Setup ===== */
.tfaSetupBlock {
  margin-top: 8px;
}

.qrCodeWrapper {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
  max-width: 220px;
}

.qrCodeImage {
  width: 180px;
  height: 180px;
}

.secretBlock {
  margin-bottom: 14px;
}

.secretDisplay {
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: monospace;
  font-size: 13px;
  color: var(--accent);
  word-break: break-all;
  user-select: all;
}

.backupCodesBlock {
  margin-top: 20px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.backupCodesTitle {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  margin: 0 0 6px;
}

.backupCodesDesc {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0 0 12px;
  line-height: 1.5;
}

.backupCodesGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 6px;
}

.backupCode {
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: var(--text);
  text-align: center;
  user-select: all;
}

/* ===== 2FA Enabled ===== */
.tfaEnabledInfo {
  margin-bottom: 16px;
}

.tfaInfoRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--bg-hover);
  border-radius: 8px;
}

.tfaInfoLabel {
  font-size: 13px;
  color: var(--text-muted);
}

.tfaInfoValue {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.tfaDisableSection {
  margin-top: 8px;
}

.tfaDisableForm {
  margin-top: 12px;
  padding: 16px;
  background: rgba(212, 85, 85, 0.04);
  border: 1px solid rgba(212, 85, 85, 0.15);
  border-radius: 8px;
}

/* ===== Sessions ===== */
.loadingState {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  justify-content: center;
  color: var(--text-muted);
  font-size: 13px;
}

.emptyState {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.sessionsList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sessionItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-hover);
  border-radius: 8px;
  transition: all 200ms ease;
}

.sessionItem:hover {
  background: rgba(88, 166, 176, 0.04);
}

.sessionItem.current {
  border-left: 3px solid var(--accent);
}

.sessionIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.sessionInfo {
  flex: 1;
  min-width: 0;
}

.sessionMain {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.sessionDevice {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.currentBadge {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(88, 166, 176, 0.12);
  color: var(--accent);
}

.sessionDetails {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.sessionSep {
  margin: 0 4px;
}

.sessionTime {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.sessionTime span:first-child {
  display: flex;
  align-items: center;
  width: 14px;
  height: 14px;
}

/* ===== Export ===== */
.exportActions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* ===== Danger Card ===== */
.dangerCard {
  border-color: rgba(212, 85, 85, 0.3);
}

.dangerDesc {
  color: var(--ng-red, #d45555);
  opacity: 0.8;
}

.deleteForm {
  padding: 16px;
  background: rgba(212, 85, 85, 0.04);
  border: 1px solid rgba(212, 85, 85, 0.15);
  border-radius: 8px;
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .profileView {
    gap: 12px;
  }

  .card {
    padding: 16px;
  }

  .formActions {
    flex-direction: column;
    align-items: stretch;
  }

  .exportActions {
    flex-direction: column;
  }

  .sessionItem {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .sessionItem .btnDangerSmall {
    align-self: flex-end;
  }

  .backupCodesGrid {
    grid-template-columns: 1fr 1fr;
  }

  .cardHeader {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
