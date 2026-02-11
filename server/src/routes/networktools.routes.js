/**
 * Network Tools Routes
 * POST endpoints for network diagnostic tools
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const rateLimit = require('express-rate-limit');
const networkTools = require('../services/networktools.service');

// Stricter rate limit for network tools
const toolsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Trop de requetes. Attendez une minute.'
  }
});

router.use(authenticate);
router.use(toolsLimiter);

// POST /api/tools/ping
router.post('/ping', asyncHandler(async (req, res) => {
  const { target, count = 4 } = req.body;
  if (!target) return res.status(400).json({ success: false, message: 'Cible requise' });
  const result = await networkTools.ping(target, count);
  res.json({ success: true, data: result });
}));

// POST /api/tools/traceroute
router.post('/traceroute', asyncHandler(async (req, res) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ success: false, message: 'Cible requise' });
  const result = await networkTools.traceroute(target);
  res.json({ success: true, data: result });
}));

// POST /api/tools/dns
router.post('/dns', asyncHandler(async (req, res) => {
  const { target, type = 'A' } = req.body;
  if (!target) return res.status(400).json({ success: false, message: 'Cible requise' });
  const result = await networkTools.dnsLookup(target, type);
  res.json({ success: true, data: result });
}));

// POST /api/tools/whois
router.post('/whois', asyncHandler(async (req, res) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ success: false, message: 'Cible requise' });
  const result = await networkTools.whois(target);
  res.json({ success: true, data: result });
}));

// POST /api/tools/portscan
router.post('/portscan', asyncHandler(async (req, res) => {
  const { target, ports = '80,443,22,21,25,53,3306,8080' } = req.body;
  if (!target) return res.status(400).json({ success: false, message: 'Cible requise' });
  const result = await networkTools.portScan(target, ports);
  res.json({ success: true, data: result });
}));

// POST /api/tools/nmap
router.post('/nmap', asyncHandler(async (req, res) => {
  const { target, scanType = 'quick' } = req.body;
  if (!target) return res.status(400).json({ success: false, message: 'Cible requise' });
  const result = await networkTools.nmapScan(target, scanType);
  res.json({ success: true, data: result });
}));

module.exports = router;
