<template>
  <div class="networkTools">
    <!-- Tab Bar -->
    <div class="tabBar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        <span class="tabIcon" v-html="icons[tab.icon]"></span>
        <span class="tabLabel">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tool Panel -->
    <div class="toolPanel card">
      <!-- Input Section -->
      <div class="inputSection">
        <div class="inputRow">
          <div class="inputGroup">
            <label>Cible</label>
            <input
              type="text"
              v-model="target"
              :placeholder="targetPlaceholder"
              @keydown.enter="executeTool"
            />
          </div>

          <!-- Ping count -->
          <div v-if="activeTab === 'ping'" class="inputGroup small">
            <label>Nombre</label>
            <input type="number" v-model.number="pingCount" min="1" max="10" />
          </div>

          <!-- DNS type -->
          <div v-if="activeTab === 'dns'" class="inputGroup small">
            <label>Type</label>
            <select v-model="dnsType">
              <option v-for="t in dnsTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <!-- Nmap scan type -->
          <div v-if="activeTab === 'nmap'" class="inputGroup medium">
            <label>Type de scan</label>
            <select v-model="nmapScanType">
              <option v-for="t in nmapTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
            </select>
          </div>
        </div>

        <!-- Port scan specific -->
        <div v-if="activeTab === 'portscan'" class="inputRow">
          <div class="inputGroup">
            <label>Ports</label>
            <input type="text" v-model="ports" placeholder="80,443,22,8080 ou 1-1024" />
          </div>
        </div>

        <!-- Port presets -->
        <div v-if="activeTab === 'portscan'" class="presets">
          <button
            v-for="preset in portPresets"
            :key="preset.label"
            class="presetBtn"
            @click="ports = preset.value"
          >
            {{ preset.label }}
          </button>
        </div>

        <!-- Execute -->
        <div class="actionRow">
          <button class="executeBtn" @click="executeTool" :disabled="loading || !target.trim()">
            <span v-if="!loading" class="btnContent">
              <span v-html="icons.play"></span>
              <span>Executer</span>
            </span>
            <span v-else class="btnContent">
              <span class="spinner"></span>
              <span>Execution...</span>
            </span>
          </button>
          <button v-if="result || error" class="clearBtn" @click="clearResult">
            Effacer
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="errorBox">
        {{ error }}
      </div>

      <!-- Results -->
      <div v-if="result" class="resultSection">
        <div class="resultHeader">
          <span class="resultTitle">Resultat</span>
          <button class="copyBtn" @click="copyResult" :title="copied ? 'Copie !' : 'Copier'">
            <span v-html="copied ? icons.check : icons.copy"></span>
            <span>{{ copied ? 'Copie' : 'Copier' }}</span>
          </button>
        </div>
        <pre class="resultOutput">{{ result }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { networkToolsApi } from '../services/api.js';
import { icons } from '../utils/icons.js';

const activeTab = ref('ping');
const tabs = [
  { id: 'ping', label: 'Ping', icon: 'ping' },
  { id: 'traceroute', label: 'Traceroute', icon: 'route' },
  { id: 'dns', label: 'DNS Lookup', icon: 'dns' },
  { id: 'whois', label: 'Whois', icon: 'whois' },
  { id: 'portscan', label: 'Port Scan', icon: 'port' },
  { id: 'nmap', label: 'Nmap', icon: 'scan' }
];

// State
const target = ref('');
const loading = ref(false);
const result = ref('');
const error = ref('');
const copied = ref(false);

// DNS
const dnsType = ref('A');
const dnsTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'PTR'];

// Nmap
const nmapScanType = ref('quick');
const nmapTypes = [
  { id: 'quick', label: 'Rapide (Top 100)' },
  { id: 'full', label: 'Complet (65535)' },
  { id: 'service', label: 'Detection services' },
  { id: 'os', label: 'Detection OS' },
  { id: 'vuln', label: 'Vulnerabilites' }
];

// Port scan
const ports = ref('80,443,22,21,25,53,3306,8080');
const portPresets = [
  { label: 'Communs', value: '80,443,22,21,25,53,3306,8080' },
  { label: 'Web', value: '80,443,8080,8443,3000,5000' },
  { label: 'Top 100', value: '1-100' },
  { label: 'Top 1024', value: '1-1024' }
];

// Ping
const pingCount = ref(4);

const targetPlaceholder = computed(() => {
  const placeholders = {
    ping: '8.8.8.8 ou google.com',
    traceroute: '8.8.8.8 ou google.com',
    dns: 'google.com',
    whois: 'google.com ou 8.8.8.8',
    portscan: '192.168.1.1 ou example.com',
    nmap: '192.168.1.0/24 ou example.com'
  };
  return placeholders[activeTab.value] || 'Adresse IP ou domaine';
});

function switchTab(tabId) {
  activeTab.value = tabId;
  result.value = '';
  error.value = '';
}

async function executeTool() {
  if (!target.value.trim()) {
    error.value = 'Veuillez entrer une cible';
    return;
  }
  loading.value = true;
  error.value = '';
  result.value = '';

  try {
    let response;
    switch (activeTab.value) {
      case 'ping':
        response = await networkToolsApi.ping(target.value, pingCount.value);
        result.value = response.data.raw;
        break;
      case 'traceroute':
        response = await networkToolsApi.traceroute(target.value);
        result.value = response.data.raw;
        break;
      case 'dns':
        response = await networkToolsApi.dnsLookup(target.value, dnsType.value);
        result.value = response.data.raw;
        break;
      case 'whois':
        response = await networkToolsApi.whois(target.value);
        result.value = response.data.raw;
        break;
      case 'portscan': {
        response = await networkToolsApi.portScan(target.value, ports.value);
        const data = response.data;
        let output = `Scan de ports — ${data.target}\n`;
        output += `Ports scannes: ${data.scannedCount}\n\n`;
        if (data.openPorts.length === 0) {
          output += 'Aucun port ouvert detecte.\n';
        } else {
          output += 'PORT      STATUS\n';
          output += '\u2500'.repeat(20) + '\n';
          data.openPorts.forEach(p => {
            output += `${String(p.port).padEnd(10)}${p.status}\n`;
          });
          output += `\n${data.openPorts.length} port(s) ouvert(s) sur ${data.scannedCount} scannes`;
        }
        result.value = output;
        break;
      }
      case 'nmap':
        response = await networkToolsApi.nmapScan(target.value, nmapScanType.value);
        result.value = response.data.raw;
        break;
    }
  } catch (err) {
    error.value = err.message || 'Erreur lors de l\'execution';
  } finally {
    loading.value = false;
  }
}

function copyResult() {
  navigator.clipboard.writeText(result.value);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

function clearResult() {
  result.value = '';
  error.value = '';
}
</script>

<style scoped>
.networkTools {
  max-width: 900px;
}

.tabBar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.tab:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.tabIcon {
  display: flex;
  align-items: center;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.inputSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inputRow {
  display: flex;
  gap: 10px;
}

.inputGroup {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.inputGroup.small {
  flex: 0 0 90px;
}

.inputGroup.medium {
  flex: 0 0 200px;
}

.inputGroup label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.inputGroup input,
.inputGroup select {
  padding: 9px 12px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 13px;
  font-family: var(--font-mono);
  transition: border-color 150ms ease;
}

.inputGroup input:focus,
.inputGroup select:focus {
  outline: none;
  border-color: var(--accent);
}

.inputGroup input::placeholder {
  color: var(--text-muted);
  opacity: 0.6;
  font-family: var(--font-body);
}

.inputGroup select {
  cursor: pointer;
  font-family: var(--font-body);
}

.presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.presetBtn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 150ms ease;
}

.presetBtn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.actionRow {
  display: flex;
  gap: 8px;
  align-items: center;
}

.executeBtn {
  display: flex;
  align-items: center;
  padding: 9px 20px;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: #0d1117;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.executeBtn:hover:not(:disabled) {
  filter: brightness(1.1);
}

.executeBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btnContent {
  display: flex;
  align-items: center;
  gap: 6px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(13, 17, 23, 0.3);
  border-top-color: #0d1117;
  border-radius: 50%;
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.clearBtn {
  padding: 9px 16px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
}

.clearBtn:hover {
  border-color: var(--text-muted);
  color: var(--text);
}

/* Error */
.errorBox {
  margin-top: 14px;
  padding: 12px 14px;
  background: rgba(212, 85, 85, 0.08);
  border: 1px solid rgba(212, 85, 85, 0.25);
  border-radius: 6px;
  color: var(--ng-red, #d45555);
  font-size: 13px;
}

/* Results */
.resultSection {
  margin-top: 16px;
}

.resultHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.resultTitle {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.copyBtn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 150ms ease;
}

.copyBtn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.resultOutput {
  padding: 16px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--ng-green, #3da382);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  max-height: 500px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .inputRow {
    flex-direction: column;
  }

  .inputGroup.small,
  .inputGroup.medium {
    flex: 1;
  }

  .tabBar {
    gap: 4px;
  }

  .tab {
    padding: 6px 10px;
    font-size: 11px;
  }

  .tabLabel {
    display: none;
  }
}
</style>
