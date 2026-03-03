-- =============================================
-- NetGUARD Database Schema
-- Version: 1.0.0
-- =============================================

-- Utiliser la base de données
USE netguard_db;

-- =============================================
-- Table: users
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) DEFAULT NULL,
    first_name VARCHAR(100) DEFAULT NULL,
    last_name VARCHAR(100) DEFAULT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    role ENUM('admin', 'user', 'moderator') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    must_change_password BOOLEAN DEFAULT FALSE,
    last_login DATETIME DEFAULT NULL,
    login_attempts INT DEFAULT 0,
    locked_until DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_uuid (uuid),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: password_resets
-- =============================================
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: sessions
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    expires_at DATETIME NOT NULL,
    is_valid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token(255)),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: email_verifications
-- =============================================
CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: login_history
-- =============================================
CREATE TABLE IF NOT EXISTS login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    status ENUM('success', 'failed', 'blocked') NOT NULL,
    failure_reason VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: devices (pour le dashboard)
-- =============================================
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('desktop', 'laptop', 'mobile', 'tablet', 'tv', 'gaming', 'iot', 'other') DEFAULT 'other',
    ip_address VARCHAR(45) NOT NULL,
    mac_address VARCHAR(17) DEFAULT NULL,
    status ENUM('online', 'offline', 'idle') DEFAULT 'offline',
    last_seen DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: user_oauth (Social Login)
-- =============================================
CREATE TABLE IF NOT EXISTS user_oauth (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider ENUM('google', 'microsoft', 'github') NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    access_token TEXT DEFAULT NULL,
    refresh_token TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_user (user_id, provider),
    UNIQUE KEY unique_provider_id (provider, provider_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: notifications
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('alert', 'info', 'warning', 'success', 'error', 'security', 'login', 'device') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT DEFAULT NULL,
    data JSON DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: alerts (pour le dashboard)
-- =============================================
-- =============================================
CREATE TABLE IF NOT EXISTS alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('critical', 'warning', 'info', 'success') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Table: network_stats (pour le graphique)
-- =============================================
CREATE TABLE IF NOT EXISTS network_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    connections INT DEFAULT 0,
    bandwidth_up BIGINT DEFAULT 0,
    bandwidth_down BIGINT DEFAULT 0,
    threats_blocked INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_user_id (user_id),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Insertion d'un utilisateur admin par défaut
-- Password: Admin@NetGuard2024!
-- =============================================
INSERT INTO users (uuid, email, password, full_name, role, is_active, is_verified) VALUES
(UUID(), 'admin@netguard.io', '$2a$12$/sN/FgPN/PgSZUkFBN/Jj.pWpu74od5AeEzTi88gt2WExVfnqcndK', 'Administrateur NetGUARD', 'admin', TRUE, TRUE);

-- =============================================
-- Données de démonstration
-- =============================================

-- Devices de démo
INSERT INTO devices (user_id, name, type, ip_address, mac_address, status, last_seen) VALUES
(1, 'MacBook Pro', 'laptop', '192.168.1.10', 'A1:B2:C3:D4:E5:F6', 'online', NOW()),
(1, 'iPhone 15 Pro', 'mobile', '192.168.1.24', 'B2:C3:D4:E5:F6:A1', 'online', NOW()),
(1, 'Desktop PC', 'desktop', '192.168.1.5', 'C3:D4:E5:F6:A1:B2', 'online', NOW()),
(1, 'Smart TV Samsung', 'tv', '192.168.1.42', 'D4:E5:F6:A1:B2:C3', 'idle', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 'PlayStation 5', 'gaming', '192.168.1.88', 'E5:F6:A1:B2:C3:D4', 'offline', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- Alertes de démo
INSERT INTO alerts (user_id, type, title, message, is_read) VALUES
(1, 'critical', 'Tentative de connexion suspecte', 'Une tentative de connexion depuis une IP inconnue (185.234.xx.xx) a été bloquée.', FALSE),
(1, 'warning', 'Mise à jour de sécurité disponible', 'Une nouvelle mise à jour du pare-feu est disponible. Version 2.5.1', FALSE),
(1, 'info', 'Nouveau certificat SSL installé', 'Le certificat SSL a été renouvelé avec succès. Expire le 15/01/2026.', TRUE),
(1, 'success', 'Analyse complète terminée', 'L\'analyse de sécurité complète s\'est terminée sans détecter de menaces.', TRUE);

-- Stats réseau de démo (7 derniers jours)
INSERT INTO network_stats (user_id, date, connections, bandwidth_up, bandwidth_down, threats_blocked) VALUES
(1, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 650, 5368709120, 21474836480, 5),
(1, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 800, 6442450944, 25769803776, 8),
(1, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 720, 5905580032, 23622320128, 3),
(1, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 900, 7516192768, 30064771072, 12),
(1, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 850, 7073546240, 28294180864, 7),
(1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 450, 3758096384, 15032385536, 2),
(1, CURDATE(), 380, 3221225472, 12884901888, 1);
