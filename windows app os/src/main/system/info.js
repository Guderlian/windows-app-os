'use strict';

// ─── System Info ──────────────────────────────────────────────────────────
// Reads from /proc and /sys on Linux — no extra packages needed.
// ───────────────────────────────────────────────────────────────────────────

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs/promises');
const execAsync = promisify(exec);

async function getInfo() {
  try {
    const [hostname, kernel, uptime, memory, cpu] = await Promise.allSettled([
      getHostname(),
      getKernel(),
      getUptime(),
      getMemory(),
      getCPU(),
    ]);

    return {
      hostname: hostname.status === 'fulfilled' ? hostname.value : 'unknown',
      kernel:   kernel.status   === 'fulfilled' ? kernel.value   : 'unknown',
      uptime:   uptime.status   === 'fulfilled' ? uptime.value   : 0,
      memory:   memory.status   === 'fulfilled' ? memory.value   : { total: 0, free: 0, used: 0 },
      cpu:      cpu.status      === 'fulfilled' ? cpu.value      : { model: 'unknown', cores: 0, usage: 0 },
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function getHostname() {
  const data = await fs.readFile('/proc/sys/kernel/hostname', 'utf-8');
  return data.trim();
}

async function getKernel() {
  const { stdout } = await execAsync('/usr/bin/uname -r', { timeout: 2000 });
  return stdout.trim();
}

async function getUptime() {
  const data = await fs.readFile('/proc/uptime', 'utf-8');
  const seconds = parseFloat(data.split(' ')[0]);
  return Math.floor(seconds);
}

async function getMemory() {
  const meminfo = await fs.readFile('/proc/meminfo', 'utf-8');
  const parse = (key) => {
    const match = meminfo.match(new RegExp(^:\\s+(\\d+), 'm'));
    return match ? parseInt(match[1]) : 0;
  };
  const total = parse('MemTotal');
  const available = parse('MemAvailable');
  const free = parse('MemFree');
  const used = total - (available || free);
  return {
    total: Math.round(total / 1024),   // MB
    used:  Math.round(used / 1024),
    free:  Math.round((available || free) / 1024),
  };
}

async function getCPU() {
  try {
    const cpuinfo = await fs.readFile('/proc/cpuinfo', 'utf-8');
    const modelMatch = cpuinfo.match(/model name\s+:\s+(.+)/);
    const cores = (cpuinfo.match(/^processor\s+:/gm) || []).length;

    // Quick CPU usage from /proc/stat (first call caches, second calculates)
    const stat1 = await fs.readFile('/proc/stat', 'utf-8');
    const parseCPU = (line) => {
      const parts = line.trim().split(/\s+/).slice(1).map(Number);
      return { idle: parts[3] || 0, total: parts.reduce((a, b) => a + b, 0) };
    };
    const cpu1 = parseCPU(stat1.split('\n')[0]);
    await new Promise(r => setTimeout(r, 200));
    const stat2 = await fs.readFile('/proc/stat', 'utf-8');
    const cpu2 = parseCPU(stat2.split('\n')[0]);

    const totalDiff = cpu2.total - cpu1.total;
    const idleDiff = cpu2.idle - cpu1.idle;
    const usage = totalDiff > 0 ? Math.round(((totalDiff - idleDiff) / totalDiff) * 100) : 0;

    return {
      model: modelMatch ? modelMatch[1].trim() : 'unknown',
      cores,
      usage,
    };
  } catch (_) {
    return { model: 'unknown', cores: 0, usage: 0 };
  }
}

module.exports = { getInfo, getUptime, getMemory, getCPU };
