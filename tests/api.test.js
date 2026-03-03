/**
 * NetGUARD - Tests des appels API
 * Verifie que tous les endpoints repondent correctement
 *
 * Usage : npm run test:api
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
let token = null;

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

// ===== Tests =====

async function testHealth() {
  section('Health Check');
  const { status, data } = await request('GET', '/health');
  log(status === 200, 'GET /health', `${status}`);
  log(data?.success === true, 'Reponse success: true');
}

async function testAuthRegisterValidation() {
  section('Auth - Validation inscription');

  // Email invalide
  const { status: s1 } = await request('POST', '/auth/register', {
    email: 'invalid', password: 'Test1234!', firstName: 'Test', lastName: 'User'
  });
  log(s1 === 400, 'Email invalide -> 400', `${s1}`);

  // Mot de passe faible
  const { status: s2 } = await request('POST', '/auth/register', {
    email: 'test@test.com', password: 'weak', firstName: 'Test', lastName: 'User'
  });
  log(s2 === 400, 'Mot de passe faible -> 400', `${s2}`);
}

async function testAuthLoginValidation() {
  section('Auth - Validation connexion');

  // Email invalide
  const { status: s1 } = await request('POST', '/auth/login', {
    email: 'invalid', password: 'password'
  });
  log(s1 === 400, 'Email invalide -> 400', `${s1}`);

  // Mauvais identifiants
  const { status: s2 } = await request('POST', '/auth/login', {
    email: 'fake@fake.com', password: 'FakePassword1!'
  });
  log(s2 === 401, 'Mauvais identifiants -> 401', `${s2}`);
}

async function testAuthLogin() {
  section('Auth - Connexion admin');

  const { status, data } = await request('POST', '/auth/login', {
    email: 'admin@netguard.io', password: 'Admin@NetGuard2024!'
  });
  log(status === 200, 'POST /auth/login (admin)', `${status}`);
  log(data?.data?.token != null, 'Token recu');
  log(data?.data?.user?.role === 'admin', 'Role admin confirme');

  if (data?.data?.token) {
    token = data.data.token;
  }
}

async function testAuthMe() {
  section('Auth - Utilisateur courant');

  // Sans token
  const { status: s1 } = await request('GET', '/auth/me');
  log(s1 === 401, 'GET /auth/me sans token -> 401', `${s1}`);

  // Avec token
  if (token) {
    const { status: s2, data } = await request('GET', '/auth/me', null, token);
    log(s2 === 200, 'GET /auth/me avec token -> 200', `${s2}`);
    log(data?.data?.email === 'admin@netguard.io', 'Email correct');
  }
}

async function testAdminRoutes() {
  section('Admin - Gestion utilisateurs');

  if (!token) {
    log(false, 'SKIP - Pas de token admin');
    return;
  }

  // Liste des utilisateurs
  const { status: s1, data: d1 } = await request('GET', '/admin/users', null, token);
  log(s1 === 200, 'GET /admin/users -> 200', `${s1}`);
  log(Array.isArray(d1?.data), 'Liste utilisateurs est un tableau');

  // Sans token (acces refuse)
  const { status: s2 } = await request('GET', '/admin/users');
  log(s2 === 401, 'GET /admin/users sans token -> 401', `${s2}`);
}

async function testForceChangePassword() {
  section('Auth - Force change password');

  if (!token) {
    log(false, 'SKIP - Pas de token admin');
    return;
  }

  // Sans nouveau mot de passe
  const { status: s1 } = await request('POST', '/auth/force-change-password', {}, token);
  log(s1 === 400, 'Sans newPassword -> 400', `${s1}`);

  // Mot de passe trop faible
  const { status: s2 } = await request('POST', '/auth/force-change-password', {
    newPassword: 'weak'
  }, token);
  log(s2 === 400, 'Mot de passe faible -> 400', `${s2}`);
}

async function testProtectedRoutes() {
  section('Routes protegees (sans token)');

  const routes = [
    ['GET', '/profile'],
    ['GET', '/sessions'],
    ['GET', '/dashboard/stats'],
    ['GET', '/admin/users']
  ];

  for (const [method, path] of routes) {
    const { status } = await request(method, path);
    log(status === 401, `${method} ${path} -> 401`, `${status}`);
  }
}

async function test404() {
  section('Route inexistante');

  const { status } = await request('GET', '/cette-route-nexiste-pas');
  log(status === 404, 'GET /route-inexistante -> 404', `${status}`);
}

// ===== Runner =====

async function run() {
  console.log(`\n${colors.bold}========================================`);
  console.log(`  NetGUARD - Tests API`);
  console.log(`  ${API}`);
  console.log(`========================================${colors.reset}`);

  try {
    await testHealth();
    await testAuthRegisterValidation();
    await testAuthLoginValidation();
    await testAuthLogin();
    await testAuthMe();
    await testAdminRoutes();
    await testForceChangePassword();
    await testProtectedRoutes();
    await test404();
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
