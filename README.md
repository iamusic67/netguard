# NetGUARD

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Plateforme d'authentification et d'administration utilisateurs avec Vue.js 3, Express.js, MySQL et Redis.

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Vue.js 3 (Composition API), Vue Router 4, Vite |
| **Backend** | Express.js, JWT, WebSocket, Rate Limiting, Helmet.js |
| **Base de donnees** | MySQL 8.0, Redis (cache/sessions) |
| **Infra** | Docker Compose |

---

## Fonctionnalites

### Authentification
- Inscription avec validation (email, mot de passe fort, prenom/nom)
- Connexion JWT avec refresh token et "Se souvenir de moi"
- Mot de passe oublie / reinitialisation par email
- Verification d'email
- OAuth (Google, Microsoft, GitHub)
- Changement de mot de passe obligatoire apres reinitialisation par admin
- Rate limiting et protection Helmet.js
- Verrouillage de compte apres 5 tentatives echouees

### Dashboard
- Dashboard vide avec message de bienvenue
- Theme sombre/clair avec persistance
- Navigation responsive (sidebar desktop, hamburger + bottom nav mobile)
- Notifications toast temps reel via WebSocket

### Administration (admin uniquement)
- Onglet "Admin Panel" visible uniquement pour les administrateurs
- Liste des utilisateurs avec recherche
- Modification des informations utilisateur (prenom, nom, email, role)
- Reinitialisation de mot de passe par email ou mot de passe temporaire
- Activation/desactivation des comptes
- Suppression de comptes utilisateurs

---

## Installation

### Prerequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommande)
- OU Node.js 18+ et MySQL 8.0

### Docker (recommande)

```bash
git clone https://github.com/iamusic67/netguard.git
cd netguard
cp .env.example .env
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

---

## Comptes par defaut

| Role | Email | Mot de passe |
|------|-------|-------------|
| Admin | `admin@netguard.io` | `Admin@NetGuard2024!` |

> Changez le mot de passe admin apres la premiere connexion.

---

## Configuration

Copier `.env.example` vers `.env` et modifier les valeurs :

```env
DB_HOST=mysql
DB_PORT=3306
DB_USER=netguard_user
DB_PASSWORD=your-db-password
DB_NAME=netguard_db
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

Variables optionnelles : `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`.

---

## Structure du projet

```
netguard/
├── client/                    # Frontend Vue.js
│   └── src/
│       ├── components/
│       │   ├── LoginCard.vue  # Formulaire login/inscription/mot de passe oublie
│       │   ├── Dashboard.vue  # Dashboard vide + sidebar + admin tab
│       │   ├── AdminPanel.vue # Gestion des utilisateurs (admin)
│       │   └── Toast.vue      # Notifications toast
│       ├── router/            # Vue Router (login, dashboard, admin)
│       ├── services/          # API client + WebSocket
│       ├── utils/             # Icones SVG
│       └── styles/            # CSS global (theme, base)
├── server/                    # Backend Express.js
│   └── src/
│       ├── routes/            # API REST (auth, admin, oauth, etc.)
│       ├── services/          # Logique metier (cache, email, oauth, etc.)
│       ├── middleware/        # Auth, rate limiting, error handling
│       ├── utils/             # Logger
│       └── config/            # Base de donnees
├── database/                  # Script SQL init
└── docker-compose.yml
```

---

## License

MIT
