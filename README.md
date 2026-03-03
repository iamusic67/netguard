# NetGUARD

## Stack technique

| Couche | Technologies |
|--------|-------------|
| **Frontend** | Vue.js 3 (Composition API), Vue Router 4, Vite |
| **Backend** | Express.js, JWT, WebSocket, Rate Limiting, Helmet.js |
| **Base de données** | MySQL 8.0, Redis (cache/sessions) |
| **Infra** | Docker Compose |

---

## Fonctionnalités

### Authentification
- Inscription avec validation (email, mot de passe fort, prénom/nom)
- Connexion JWT avec refresh token et "Se souvenir de moi"
- Mot de passe oublié / réinitialisation par email
- Vérification d'email
- OAuth (Google, Microsoft, GitHub)
- Changement de mot de passe obligatoire après réinitialisation par admin
- Rate limiting et protection Helmet.js
- Verrouillage de compte après 5 tentatives échouées

### Dashboard
- Dashboard vide avec message de bienvenue
- Thème sombre/clair avec persistance
- Navigation responsive (sidebar desktop, hamburger + bottom nav mobile)
- Notifications toast temps réel via WebSocket

### Administration (admin uniquement)
- Onglet "Admin Panel" visible uniquement pour les administrateurs
- Liste des utilisateurs avec recherche
- Modification des informations utilisateur (prénom, nom, email, rôle)
- Réinitialisation de mot de passe par email ou mot de passe temporaire
- Activation/désactivation des comptes
- Suppression de comptes utilisateurs

---

## Installation

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommandé)
- OU Node.js 18+ et MySQL 8.0

### Docker (recommandé)

```bash
git clone https://github.com/iamusic67/netguard.git
cd netguard
cp .env.example .env
docker-compose up -d
# ou pour rebuild :
docker-compose up --build -d
```

| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:5173      |
| API        | http://localhost:3000/api  |
| phpMyAdmin | http://localhost:8080      |

### Développement local

```bash
# Installer les dépendances
npm run install:all

# Configurer l'environnement
cp .env.example .env

# Démarrer MySQL et Redis via Docker
docker-compose up -d mysql redis

# Démarrer le backend
npm run dev:server

# Démarrer le frontend (nouveau terminal)
npm run dev:client
```

---

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run docker:up` | Démarrer tous les services Docker |
| `npm run docker:down` | Arrêter tous les services |
| `npm run docker:build` | Rebuild et redémarrer |
| `npm run docker:reset` | Reset complet (supprime les données) |
| `npm run install:all` | Installer toutes les dépendances |
| `npm run dev:client` | Frontend en mode dev |
| `npm run dev:server` | Backend en mode dev |

---

## Comptes par défaut

| Rôle  | Email               | Mot de passe          |
|-------|---------------------|-----------------------|
| Admin | `admin@netguard.io` | `Admin@NetGuard2024!` |

> Changez le mot de passe admin après la première connexion.

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
│       │   ├── LoginCard.vue  # Login / inscription / mot de passe oublié
│       │   ├── Dashboard.vue  # Dashboard vide + sidebar + admin tab
│       │   ├── AdminPanel.vue # Gestion des utilisateurs (admin)
│       │   └── Toast.vue      # Notifications toast
│       ├── router/            # Vue Router (login, dashboard, admin)
│       ├── services/          # API client + WebSocket
│       ├── utils/             # Icônes SVG
│       └── styles/            # CSS global (thème, base)
├── server/                    # Backend Express.js
│   └── src/
│       ├── routes/            # API REST (auth, admin, oauth, etc.)
│       ├── services/          # Logique métier (cache, email, oauth, etc.)
│       ├── middleware/        # Auth, rate limiting, error handling
│       ├── utils/             # Logger
│       └── config/            # Base de données
├── database/                  # Script SQL init
└── docker-compose.yml
```

---

## License

MIT
