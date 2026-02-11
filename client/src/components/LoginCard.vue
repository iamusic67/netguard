<template>
  <div class="wrap" :class="theme">
    <!-- ===== BRAND SIDE ===== -->
    <aside class="brand" aria-label="NetGUARD branding">
      <img
        class="logo"
        :src="logoUrl"
        alt="NetGUARD"
        :style="{ width: logoSize }"
      />

      <div class="brandText">
        <h1>{{ brandTitle }}</h1>
        <p>{{ brandSubtitle }}</p>

        <!-- Séparateur décoratif -->
        <div class="separator"></div>

        <div class="badges" aria-label="Security highlights">
          <span class="badge badgeBlue">
            <span class="dot dotBlue"></span> Réseau protégé
          </span>
          <span class="badge badgeGreen">
            <span class="dot dotGreen"></span> Accès contrôlé
          </span>
          <span class="badge badgeRed">
            <span class="dot dotRed"></span> Alertes temps réel
          </span>
        </div>
      </div>

    </aside>

    <!-- ===== AUTH CARD ===== -->
    <section class="card" aria-label="Authentication form">
      <header class="cardHeader">
        <div class="headerLeft">
          <transition name="slideTitle" mode="out-in">
            <div :key="currentView">
              <h2>{{ cardTitle }}</h2>
              <p>{{ cardSubtitle }}</p>
            </div>
          </transition>
        </div>

        <!-- Toggle Dark/Light - Hidden for dark-only mode -->
        <button
          class="themeToggle"
          type="button"
          @click="toggleTheme"
          :aria-label="isLight ? 'Activer le mode sombre' : 'Activer le mode clair'"
          :title="isLight ? 'Mode sombre' : 'Mode clair'"
          style="display: none;"
        >
          <span class="toggleIcon" aria-hidden="true" v-html="isLight ? icons.moon : icons.sun">
          </span>
          <span class="toggleText">
            {{ isLight ? "Sombre" : "Clair" }}
          </span>
        </button>
      </header>

      <!-- ===== LOGIN FORM ===== -->
      <transition name="slideForm" mode="out-in">
        <form v-if="currentView === 'login'" class="form" @submit.prevent="onLogin" novalidate key="login">
          <!-- EMAIL -->
          <div class="field">
            <label for="email">Email</label>
            <div class="control" :class="{ 'has-error': submitted && !isEmailValid, 'has-success': email && isEmailValid }">
              <input
                id="email"
                v-model.trim="email"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="admin@netguard.io"
                :aria-invalid="submitted && !isEmailValid"
                @blur="submitted = true"
                required
              />
            </div>
            <small v-if="email && !isEmailValid" class="error">
              Merci d'entrer un email valide.
            </small>
            <small v-else-if="email && isEmailValid" class="success">
              ✓ Email valide
            </small>
          </div>

          <!-- PASSWORD -->
          <div class="field">
            <label for="password">Mot de passe</label>
            <div class="control" :class="{ 'has-error': submitted && !isPasswordValid, 'has-success': password && isPasswordValid }">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                :aria-invalid="submitted && !isPasswordValid"
                @blur="submitted = true"
                minlength="8"
                required
              />
              <button
                class="ghost"
                type="button"
                @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              >
                {{ showPassword ? "Masquer" : "Afficher" }}
              </button>
            </div>
            <!-- Indicateur de force du mot de passe -->
            <div v-if="password" class="passwordStrength">
              <div class="strengthBar">
                <div
                  class="strengthFill"
                  :class="passwordStrength.class"
                  :style="{ width: passwordStrength.percent + '%' }"
                ></div>
              </div>
              <small class="strengthText" :class="passwordStrength.class">
                {{ passwordStrength.text }}
              </small>
            </div>
            <small v-if="submitted && !isPasswordValid" class="error">
              8 caractères minimum.
            </small>
          </div>

          <!-- OPTIONS -->
          <div class="row">
            <label class="remember">
              <input v-model="remember" type="checkbox" />
              <span>Se souvenir de moi</span>
            </label>

            <a class="forgot" href="#" @click.prevent="switchView('forgot')">
              <span>Mot de passe oublié ?</span>
            </a>
          </div>

          <!-- SUBMIT -->
          <button class="primary" type="submit" :disabled="loading" @click="createRipple">
            <span v-if="!loading" class="buttonContent">
              <span>Connexion</span>
              <span class="buttonArrow">→</span>
            </span>
            <span v-else class="buttonContent">
              <span class="spinner"></span>
              <span>Vérification…</span>
            </span>
            <span class="ripple" v-if="rippleActive"></span>
          </button>

          <p
            v-if="status"
            class="status"
            :class="{ ok: statusType === 'ok', ko: statusType === 'ko' }"
          >
            {{ status }}
          </p>

          <!-- DIVIDER -->
          <div class="divider">
            <span>ou</span>
          </div>

          <!-- REGISTER LINK -->
          <div class="switchAuth">
            <p>Pas encore de compte ?</p>
            <button type="button" class="secondary" @click="switchView('register')">
              <span>Créer un compte</span>
              <span class="buttonArrow">→</span>
            </button>
          </div>

          <p class="hint">
            En te connectant, tu acceptes nos <a href="#" @click.prevent>
              <span>conditions</span>
            </a>.
          </p>
        </form>

        <!-- ===== REGISTER FORM ===== -->
        <form v-else-if="currentView === 'register'" class="form" @submit.prevent="onRegister" novalidate key="register">
          <!-- NOM + PRENOM -->
          <div class="fieldRow">
            <div class="field">
              <label for="firstName">Prénom</label>
              <div class="control" :class="{ 'has-error': regSubmitted && !isFirstNameValid, 'has-success': firstName && isFirstNameValid }">
                <input
                  id="firstName"
                  v-model.trim="firstName"
                  type="text"
                  autocomplete="given-name"
                  placeholder="Prénom"
                  :aria-invalid="regSubmitted && !isFirstNameValid"
                  @blur="regSubmitted = true"
                  required
                />
              </div>
              <small v-if="regSubmitted && !isFirstNameValid" class="error">
                Prénom requis
              </small>
            </div>
            <div class="field">
              <label for="lastName">Nom</label>
              <div class="control" :class="{ 'has-error': regSubmitted && !isLastNameValid, 'has-success': lastName && isLastNameValid }">
                <input
                  id="lastName"
                  v-model.trim="lastName"
                  type="text"
                  autocomplete="family-name"
                  placeholder="Nom"
                  :aria-invalid="regSubmitted && !isLastNameValid"
                  @blur="regSubmitted = true"
                  required
                />
              </div>
              <small v-if="regSubmitted && !isLastNameValid" class="error">
                Nom requis
              </small>
            </div>
          </div>

          <!-- EMAIL -->
          <div class="field">
            <label for="regEmail">Email</label>
            <div class="control" :class="{ 'has-error': regSubmitted && !isRegEmailValid, 'has-success': regEmail && isRegEmailValid }">
              <input
                id="regEmail"
                v-model.trim="regEmail"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="email@exemple.com"
                :aria-invalid="regSubmitted && !isRegEmailValid"
                @blur="regSubmitted = true"
                required
              />
            </div>
            <small v-if="regEmail && !isRegEmailValid" class="error">
              Merci d'entrer un email valide.
            </small>
            <small v-else-if="regEmail && isRegEmailValid" class="success">
              ✓ Email valide
            </small>
          </div>

          <!-- PASSWORD -->
          <div class="field">
            <label for="regPassword">Mot de passe</label>
            <div class="control" :class="{ 'has-error': regSubmitted && !isRegPasswordValid, 'has-success': regPassword && isRegPasswordValid }">
              <input
                id="regPassword"
                v-model="regPassword"
                :type="showRegPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                :aria-invalid="regSubmitted && !isRegPasswordValid"
                @blur="regSubmitted = true"
                minlength="8"
                required
              />
              <button
                class="ghost"
                type="button"
                @click="showRegPassword = !showRegPassword"
                :aria-label="showRegPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              >
                {{ showRegPassword ? "Masquer" : "Afficher" }}
              </button>
            </div>
            <!-- Indicateur de force du mot de passe -->
            <div v-if="regPassword" class="passwordStrength">
              <div class="strengthBar">
                <div
                  class="strengthFill"
                  :class="regPasswordStrength.class"
                  :style="{ width: regPasswordStrength.percent + '%' }"
                ></div>
              </div>
              <small class="strengthText" :class="regPasswordStrength.class">
                {{ regPasswordStrength.text }}
              </small>
            </div>
            <small v-if="regSubmitted && !isRegPasswordValid" class="error">
              {{ getPasswordError(regPassword) }}
            </small>
          </div>

          <!-- CONFIRM PASSWORD -->
          <div class="field">
            <label for="confirmPassword">Confirmer le mot de passe</label>
            <div class="control" :class="{ 'has-error': regSubmitted && !isConfirmPasswordValid, 'has-success': confirmPassword && isConfirmPasswordValid }">
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="••••••••"
                :aria-invalid="regSubmitted && !isConfirmPasswordValid"
                @blur="regSubmitted = true"
                minlength="8"
                required
              />
              <button
                class="ghost"
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                :aria-label="showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              >
                {{ showConfirmPassword ? "Masquer" : "Afficher" }}
              </button>
            </div>
            <small v-if="confirmPassword && !isConfirmPasswordValid" class="error">
              Les mots de passe ne correspondent pas.
            </small>
            <small v-else-if="confirmPassword && isConfirmPasswordValid" class="success">
              ✓ Mots de passe identiques
            </small>
          </div>

          <!-- TERMS -->
          <label class="terms">
            <input v-model="acceptTerms" type="checkbox" />
            <span>J'accepte les <a href="#" @click.prevent>conditions d'utilisation</a> et la <a href="#" @click.prevent>politique de confidentialité</a></span>
          </label>

          <!-- SUBMIT -->
          <button class="primary" type="submit" :disabled="regLoading" @click="createRipple">
            <span v-if="!regLoading" class="buttonContent">
              <span>Créer mon compte</span>
              <span class="buttonArrow">→</span>
            </span>
            <span v-else class="buttonContent">
              <span class="spinner"></span>
              <span>Création…</span>
            </span>
            <span class="ripple" v-if="rippleActive"></span>
          </button>

          <p
            v-if="regStatus"
            class="status"
            :class="{ ok: regStatusType === 'ok', ko: regStatusType === 'ko' }"
          >
            {{ regStatus }}
          </p>

          <!-- DIVIDER -->
          <div class="divider">
            <span>ou</span>
          </div>

          <!-- LOGIN LINK -->
          <div class="switchAuth">
            <p>Déjà un compte ?</p>
            <button type="button" class="secondary" @click="switchView('login')">
              <span>Se connecter</span>
              <span class="buttonArrow">→</span>
            </button>
          </div>
        </form>

        <!-- ===== FORGOT PASSWORD FORM ===== -->
        <form v-else-if="currentView === 'forgot'" class="form" @submit.prevent="onForgotPassword" novalidate key="forgot">
          <div class="forgotIcon">
            <span class="iconCircle" v-html="icons.key"></span>
          </div>

          <p class="forgotDesc">
            Entre ton adresse email et nous t'enverrons un lien pour réinitialiser ton mot de passe.
          </p>

          <!-- EMAIL -->
          <div class="field">
            <label for="forgotEmail">Email</label>
            <div class="control" :class="{ 'has-error': forgotSubmitted && !isForgotEmailValid, 'has-success': forgotEmail && isForgotEmailValid }">
              <input
                id="forgotEmail"
                v-model.trim="forgotEmail"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="email@exemple.com"
                :aria-invalid="forgotSubmitted && !isForgotEmailValid"
                @blur="forgotSubmitted = true"
                required
              />
            </div>
            <small v-if="forgotEmail && !isForgotEmailValid" class="error">
              Merci d'entrer un email valide.
            </small>
            <small v-else-if="forgotEmail && isForgotEmailValid" class="success">
              ✓ Email valide
            </small>
          </div>

          <!-- SUBMIT -->
          <button class="primary" type="submit" :disabled="forgotLoading" @click="createRipple">
            <span v-if="!forgotLoading" class="buttonContent">
              <span>Envoyer le lien</span>
              <span class="buttonArrow">→</span>
            </span>
            <span v-else class="buttonContent">
              <span class="spinner"></span>
              <span>Envoi en cours…</span>
            </span>
            <span class="ripple" v-if="rippleActive"></span>
          </button>

          <p
            v-if="forgotStatus"
            class="status"
            :class="{ ok: forgotStatusType === 'ok', ko: forgotStatusType === 'ko' }"
          >
            {{ forgotStatus }}
          </p>

          <!-- BACK TO LOGIN -->
          <button type="button" class="backLink" @click="switchView('login')">
            <span class="backArrow">←</span>
            <span>Retour à la connexion</span>
          </button>
        </form>
      </transition>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, defineEmits } from "vue";
import logoUrl from "../assets/netguard-logo.png";
import { authApi } from "../services/api.js";
import { icons } from '../utils/icons.js';

const emit = defineEmits(['login-success']);

/* ===== Logo size ===== */
const logoSize = "230px";

/* ===== Current View ===== */
const currentView = ref("login"); // "login" | "register" | "forgot"

/* ===== Dynamic Titles ===== */
const brandTitle = computed(() => {
  switch (currentView.value) {
    case 'register': return 'Rejoins NetGUARD';
    case 'forgot': return 'Récupération';
    default: return 'Connexion sécurisée';
  }
});

const brandSubtitle = computed(() => {
  switch (currentView.value) {
    case 'register': return 'Crée ton compte et protège ton réseau dès maintenant.';
    case 'forgot': return 'Pas de panique, on va t\'aider à récupérer ton accès.';
    default: return 'Accède à ton espace NetGUARD avec une authentification renforcée.';
  }
});

const cardTitle = computed(() => {
  switch (currentView.value) {
    case 'register': return 'Créer un compte';
    case 'forgot': return 'Mot de passe oublié';
    default: return 'Se connecter';
  }
});

const cardSubtitle = computed(() => {
  switch (currentView.value) {
    case 'register': return 'Remplis le formulaire pour commencer.';
    case 'forgot': return 'Récupère l\'accès à ton compte.';
    default: return 'Entre tes identifiants pour continuer.';
  }
});

/* ===== View Switching ===== */
function switchView(view) {
  currentView.value = view;
  // Reset forms
  submitted.value = false;
  regSubmitted.value = false;
  forgotSubmitted.value = false;
  status.value = "";
  regStatus.value = "";
  forgotStatus.value = "";
}

/* ===== LOGIN Form state ===== */
const email = ref("");
const password = ref("");
const remember = ref(true);
const showPassword = ref(false);
const submitted = ref(false);
const loading = ref(false);
const status = ref("");
const statusType = ref("ok");
const rippleActive = ref(false);

/* ===== REGISTER Form state ===== */
const firstName = ref("");
const lastName = ref("");
const regEmail = ref("");
const regPassword = ref("");
const confirmPassword = ref("");
const showRegPassword = ref(false);
const showConfirmPassword = ref(false);
const acceptTerms = ref(false);
const regSubmitted = ref(false);
const regLoading = ref(false);
const regStatus = ref("");
const regStatusType = ref("ok");

/* ===== FORGOT Form state ===== */
const forgotEmail = ref("");
const forgotSubmitted = ref(false);
const forgotLoading = ref(false);
const forgotStatus = ref("");
const forgotStatusType = ref("ok");

/* ===== LOGIN Validation ===== */
const isEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value));
const isPasswordValid = computed(() => password.value.length >= 8);

/* ===== REGISTER Validation ===== */
const isFirstNameValid = computed(() => firstName.value.length >= 2);
const isLastNameValid = computed(() => lastName.value.length >= 2);
const isRegEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(regEmail.value));
const isRegPasswordValid = computed(() => {
  const pwd = regPassword.value;
  return pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd) && /[^a-zA-Z\d]/.test(pwd);
});
const isConfirmPasswordValid = computed(() => confirmPassword.value === regPassword.value && confirmPassword.value.length >= 8);

/* ===== Password Error Messages ===== */
function getPasswordError(pwd) {
  if (!pwd) return 'Mot de passe requis';
  if (pwd.length < 8) return 'Minimum 8 caractères';
  if (!/[a-z]/.test(pwd)) return 'Ajoute une minuscule (a-z)';
  if (!/[A-Z]/.test(pwd)) return 'Ajoute une majuscule (A-Z)';
  if (!/\d/.test(pwd)) return 'Ajoute un chiffre (0-9)';
  if (!/[^a-zA-Z\d]/.test(pwd)) return 'Ajoute un caractère spécial (!@#$...)';
  return '';
}

/* ===== FORGOT Validation ===== */
const isForgotEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(forgotEmail.value));

/* ===== Password Strength ===== */
function calculateStrength(pwd) {
  if (!pwd) return { percent: 0, text: '', class: '' };
  let strength = 0;
  if (pwd.length >= 8) strength += 25;
  if (pwd.length >= 12) strength += 15;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 20;
  if (/\d/.test(pwd)) strength += 20;
  if (/[^a-zA-Z\d]/.test(pwd)) strength += 20;
  if (strength < 40) return { percent: strength, text: 'Faible', class: 'weak' };
  if (strength < 70) return { percent: strength, text: 'Moyen', class: 'medium' };
  return { percent: Math.min(strength, 100), text: 'Fort', class: 'strong' };
}

const passwordStrength = computed(() => calculateStrength(password.value));
const regPasswordStrength = computed(() => calculateStrength(regPassword.value));

/* ===== Effet Ripple ===== */
function createRipple() {
  rippleActive.value = true;
  setTimeout(() => {
    rippleActive.value = false;
  }, 600);
}

/* ===== Theme (dark/light) ===== */
const theme = ref("dark");
const isLight = computed(() => theme.value === "light");

function applyThemeToDocument(t) {
  document.documentElement.setAttribute("data-theme", t);
}

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}

onMounted(() => {
  const saved = localStorage.getItem("ng-theme");
  if (saved === "dark" || saved === "light") {
    theme.value = saved;
  } else {
    theme.value = "dark";
  }
  applyThemeToDocument(theme.value);
});

watch(theme, (t) => {
  localStorage.setItem("ng-theme", t);
  applyThemeToDocument(t);
});

/* ===== LOGIN Submit ===== */
async function onLogin() {
  submitted.value = true;
  status.value = "";

  if (!isEmailValid.value || !isPasswordValid.value) {
    statusType.value = "ko";
    status.value = "Connexion refusée : vérifie tes champs.";
    return;
  }

  loading.value = true;

  try {
    const response = await authApi.login({
      email: email.value,
      password: password.value,
      remember: remember.value
    });

    loading.value = false;
    statusType.value = "ok";
    status.value = "Authentification réussie ! Redirection...";

    // Emit login success with user data
    setTimeout(() => {
      emit('login-success', response.data.user);
    }, 800);
  } catch (error) {
    loading.value = false;
    statusType.value = "ko";
    status.value = error.message || "Connexion refusée : vérifie tes identifiants.";
  }
}

/* ===== REGISTER Submit ===== */
async function onRegister() {
  regSubmitted.value = true;
  regStatus.value = "";

  if (!isFirstNameValid.value || !isLastNameValid.value || !isRegEmailValid.value || !isRegPasswordValid.value || !isConfirmPasswordValid.value) {
    regStatusType.value = "ko";
    if (!isRegPasswordValid.value) {
      regStatus.value = getPasswordError(regPassword.value);
    } else {
      regStatus.value = "Merci de remplir tous les champs correctement.";
    }
    return;
  }

  if (!acceptTerms.value) {
    regStatusType.value = "ko";
    regStatus.value = "Tu dois accepter les conditions d'utilisation.";
    return;
  }

  regLoading.value = true;

  try {
    const response = await authApi.register({
      email: regEmail.value,
      password: regPassword.value,
      firstName: firstName.value,
      lastName: lastName.value
    });

    regLoading.value = false;
    regStatusType.value = "ok";
    regStatus.value = response.message || "Compte créé avec succès ! Redirection...";

    // Redirect to dashboard after success
    setTimeout(() => {
      emit('login-success', response.data.user);
    }, 800);
  } catch (error) {
    regLoading.value = false;
    regStatusType.value = "ko";
    regStatus.value = error.message || "Erreur lors de la création du compte.";
  }
}

/* ===== FORGOT Submit ===== */
async function onForgotPassword() {
  forgotSubmitted.value = true;
  forgotStatus.value = "";

  if (!isForgotEmailValid.value) {
    forgotStatusType.value = "ko";
    forgotStatus.value = "Merci d'entrer une adresse email valide.";
    return;
  }

  forgotLoading.value = true;

  try {
    const response = await authApi.forgotPassword(forgotEmail.value);

    forgotLoading.value = false;
    forgotStatusType.value = "ok";
    forgotStatus.value = response.message || "Un email de réinitialisation a été envoyé !";
  } catch (error) {
    forgotLoading.value = false;
    forgotStatusType.value = "ko";
    forgotStatus.value = error.message || "Erreur lors de l'envoi de l'email.";
  }
}
</script>

<style scoped>
/* ===========================
   WRAP + THEME VARIABLES
   =========================== */
.wrap {
  width: min(900px, 95%);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  align-items: stretch;

  /* Dark Cybersecurity Theme */
  --card-bg: rgba(22, 27, 34, 0.95);
  --card-border: rgba(48, 54, 61, 0.8);
  --text: #e6edf3;
  --muted: #8b949e;
  --input-bg: rgba(13, 17, 23, 0.8);
  --input-border: rgba(48, 54, 61, 0.8);
  --link: #58a6b0;
  --accent: #58a6b0;
  --accent-purple: #8b6fc0;
  --success: #3da382;
  --error: #d45555;

  /* brand (colonne gauche) */
  --brand-text: #e6edf3;
  --brand-muted: #8b949e;
  --badge-bg: rgba(88, 166, 176, 0.1);
  --badge-border: rgba(88, 166, 176, 0.2);
}

.wrap.dark {
  /* Same as default - always dark */
}

/* Field Row for side-by-side inputs */
.fieldRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 860px) {
  .wrap {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .fieldRow {
    grid-template-columns: 1fr;
  }

  .brand {
    padding: 24px;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }

  .card {
    padding: 24px;
    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  }
}

/* ===========================
   TRANSITIONS
   =========================== */
.slideTitle-enter-active,
.slideTitle-leave-active {
  transition: all 300ms ease;
}

.slideTitle-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slideTitle-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.slideForm-enter-active,
.slideForm-leave-active {
  transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
}

.slideForm-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slideForm-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* ===========================
   BRAND
   =========================== */
.brand {
  border-radius: var(--radius-xl) 0 0 var(--radius-xl);
  padding: 32px;
  color: var(--brand-text);
  background: linear-gradient(135deg, rgba(13, 17, 23, 0.98) 0%, rgba(22, 27, 34, 0.95) 100%);
  border: 1px solid var(--card-border);
  border-right: none;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Séparateur décoratif */
.separator {
  height: 1px;
  margin: 24px 0;
  background: linear-gradient(
    to right,
    transparent,
    rgba(88, 166, 176, 0.3),
    transparent
  );
  position: relative;
}

/* Logo */
.logo {
  display: block;
  margin-bottom: 24px;
  width: 180px !important;
  filter: drop-shadow(0 2px 8px rgba(88, 166, 176, 0.15));
  transform-origin: center;
  will-change: transform, filter;
  transition: transform 300ms ease, filter 300ms ease;
  cursor: pointer;
  position: relative;
  z-index: 1;
}

.logo:hover {
  transform: scale(1.05);
  filter: drop-shadow(0 4px 12px rgba(88, 166, 176, 0.25));
}

@media (prefers-reduced-motion: reduce) {
  .logo { animation: none !important; transform: none !important; }
  .primary { animation: none !important; }
  .badge { transition: none !important; }
  .themeToggle { transition: none !important; }
  .control { transition: none !important; }
}

.brandText h1 {
  font-family: var(--font-display);
  font-size: clamp(20px, 2.2vw, 26px);
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  font-weight: 600;
  position: relative;
  z-index: 1;
}

.brandText p {
  margin: 0;
  line-height: 1.5;
  font-size: 13px;
  max-width: 42ch;
  color: var(--brand-muted);
  position: relative;
  z-index: 1;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
  position: relative;
  z-index: 1;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: default;
  background: var(--badge-bg);
  border: 1px solid var(--badge-border);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  transition: all 200ms ease;
}

.badge:hover {
  transform: translateY(-1px);
  border-color: var(--accent);
  box-shadow: 0 4px 12px rgba(88, 166, 176, 0.15);
}

.badgeBlue:hover {
  background: rgba(88, 166, 176, 0.15);
}

.badgeGreen:hover {
  background: rgba(16, 185, 129, 0.15);
  border-color: var(--success);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

.badgeRed:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: var(--error);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.dotBlue { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
.dotGreen { background: var(--success); box-shadow: 0 0 6px var(--success); }
.dotRed { background: var(--error); box-shadow: 0 0 6px var(--error); }

/* ===========================
   CARD
   =========================== */
.card {
  border-radius: 0 var(--radius-xl) var(--radius-xl) 0;
  padding: 32px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-left: none;
  color: var(--text);
  position: relative;
}

.cardHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.headerLeft h2 {
  font-family: var(--font-display);
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.headerLeft p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 13px;
}

/* Toggle */
.themeToggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  color: var(--muted);
  border: 1px solid var(--input-border);
  background: transparent;
  font-size: 12px;
  transition: all 200ms ease;
}

.themeToggle:hover {
  border-color: var(--accent);
  color: var(--text);
}

.toggleIcon { font-size: 12px; }
.toggleText { font-weight: 500; display: none; }

/* ===========================
   FORM
   =========================== */
.form {
  margin-top: 20px;
  display: grid;
  gap: 16px;
}

.field label {
  display: block;
  font-size: 12px;
  margin-bottom: 6px;
  color: var(--muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.control {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: var(--radius-md);
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  padding: 10px 12px;
  transition: all 200ms ease;
}

.control .inputIcon {
  font-size: 14px;
  opacity: 0.5;
  width: 16px;
  text-align: center;
}

.control:focus-within {
  border-color: var(--accent);
}

.control:focus-within .inputIcon {
  opacity: 1;
}

.control.has-error {
  border-color: var(--error);
}

.control.has-success {
  border-color: var(--success);
}

input[type="email"],
input[type="password"],
input[type="text"] {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  color: var(--text);
}

input::placeholder { color: var(--muted); opacity: 0.6; }

.ghost {
  border: none;
  background: transparent;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  color: var(--accent);
  transition: background 150ms ease;
}
.ghost:hover { background: rgba(88, 166, 176, 0.1); }

.error {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--error);
}

.success {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--success);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Password Strength */
.passwordStrength {
  margin-top: 8px;
}

.strengthBar {
  height: 3px;
  background: var(--input-border);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.wrap.dark .strengthBar {
  background: var(--input-border);
}

.strengthFill {
  height: 100%;
  border-radius: 2px;
  transition: width 200ms ease;
}

.strengthFill.weak {
  background: var(--error);
}

.strengthFill.medium {
  background: #f97316;
}

.strengthFill.strong {
  background: var(--success);
}

.strengthText {
  font-size: 10px;
  font-weight: 500;
}

.strengthText.weak {
  color: var(--error);
}

.strengthText.medium {
  color: #f97316;
}

.strengthText.strong {
  color: var(--success);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.remember {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
  user-select: none;
  cursor: pointer;
}

.remember input {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
  cursor: pointer;
}

.terms {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 11px;
  color: var(--muted);
  user-select: none;
  cursor: pointer;
  line-height: 1.4;
}

.terms input {
  width: 14px;
  height: 14px;
  margin-top: 1px;
  accent-color: var(--accent);
  cursor: pointer;
  flex-shrink: 0;
}

.terms a {
  color: var(--accent);
  font-weight: 500;
}

.forgot {
  font-size: 12px;
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
  transition: opacity 150ms ease;
}

.forgot:hover {
  opacity: 0.8;
}

.forgot span::after {
  display: none;
}

/* Buttons */
.primary {
  font-weight: 500;
  border: none;
  cursor: pointer;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  color: #0d1117;
  background: linear-gradient(135deg, var(--accent) 0%, #3d8a94 100%);
  box-shadow: 0 4px 12px rgba(88, 166, 176, 0.15);
  transition: all 200ms ease;
  font-size: 13px;
  position: relative;
  overflow: hidden;
}

.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(88, 166, 176, 0.2);
}

.primary:active {
  transform: translateY(0);
}

.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.secondary {
  font-weight: 500;
  border: 1px solid var(--accent);
  cursor: pointer;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  color: var(--accent);
  background: transparent;
  transition: all 200ms ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  font-size: 13px;
}

.secondary:hover {
  background: rgba(88, 166, 176, 0.1);
  transform: translateY(-1px);
}

.secondary:active {
  transform: translateY(0);
}

.buttonContent {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.buttonArrow {
  transition: transform 300ms ease;
}

.primary:hover .buttonArrow,
.secondary:hover .buttonArrow {
  transform: translateX(4px);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  width: 20px;
  height: 20px;
  margin-top: -10px;
  margin-left: -10px;
  animation: rippleEffect 600ms ease-out;
  pointer-events: none;
}

@keyframes rippleEffect {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(20);
    opacity: 0;
  }
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--input-border);
}

.divider span {
  font-size: 11px;
  color: var(--muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Switch Auth */
.switchAuth {
  text-align: center;
}

.switchAuth p {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--muted);
}

/* Back Link */
.backLink {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--accent);
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background 150ms ease;
}

.backLink:hover {
  background: rgba(88, 166, 176, 0.1);
}

.backArrow {
  transition: transform 150ms ease;
}

.backLink:hover .backArrow {
  transform: translateX(-2px);
}

/* Forgot Password Styles */
.forgotIcon {
  text-align: center;
  margin-bottom: 16px;
}

.iconCircle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(88, 166, 176, 0.1);
  border: 1px solid rgba(88, 166, 176, 0.2);
  font-size: 24px;
}

.forgotDesc {
  text-align: center;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0 0 16px;
}

.hint {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
  text-align: center;
}
.wrap.dark .hint { color: var(--muted); }

.hint a {
  color: var(--accent);
  font-weight: 500;
}

.hint a span::after {
  display: none;
}

.status {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  font-size: 12px;
  border: 1px solid var(--input-border);
  color: var(--text);
  text-align: center;
}
.wrap.dark .status { border-color: var(--input-border); }

.status.ok {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}
.status.ko {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}
</style>
