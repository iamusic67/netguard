/**
 * Export Service
 * Handles CSV and PDF export functionality
 */

const { logger } = require('../utils/logger');

/**
 * Convert data to CSV format
 * @param {object[]} data - Array of objects to convert
 * @param {string[]} columns - Optional column order
 * @returns {string} CSV string
 */
const toCSV = (data, columns = null) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get columns from first object if not specified
  const cols = columns || Object.keys(data[0]);

  // Escape CSV value
  const escapeValue = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV
  const header = cols.map(escapeValue).join(',');
  const rows = data.map(row => 
    cols.map(col => escapeValue(row[col])).join(',')
  );

  return [header, ...rows].join('\n');
};

/**
 * Convert data to PDF format (returns HTML for PDF conversion)
 * @param {object} options - PDF options
 * @returns {string} HTML string for PDF
 */
const toPDFHTML = (options) => {
  const {
    title = 'NetGUARD Report',
    subtitle = '',
    data = [],
    columns = null,
    stats = null,
    generatedAt = new Date().toLocaleString('fr-FR')
  } = options;

  const cols = columns || (data.length > 0 ? Object.keys(data[0]) : []);

  const statsHTML = stats ? `
    <div class="stats-grid">
      ${Object.entries(stats).map(([key, value]) => `
        <div class="stat-card">
          <div class="stat-value">${value}</div>
          <div class="stat-label">${key}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const tableHTML = data.length > 0 ? `
    <table>
      <thead>
        <tr>
          ${cols.map(col => `<th>${col}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            ${cols.map(col => `<td>${row[col] ?? ''}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p>Aucune donnée disponible</p>';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      color: #333;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #76ccd6;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-icon {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #76ccd6, #071f34);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: bold;
      color: #071f34;
    }
    h1 {
      font-size: 28px;
      color: #071f34;
      margin-bottom: 5px;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
    }
    .meta {
      text-align: right;
      font-size: 12px;
      color: #888;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      border: 1px solid #e9ecef;
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #071f34;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 12px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #071f34;
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
    }
    tr:nth-child(even) {
      background: #f8f9fa;
    }
    tr:hover {
      background: #e9ecef;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 11px;
      color: #888;
    }
    @media print {
      body {
        padding: 20px;
      }
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">🛡️</div>
      <span class="logo-text">NetGUARD</span>
    </div>
    <div class="meta">
      <p>Généré le ${generatedAt}</p>
    </div>
  </div>
  
  <h1>${title}</h1>
  ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
  
  ${statsHTML}
  ${tableHTML}
  
  <div class="footer">
    <p>© ${new Date().getFullYear()} NetGUARD - Rapport confidentiel</p>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Generate stats export data
 * @param {object} stats - Statistics object
 * @returns {object[]}
 */
const statsToExportData = (stats) => {
  return Object.entries(stats).map(([key, value]) => ({
    Métrique: key,
    Valeur: value
  }));
};

/**
 * Format date for export
 * @param {Date|string} date - Date to format
 * @returns {string}
 */
const formatExportDate = (date) => {
  const d = new Date(date);
  return d.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Create export response
 * @param {object} res - Express response
 * @param {string} data - Export data
 * @param {string} filename - File name
 * @param {string} type - Content type
 */
const sendExport = (res, data, filename, type) => {
  const mimeTypes = {
    csv: 'text/csv',
    html: 'text/html',
    json: 'application/json'
  };

  res.setHeader('Content-Type', `${mimeTypes[type] || 'text/plain'}; charset=utf-8`);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(data);
};

/**
 * Export login history
 * @param {object[]} history - Login history data
 * @returns {object}
 */
const formatLoginHistory = (history) => {
  return history.map(entry => ({
    Date: formatExportDate(entry.created_at),
    'Adresse IP': entry.ip_address || 'N/A',
    Appareil: entry.user_agent ? parseUserAgent(entry.user_agent) : 'N/A',
    Statut: entry.status === 'success' ? 'Réussi' : 
            entry.status === 'failed' ? 'Échoué' : 'Bloqué',
    Raison: entry.failure_reason || '-'
  }));
};

/**
 * Parse user agent string
 * @param {string} ua - User agent string
 * @returns {string}
 */
const parseUserAgent = (ua) => {
  if (!ua) return 'Inconnu';
  
  // Simple parser
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Android')) return 'Android';
  
  return 'Autre';
};

/**
 * Export alerts
 * @param {object[]} alerts - Alerts data
 * @returns {object[]}
 */
const formatAlerts = (alerts) => {
  return alerts.map(alert => ({
    Date: formatExportDate(alert.created_at),
    Type: alert.type,
    Titre: alert.title,
    Description: alert.description || '',
    Sévérité: alert.severity || 'info',
    Statut: alert.resolved ? 'Résolu' : 'Actif'
  }));
};

module.exports = {
  toCSV,
  toPDFHTML,
  statsToExportData,
  formatExportDate,
  sendExport,
  formatLoginHistory,
  formatAlerts,
  parseUserAgent
};
