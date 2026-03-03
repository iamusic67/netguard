/**
 * NetGUARD - Tests d'integration Front <-> Back
 * Verifie que les appels frontend correspondent aux routes backend
 * et que le flux complet fonctionne
 *
 * Usage : npm run test:integration
 * Prerequis : docker-compose up -d
 */

const API = process.env.API_URL || 'http://localhost:3000/api';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

let passed = 0;
let failed = 0;

// ===== Helpers =====

async function request(method, endpoint, body = null, authToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API}${endpoint}`, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function log(pass, name, detail = '') {
  if (pass) {
    passed++;
    console.log(`  ${colors.green}\u2713${colors.reset} ${name} ${detail ? colors.cyan + detail + colors.reset : ''}`);
  } else {
    failed++;
    console.log(`  ${colors.red}\u2717${colors.reset} ${name} ${detail ? colors.red + detail + colors.reset : ''}`);
  }
}

function section(title) {
  console.log(`\n${colors.bold}${colors.cyan}[ ${title} ]${colors.reset}`);
}

// ===== Test : Flux d'authentification complet =====

async function testFullAuthFlow() {
  section('Flux complet : Inscription -> Connexion -> Profil -> Deconnexion');

  const email = `test-${Date.now()}@netguard-test.io`;
  const password = 'TestPassword1!';

  // 1. Inscription
  const { status: s1, data: d1 } = await request('POST', '/auth/register', {
    email, password, firstName: 'Test', lastName: 'Integration'
  });
  log(s1 === 201 || s1 === 200, '1. Inscription', `${s1}`);

  const userToken = d1?.data?.token;
  log(userToken != null, '   Token recu apres inscription');

  if (!userToken) return;

  // 2. Recuperer profil
  const { status: s2, data: d2 } = await request('GET', '/auth/me', null, userToken);
  log(s2 === 200, '2. GET /auth/me', `${s2}`);
  log(d2?.data?.email === email, '   Email correspond', email);

  // 3. Profil utilisateur
  const { status: s3 } = await request('GET', '/profile', null, userToken);
  log(s3 === 200, '3. GET /profile', `${s3}`);

  // 4. Sessions
  const { status: s4 } = await request('GET', '/sessions', null, userToken);
  log(s4 === 200, '4. GET /sessions', `${s4}`);

  // 5. Deconnexion
  const { status: s5 } = await request('POST', '/auth/logout', null, userToken);
  log(s5 === 200, '5. POST /auth/logout', `${s5}`);

  // 6. Token invalide apres deconnexion
  const { status: s6 } = await request('GET', '/auth/me', null, userToken);
  log(s6 === 401, '6. Token invalide apres logout -> 401', `${s6}`);
}

// ===== Test : Flux admin complet =====

async function testAdminFlow() {
  section('Flux complet : Admin -> Liste users -> Modifier role -> Temp password');

  // Login admin
  const { data: loginData } = await request('POST', '/auth/login', {
    email: 'admin@netguard.io', password: 'Admin@NetGuard2024!'
  });
  const adminToken = loginData?.data?.token;

  if (!adminToken) {
    log(false, 'SKIP - Login admin echoue');
    return;
  }
  log(true, '1. Login admin OK');

  // Liste des utilisateurs
  const { status: s1, data: d1 } = await request('GET', '/admin/users', null, adminToken);
  log(s1 === 200, '2. GET /admin/users', `${s1}`);

  const users = d1?.data || [];
  log(users.length > 0, `   ${users.length} utilisateur(s) trouve(s)`);

  // Trouver un user non-admin pour tester
  const targetUser = users.find(u => u.role !== 'admin');
  if (!targetUser) {
    log(true, '   Pas d\'utilisateur non-admin a modifier (SKIP)');
    return;
  }

  // Modifier le role
  const { status: s2 } = await request('PUT', `/admin/users/${targetUser.id}`, {
    firstName: targetUser.first_name || targetUser.full_name?.split(' ')[0] || 'Test',
    lastName: targetUser.last_name || targetUser.full_name?.split(' ')[1] || 'User',
    email: targetUser.email,
    role: 'moderator'
  }, adminToken);
  log(s2 === 200, '3. Modifier role -> moderator', `${s2}`);

  // Remettre le role original
  const { status: s3 } = await request('PUT', `/admin/users/${targetUser.id}`, {
    firstName: targetUser.first_name || targetUser.full_name?.split(' ')[0] || 'Test',
    lastName: targetUser.last_name || targetUser.full_name?.split(' ')[1] || 'User',
    email: targetUser.email,
    role: targetUser.role || 'user'
  }, adminToken);
  log(s3 === 200, '4. Remettre role original', `${s3}`);

  // Generer mot de passe temporaire
  const { status: s4, data: d4 } = await request('POST', `/admin/users/${targetUser.id}/temp-password`, null, adminToken);
  log(s4 === 200, '5. Generer temp password', `${s4}`);
  log(d4?.data?.temporaryPassword != null, '   Mot de passe temporaire recu');
}

// ===== Test : Correspondance Frontend API <-> Backend Routes =====

async function testFrontBackMapping() {
  section('Correspondance Frontend API <-> Backend Routes');

  // Login pour avoir un token
  const { data: loginData } = await request('POST', '/auth/login', {
    email: 'admin@netguard.io', password: 'Admin@NetGuard2024!'
  });
  const t = loginData?.data?.token;

  // Chaque endpoint utilise par le frontend
  const endpoints = [
    // authApi
    { method: 'GET',  path: '/health',           auth: false, name: 'healthCheck' },
    { method: 'GET',  path: '/auth/me',           auth: true,  name: 'authApi.me' },
    // adminApi
    { method: 'GET',  path: '/admin/users',       auth: true,  name: 'adminApi.getUsers' },
    // sessionApi
    { method: 'GET',  path: '/sessions',          auth: true,  name: 'sessionApi.getAll' },
    // profileApi
    { method: 'GET',  path: '/profile',           auth: true,  name: 'profileApi.get' },
    // dashboardApi
    { method: 'GET',  path: '/dashboard/stats',   auth: true,  name: 'dashboardApi.getStats' },
    // oauthApi
    { method: 'GET',  path: '/auth/oauth/providers', auth: false, name: 'oauthApi.getProviders' },
  ];

  for (const ep of endpoints) {
    const { status } = await request(ep.method, ep.path, null, ep.auth ? t : null);
    const ok = status !== 404 && status !== 500;
    log(ok, `${ep.name} -> ${ep.method} ${ep.path}`, `${status}`);
  }
}

// ===== Test : CORS =====

async function testCORS() {
  section('CORS - Headers');

  const res = await fetch(`${API}/health`, {
    method: 'OPTIONS',
    headers: { 'Origin': 'http://localhost:5173' }
  });

  const acaoHeader = res.headers.get('access-control-allow-origin');
  log(acaoHeader != null, 'Access-Control-Allow-Origin present', acaoHeader || 'absent');
}

// ===== Runner =====

async function run() {
  console.log(`\n${colors.bold}========================================`);
  console.log(`  NetGUARD - Tests Integration`);
  console.log(`  Front <-> Back`);
  console.log(`  ${API}`);
  console.log(`========================================${colors.reset}`);

  try {
    await testFrontBackMapping();
    await testFullAuthFlow();
    await testAdminFlow();
    await testCORS();
  } catch (err) {
    console.log(`\n${colors.red}Erreur fatale: ${err.message}${colors.reset}`);
    console.log(`${colors.yellow}Verifiez que le serveur est demarre (docker-compose up -d)${colors.reset}`);
    process.exit(1);
  }

  // Resume
  console.log(`\n${colors.bold}========================================`);
  console.log(`  Resultats: ${colors.green}${passed} passes${colors.reset}${colors.bold} / ${colors.red}${failed} echoues${colors.reset}${colors.bold} / ${passed + failed} total`);
  console.log(`========================================${colors.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run();
