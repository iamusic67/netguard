/**
 * Network Tools Service
 * Windows-compatible network diagnostic tools
 */

const { spawn } = require('child_process');
const net = require('net');
const { logger } = require('../utils/logger');

// ===== Validation =====

function isValidIP(str) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(str) &&
    str.split('.').every(n => { const num = parseInt(n); return num >= 0 && num <= 255; });
}

function isValidCIDR(str) {
  const parts = str.split('/');
  return parts.length === 2 && isValidIP(parts[0]) &&
    parseInt(parts[1]) >= 0 && parseInt(parts[1]) <= 32;
}

function isValidHostname(str) {
  return /^[a-zA-Z0-9][a-zA-Z0-9.\-]{0,253}[a-zA-Z0-9]$/.test(str) && !str.includes('..');
}

function isValidTarget(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  return isValidIP(trimmed) || isValidHostname(trimmed) || isValidCIDR(trimmed);
}

function isValidPortRange(str) {
  return /^[\d,\- ]+$/.test(str);
}

function sanitize(input) {
  return input.replace(/[^a-zA-Z0-9.\-:/,_ ]/g, '');
}

// ===== Command Runner =====

const MAX_OUTPUT_SIZE = 512 * 1024; // 512KB max output

function runCommand(command, args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let killed = false;
    let truncated = false;

    const proc = spawn(command, args, {
      shell: false,
      windowsHide: true
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
      reject(new Error('Commande expiree (timeout)'));
    }, timeoutMs);

    proc.stdout.on('data', (data) => {
      if (stdout.length < MAX_OUTPUT_SIZE) {
        stdout += data.toString();
        if (stdout.length >= MAX_OUTPUT_SIZE) {
          stdout = stdout.slice(0, MAX_OUTPUT_SIZE) + '\n\n--- Sortie tronquee (limite 512KB) ---';
          truncated = true;
        }
      }
    });

    proc.stderr.on('data', (data) => {
      if (stderr.length < MAX_OUTPUT_SIZE) {
        stderr += data.toString();
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return;
      resolve({ stdout, stderr, exitCode: code, truncated });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ===== Ping =====
async function ping(target, count = 4) {
  if (!isValidTarget(target)) throw new Error('Cible invalide');
  const sanitized = sanitize(target.trim());
  count = Math.min(Math.max(1, parseInt(count) || 4), 10);

  const result = await runCommand('ping', ['-n', String(count), sanitized]);
  return {
    raw: result.stdout || result.stderr,
    success: result.exitCode === 0
  };
}

// ===== Traceroute =====
async function traceroute(target) {
  if (!isValidTarget(target)) throw new Error('Cible invalide');
  const sanitized = sanitize(target.trim());

  const result = await runCommand('tracert', ['-d', sanitized], 60000);
  return {
    raw: result.stdout || result.stderr,
    success: result.exitCode === 0
  };
}

// ===== DNS Lookup =====
async function dnsLookup(target, type = 'A') {
  if (!isValidTarget(target)) throw new Error('Cible invalide');
  const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'PTR', 'SRV', 'ANY'];
  const upperType = (type || 'A').toUpperCase();
  if (!validTypes.includes(upperType)) throw new Error('Type DNS invalide');

  const sanitized = sanitize(target.trim());
  const result = await runCommand('nslookup', ['-type=' + upperType, sanitized]);
  return {
    raw: result.stdout || result.stderr,
    success: result.exitCode === 0
  };
}

// ===== Whois =====
async function whois(target) {
  if (!isValidTarget(target)) throw new Error('Cible invalide');

  try {
    const whoisLib = require('whois-json');
    const result = await whoisLib(target.trim());
    return {
      data: result,
      raw: JSON.stringify(result, null, 2),
      success: true
    };
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error('Module whois-json non installe. Executez: npm install whois-json');
    }
    throw error;
  }
}

// ===== Port Scan (native Node.js) =====
function expandPorts(portStr) {
  const ports = new Set();
  for (const part of portStr.split(',')) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = Math.max(1, start); p <= Math.min(65535, end); p++) {
          ports.add(p);
        }
      }
    } else {
      const p = parseInt(trimmed);
      if (p >= 1 && p <= 65535) ports.add(p);
    }
  }
  return [...ports].sort((a, b) => a - b);
}

async function portScan(target, ports = '80,443,22,21,25,53,3306,8080') {
  if (!isValidTarget(target)) throw new Error('Cible invalide');
  if (!isValidPortRange(ports)) throw new Error('Ports invalides');

  const portList = expandPorts(ports);
  if (portList.length > 1024) throw new Error('Maximum 1024 ports par scan');
  if (portList.length === 0) throw new Error('Aucun port valide specifie');

  const sanitized = sanitize(target.trim());
  const results = [];
  const TIMEOUT = 2000;
  const BATCH_SIZE = 50;

  for (let i = 0; i < portList.length; i += BATCH_SIZE) {
    const batch = portList.slice(i, i + BATCH_SIZE);
    const promises = batch.map(port =>
      new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(TIMEOUT);
        socket.on('connect', () => {
          results.push({ port, status: 'open' });
          socket.destroy();
          resolve();
        });
        socket.on('timeout', () => { socket.destroy(); resolve(); });
        socket.on('error', () => { resolve(); });
        socket.connect(port, sanitized);
      })
    );
    await Promise.all(promises);
  }

  results.sort((a, b) => a.port - b.port);

  return {
    target: sanitized,
    openPorts: results,
    scannedCount: portList.length
  };
}

// ===== Nmap Scan =====
async function nmapScan(target, scanType = 'quick') {
  if (!isValidTarget(target)) throw new Error('Cible invalide');
  const sanitized = sanitize(target.trim());

  const scanArgs = {
    quick: ['-T4', '-F', sanitized],
    full: ['-T4', '-p-', sanitized],
    service: ['-sV', '-T4', sanitized],
    os: ['-O', '-T4', sanitized],
    vuln: ['--script', 'vuln', '-T4', sanitized]
  };

  const args = scanArgs[scanType] || scanArgs.quick;

  try {
    const result = await runCommand('nmap', args, 120000);
    return {
      raw: result.stdout || result.stderr,
      success: result.exitCode === 0
    };
  } catch (error) {
    if (error.message && (error.message.includes('ENOENT') || error.message.includes('not recognized') || error.message.includes('is not recognized'))) {
      throw new Error('nmap n\'est pas installe sur ce systeme. Installez-le depuis https://nmap.org/download.html');
    }
    throw error;
  }
}

module.exports = {
  ping,
  traceroute,
  dnsLookup,
  whois,
  portScan,
  nmapScan
};
