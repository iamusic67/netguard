import { reactive, watch } from 'vue';

const STORAGE_KEY = 'ng-modules';

const defaultModules = {
  network: { enabled: true, label: 'Reseau', icon: 'network', description: 'Surveillance du reseau et statistiques de connexion' },
  security: { enabled: true, label: 'Securite', icon: 'security', description: 'Protection et analyse de securite' },
  devices: { enabled: true, label: 'Appareils', icon: 'devices', description: 'Gestion des appareils connectes' },
  alerts: { enabled: true, label: 'Alertes', icon: 'alerts', description: 'Alertes et notifications en temps reel' },
  reports: { enabled: true, label: 'Rapports', icon: 'reports', description: 'Rapports et analyses detaillees' },
  networkTools: { enabled: true, label: 'Outils reseau', icon: 'terminal', description: 'Ping, traceroute, DNS, scan de ports, nmap, whois' }
};

function createDefaults() {
  const result = {};
  for (const [key, val] of Object.entries(defaultModules)) {
    result[key] = { ...val };
  }
  return result;
}

function loadModules() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const merged = createDefaults();
      for (const key of Object.keys(merged)) {
        if (parsed[key] !== undefined && typeof parsed[key].enabled === 'boolean') {
          merged[key].enabled = parsed[key].enabled;
        }
      }
      return merged;
    }
  } catch (e) { /* fall through */ }
  return createDefaults();
}

export const moduleStore = reactive(loadModules());

watch(
  () => {
    const state = {};
    for (const [key, mod] of Object.entries(moduleStore)) {
      state[key] = { enabled: mod.enabled };
    }
    return JSON.stringify(state);
  },
  (serialized) => {
    localStorage.setItem(STORAGE_KEY, serialized);
  }
);

export function toggleModule(key) {
  if (moduleStore[key]) {
    moduleStore[key].enabled = !moduleStore[key].enabled;
  }
}

export function isModuleEnabled(key) {
  return moduleStore[key]?.enabled ?? true;
}
