# NetGUARD

Plateforme de surveillance et d'administration reseau avec Vue.js 3, Express.js, MySQL et Redis.

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Vue.js 3 (Composition API), Vue Router 4, Chart.js, Vite, PWA |
| **Backend** | Express.js, JWT, WebSocket, Rate Limiting, Helmet.js |
| **Base de donnees** | MySQL 8.0, Redis (cache/sessions) |
| **Infra** | Docker Compose, GitHub Actions CI/CD, Sentry |

---

## Fonctionnalites

### Dashboard
- Statistiques en temps reel (protection, connexions, menaces, bande passante)
- Graphique interactif Chart.js (periodes 24h/7j/30j/90j)
- Alertes recentes et appareils connectes
- Actions rapides (scan reseau, pare-feu, rapports)

### Pages dediees
- **Reseau** : stats reseau, activite recente, interfaces detectees
- **Securite** : score de securite, menaces, actions rapides (scan, pare-feu, regles)
- **Appareils** : CRUD complet (ajout, modification, suppression), recherche, filtres
- **Alertes** : liste complete avec marquage lu
- **Rapports** : exports CSV/JSON (historique connexions, donnees personnelles RGPD), historique de connexion avec pagination

### Outils reseau
- Ping, Traceroute, DNS Lookup, Whois, Port Scan, Nmap
- Interface a onglets avec affichage terminal monospace
- Validation stricte des entrees, timeouts, buffer limite (512 KB)
- Execution securisee (`shell: false`)

### Profil utilisateur
- Modification prenom/nom
- Changement de mot de passe avec visibilite toggle
- 2FA TOTP (QR code, codes de secours)
- Sessions actives (revocation individuelle/globale)
- Export donnees RGPD
- Suppression de compte avec confirmation

### Authentification
- JWT avec refresh token
- 2FA TOTP (Google Authenticator)
- OAuth (Google, Microsoft, GitHub)
- reCAPTCHA v3
- Rate limiting et Helmet.js

### Administration
- Gestion des utilisateurs (CRUD)
- Reset mot de passe par email
- Generation de mot de passe temporaire
- Activation/desactivation des comptes

### UI/UX
- Theme sombre/clair avec persistance
- Design professionnel (Inter, icones SVG inline, couleurs sobres)
- Modules activables/desactivables dans les parametres
- Navigation responsive (sidebar desktop, hamburger + bottom nav mobile)
- Transitions de page animees
- Notifications toast temps reel via WebSocket
- PWA installable

---

## Installation

### Prerequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommande)
- OU Node.js 18+ et MySQL 8.0

### Docker (recommande)

```bash
git clone https://github.com/<votre-username>/netguard.git
cd netguard
docker-compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api |
| phpMyAdmin | http://localhost:8080 |

### Developpement local

```bash
# Installer les dependances
npm run install:all

# Configurer l'environnement
cp .env.example .env

# Demarrer MySQL et Redis via Docker
docker-compose up -d mysql redis

# Demarrer le backend
npm run dev:server

# Demarrer le frontend (nouveau terminal)
npm run dev:client
```

---

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run docker:up` | Demarrer tous les services Docker |
| `npm run docker:down` | Arreter tous les services |
| `npm run docker:build` | Rebuild et redemarrer |
| `npm run docker:reset` | Reset complet (supprime les donnees) |
| `npm run install:all` | Installer toutes les dependances |
| `npm run dev:client` | Frontend en mode dev |
| `npm run dev:server` | Backend en mode dev |
| `npm run test:all` | Tous les tests |

---

## Comptes par defaut

| Role | Email | Mot de passe |
|------|-------|-------------|
| Admin | `admin@netguard.io` | `Admin@NetGuard2024!` |

---

## Configuration

Copier `.env.example` vers `.env` :

```env
DB_HOST=mysql
DB_PORT=3306
DB_USER=netguard_user
DB_PASSWORD=NetGuard@User2024!
DB_NAME=netguard_db
REDIS_URL=redis://redis:6379
JWT_SECRET=votre-cle-secrete
JWT_EXPIRES_IN=7d
```

Variables optionnelles : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `RECAPTCHA_SECRET_KEY`, `SENTRY_DSN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`.

---

## Structure du projet

```
netguard/
├── client/                    # Frontend Vue.js
│   └── src/
│       ├── components/        # Composants Vue
│       │   ├── Dashboard.vue  # Layout principal + routing
│       │   ├── LoginCard.vue  # Authentification
│       │   ├── AdminPanel.vue # Administration
│       │   ├── NetworkView.vue
│       │   ├── SecurityView.vue
│       │   ├── DevicesView.vue
│       │   ├── ReportsView.vue
│       │   ├── ProfileView.vue
│       │   ├── NetworkTools.vue
│       │   └── Toast.vue
│       ├── router/            # Vue Router
│       ├── stores/            # Stores reactifs (modules)
│       ├── services/          # API client + WebSocket
│       ├── utils/             # Icones SVG
│       └── styles/            # CSS global (theme, base)
├── server/                    # Backend Express.js
│   └── src/
│       ├── routes/            # API REST
│       ├── services/          # Logique metier
│       ├── middleware/        # Auth, rate limiting
│       └── config/            # Base de donnees
├── database/                  # Script SQL init
├── tests/                     # Tests (unit + e2e)
└── docker-compose.yml
```

---

## License

MIT
