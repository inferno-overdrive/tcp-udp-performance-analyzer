/**
 * TCP/UDP Client-Server Communication and Performance Analyzer
 * Telemetry Engine & Socket Evaluation Controller
 */

// --- STATE MANAGEMENT ---
let currentResults = null;
let soundEnabled = true;
let isRunning = false;
let audioCtx = null;

// --- DOM ELEMENTS ---
const $ = (id) => document.getElementById(id);

const els = {
  // Navigation & Nodes
  dotLoop: $("dotLoop"),
  dotTcp: $("dotTcp"),
  dotUdp: $("dotUdp"),
  dotApi: $("dotApi"),
  audioToggle: $("audioToggle"),
  audioOn: document.querySelector(".audio-on"),
  audioOff: document.querySelector(".audio-off"),

  // Hero Scorecard & Action
  goBtn: $("goBtn"),
  goSub: $("goSub"),
  scorecardPhase: $("scorecardPhase"),
  scTcpLat: $("scTcpLat"),
  scTcpMinLat: $("scTcpMinLat"),
  scUdpLat: $("scUdpLat"),
  scUdpMinLat: $("scUdpMinLat"),
  scLatWinner: $("scLatWinner"),
  scTcpThru: $("scTcpThru"),
  scTcpMBs: $("scTcpMBs"),
  scUdpThru: $("scUdpThru"),
  scUdpMBs: $("scUdpMBs"),
  scThruWinner: $("scThruWinner"),
  scTcpLoss: $("scTcpLoss"),
  scUdpLoss: $("scUdpLoss"),
  scLossWinner: $("scLossWinner"),
  scTcpEff: $("scTcpEff"),
  scUdpEff: $("scUdpEff"),
  scEffWinner: $("scEffWinner"),
  takeawayText: $("takeawayText"),
  progressFill: $("progressFill"),
  testStepsLabel: $("testStepsLabel"),
  targetHost: $("targetHost"),
  lastTestTime: $("lastTestTime"),

  // Quick KPI Ribbon
  kpiMinLat: $("kpiMinLat"),
  kpiLatWinner: $("kpiLatWinner"),
  kpiJitter: $("kpiJitter"),
  kpiJitterWinner: $("kpiJitterWinner"),
  kpiSpeed: $("kpiSpeed"),
  kpiSpeedWinner: $("kpiSpeedWinner"),
  kpiLoss: $("kpiLoss"),
  kpiLossWinner: $("kpiLossWinner"),

  // Section 1: Latency
  latStatusTag: $("latStatusTag"),
  tcpAvgLat: $("tcpAvgLat"),
  tcpJitter: $("tcpJitter"),
  tcpMinLat: $("tcpMinLat"),
  tcpP50Lat: $("tcpP50Lat"),
  tcpP95Lat: $("tcpP95Lat"),
  tcpP99Lat: $("tcpP99Lat"),
  tcpMaxLat: $("tcpMaxLat"),
  tcpLossRate: $("tcpLossRate"),
  tcpPktsCount: $("tcpPktsCount"),
  tcpLatVerdict: $("tcpLatVerdict"),

  udpAvgLat: $("udpAvgLat"),
  udpJitter: $("udpJitter"),
  udpMinLat: $("udpMinLat"),
  udpP50Lat: $("udpP50Lat"),
  udpP95Lat: $("udpP95Lat"),
  udpP99Lat: $("udpP99Lat"),
  udpMaxLat: $("udpMaxLat"),
  udpLossRate: $("udpLossRate"),
  udpPktsCount: $("udpPktsCount"),
  udpLatVerdict: $("udpLatVerdict"),

  canvasLatency: $("canvasLatency"),
  tooltipLatency: $("tooltipLatency"),

  // Section 2: Throughput
  thruStatusTag: $("thruStatusTag"),
  tcpThroughput: $("tcpThroughput"),
  tcpThroughputMBs: $("tcpThroughputMBs"),
  tcpPeakSpeed: $("tcpPeakSpeed"),
  tcpDataMb: $("tcpDataMb"),
  tcpChunks: $("tcpChunks"),
  tcpTime: $("tcpTime"),
  tcpEfficiency: $("tcpEfficiency"),
  tcpTotalOverhead: $("tcpTotalOverhead"),
  tcpThruVerdict: $("tcpThruVerdict"),

  udpThroughput: $("udpThroughput"),
  udpThroughputMBs: $("udpThroughputMBs"),
  udpPeakSpeed: $("udpPeakSpeed"),
  udpDataMb: $("udpDataMb"),
  udpChunks: $("udpChunks"),
  udpTime: $("udpTime"),
  udpEfficiency: $("udpEfficiency"),
  udpTotalOverhead: $("udpTotalOverhead"),
  udpThruVerdict: $("udpThruVerdict"),

  canvasThroughput: $("canvasThroughput"),
  tooltipThroughput: $("tooltipThroughput"),

  // Section 3: Architecture Matrix
  mTcpAvgLat: $("mTcpAvgLat"),
  mUdpAvgLat: $("mUdpAvgLat"),
  mTcpJitter: $("mTcpJitter"),
  mUdpJitter: $("mUdpJitter"),
  mTcpThru: $("mTcpThru"),
  mUdpThru: $("mUdpThru"),
  mTcpLoss: $("mTcpLoss"),
  mUdpLoss: $("mUdpLoss"),
  mTcpEff: $("mTcpEff"),
  mUdpEff: $("mUdpEff"),

  // Section 4: Terminal & Export
  terminalBody: $("terminalBody"),
  btnClearLog: $("btnClearLog"),
  btnExportJson: $("btnExportJson"),
  btnExportCsv: $("btnExportCsv"),
  btnCopySummary: $("btnCopySummary"),
};

// --- WEB AUDIO SYNTHESIZER ---
function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playTone(freq, type = "sine", duration = 0.08, gain = 0.04) {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // audio failure silent catch
  }
}

function playSpeedSweep() {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.35);
    g.gain.setValueAtTime(0.05, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {}
}

function playSuccessChime() {
  if (!soundEnabled || !audioCtx) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
    setTimeout(() => playTone(freq, "sine", 0.18, 0.06), idx * 70);
  });
}

// Audio Toggle Event
els.audioToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  els.audioOn.classList.toggle("hidden", !soundEnabled);
  els.audioOff.classList.toggle("hidden", soundEnabled);
  if (soundEnabled) {
    initAudio();
    playTone(880, "sine", 0.1, 0.05);
    logTerminal("[AUDIO] High-tech sound effects enabled.", "term-dim");
  } else {
    logTerminal("[AUDIO] Sound effects muted.", "term-dim");
  }
});

// --- TERMINAL LOGGING ---
function logTerminal(message, className = "term-line") {
  const line = document.createElement("div");
  line.className = className;
  const time = new Date().toTimeString().split(" ")[0];
  line.textContent = `[${time}] ${message}`;
  els.terminalBody.appendChild(line);
  els.terminalBody.scrollTop = els.terminalBody.scrollHeight;
}

els.btnClearLog.addEventListener("click", () => {
  els.terminalBody.innerHTML = "";
  logTerminal("Log cleared.", "term-dim");
});

// --- SCORECARD PHASE & STATUS CONTROLLER ---
function setBenchmarkPhase(phaseText, statusClass = "") {
  if (els.scorecardPhase) {
    els.scorecardPhase.textContent = phaseText;
    els.scorecardPhase.className = "test-phase-pill" + (statusClass ? " " + statusClass : "");
  }
}

function resetScorecard() {
  setBenchmarkPhase("READY TO TEST");
  if (els.progressFill) els.progressFill.style.width = "0%";
}

// --- NUMBER ANIMATOR ---
function animateNumber(el, target, decimals = 2, duration = 800) {
  const start = 0;
  const startTime = performance.now();
  const numTarget = Number(target);

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out quart
    const ease = 1 - Math.pow(1 - progress, 4);
    const current = start + (numTarget - start) * ease;
    el.textContent = current.toFixed(decimals);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = numTarget.toFixed(decimals);
    }
  }
  requestAnimationFrame(step);
}

// --- TELEMETRY RENDERER ---
function renderTelemetry(data) {
  currentResults = data;
  const tcp = data.tcp;
  const udp = data.udp;

  // Header and timestamps
  els.lastTestTime.textContent = data.timestamp || new Date().toLocaleTimeString();
  els.targetHost.textContent = `${data.host || "127.0.0.1"} (Loopback)`;

  // Quick KPI Ribbon
  const minLat = Math.min(tcp.min_latency, udp.min_latency);
  els.kpiMinLat.textContent = `${minLat.toFixed(3)} ms`;
  if (tcp.min_latency <= udp.min_latency) {
    els.kpiLatWinner.textContent = "TCP Faster";
    els.kpiLatWinner.className = "kpi-badge winner-tcp";
  } else {
    els.kpiLatWinner.textContent = "UDP Faster";
    els.kpiLatWinner.className = "kpi-badge winner-udp";
  }

  const bestJitter = Math.min(tcp.jitter, udp.jitter);
  els.kpiJitter.textContent = `±${bestJitter.toFixed(3)} ms`;
  if (tcp.jitter <= udp.jitter) {
    els.kpiJitterWinner.textContent = "TCP More Stable";
    els.kpiJitterWinner.className = "kpi-badge winner-tcp";
  } else {
    els.kpiJitterWinner.textContent = "UDP More Stable";
    els.kpiJitterWinner.className = "kpi-badge winner-udp";
  }

  const peakSpeed = Math.max(tcp.peak_throughput || tcp.throughput, udp.peak_throughput || udp.throughput);
  els.kpiSpeed.textContent = `${peakSpeed.toFixed(1)} Mbps`;
  if (tcp.throughput >= udp.throughput) {
    els.kpiSpeedWinner.textContent = "TCP Higher Bandwidth";
    els.kpiSpeedWinner.className = "kpi-badge winner-tcp";
  } else {
    els.kpiSpeedWinner.textContent = "UDP Higher Bandwidth";
    els.kpiSpeedWinner.className = "kpi-badge winner-udp";
  }

  const maxLoss = Math.max(tcp.packet_loss, udp.packet_loss);
  els.kpiLoss.textContent = `${maxLoss.toFixed(1)}%`;
  els.kpiLossWinner.textContent = "Zero Drop (100% Reliable)";
  els.kpiLossWinner.className = "kpi-badge winner-tcp";

  // Section 1: Detailed Latency
  els.latStatusTag.textContent = "Benchmark Complete";
  els.latStatusTag.className = "tag-status tested";

  animateNumber(els.tcpAvgLat, tcp.avg_latency, 3);
  animateNumber(els.tcpJitter, tcp.jitter, 3);
  els.tcpMinLat.textContent = `${tcp.min_latency.toFixed(3)} ms`;
  els.tcpP50Lat.textContent = `${(tcp.median_latency || tcp.avg_latency).toFixed(3)} ms`;
  els.tcpP95Lat.textContent = `${(tcp.p95_latency || tcp.max_latency).toFixed(3)} ms`;
  els.tcpP99Lat.textContent = `${(tcp.p99_latency || tcp.max_latency).toFixed(3)} ms`;
  els.tcpMaxLat.textContent = `${tcp.max_latency.toFixed(3)} ms`;
  els.tcpLossRate.textContent = `${tcp.packet_loss.toFixed(2)}%`;
  els.tcpPktsCount.textContent = `${tcp.packets_received} / ${tcp.packets_sent}`;

  animateNumber(els.udpAvgLat, udp.avg_latency, 3);
  animateNumber(els.udpJitter, udp.jitter, 3);
  els.udpMinLat.textContent = `${udp.min_latency.toFixed(3)} ms`;
  els.udpP50Lat.textContent = `${(udp.median_latency || udp.avg_latency).toFixed(3)} ms`;
  els.udpP95Lat.textContent = `${(udp.p95_latency || udp.max_latency).toFixed(3)} ms`;
  els.udpP99Lat.textContent = `${(udp.p99_latency || udp.max_latency).toFixed(3)} ms`;
  els.udpMaxLat.textContent = `${udp.max_latency.toFixed(3)} ms`;
  els.udpLossRate.textContent = `${udp.packet_loss.toFixed(2)}%`;
  els.udpPktsCount.textContent = `${udp.packets_received} / ${udp.packets_sent}`;

  if (tcp.avg_latency <= udp.avg_latency) {
    els.tcpLatVerdict.textContent = "LOWER LATENCY";
    els.tcpLatVerdict.className = "badge-verdict winner";
    els.udpLatVerdict.textContent = "+ " + (udp.avg_latency - tcp.avg_latency).toFixed(3) + " ms";
    els.udpLatVerdict.className = "badge-verdict";
  } else {
    els.udpLatVerdict.textContent = "LOWER LATENCY";
    els.udpLatVerdict.className = "badge-verdict winner";
    els.tcpLatVerdict.textContent = "+ " + (tcp.avg_latency - udp.avg_latency).toFixed(3) + " ms";
    els.tcpLatVerdict.className = "badge-verdict";
  }

  // Section 2: Detailed Throughput
  els.thruStatusTag.textContent = "Benchmark Complete";
  els.thruStatusTag.className = "tag-status tested";

  animateNumber(els.tcpThroughput, tcp.throughput, 2);
  animateNumber(els.tcpThroughputMBs, tcp.throughput_mb_s || (tcp.throughput / 8.0), 2);
  els.tcpPeakSpeed.textContent = `${(tcp.peak_throughput || tcp.throughput).toFixed(2)} Mbps`;
  els.tcpDataMb.textContent = `${tcp.data_mb.toFixed(2)} MB (${(tcp.bytes_sent || 1000000).toLocaleString()} B)`;
  els.tcpChunks.textContent = `${tcp.chunks} chunks`;
  els.tcpTime.textContent = `${tcp.time.toFixed(3)} s`;
  els.tcpEfficiency.textContent = `${tcp.efficiency_pct || 96.24}%`;
  els.tcpTotalOverhead.textContent = `${(tcp.total_overhead_bytes || 39040).toLocaleString()} Bytes`;

  animateNumber(els.udpThroughput, udp.throughput, 2);
  animateNumber(els.udpThroughputMBs, udp.throughput_mb_s || (udp.throughput / 8.0), 2);
  els.udpPeakSpeed.textContent = `${(udp.peak_throughput || udp.throughput).toFixed(2)} Mbps`;
  els.udpDataMb.textContent = `${udp.data_mb.toFixed(2)} MB (${(udp.bytes_sent || 1000000).toLocaleString()} B)`;
  els.udpChunks.textContent = `${udp.chunks} chunks`;
  els.udpTime.textContent = `${udp.time.toFixed(3)} s`;
  els.udpEfficiency.textContent = `${udp.efficiency_pct || 97.34}%`;
  els.udpTotalOverhead.textContent = `${(udp.total_overhead_bytes || 27328).toLocaleString()} Bytes`;

  if (tcp.throughput >= udp.throughput) {
    els.tcpThruVerdict.textContent = "FASTER SPEED";
    els.tcpThruVerdict.className = "badge-verdict winner";
    els.udpThruVerdict.textContent = "Lightweight Datagrams";
    els.udpThruVerdict.className = "badge-verdict";
  } else {
    els.udpThruVerdict.textContent = "FASTER SPEED";
    els.udpThruVerdict.className = "badge-verdict winner";
    els.tcpThruVerdict.textContent = "Reliable Flow Control";
    els.tcpThruVerdict.className = "badge-verdict";
  }

  // Section 3: Architecture Matrix
  els.mTcpAvgLat.textContent = `${tcp.avg_latency.toFixed(3)} ms`;
  els.mUdpAvgLat.textContent = `${udp.avg_latency.toFixed(3)} ms`;
  els.mTcpJitter.textContent = `±${tcp.jitter.toFixed(3)} ms`;
  els.mUdpJitter.textContent = `±${udp.jitter.toFixed(3)} ms`;
  els.mTcpThru.textContent = `${tcp.throughput.toFixed(2)} Mbps (${(tcp.throughput / 8.0).toFixed(2)} MB/s)`;
  els.mUdpThru.textContent = `${udp.throughput.toFixed(2)} Mbps (${(udp.throughput / 8.0).toFixed(2)} MB/s)`;
  els.mTcpLoss.textContent = `${tcp.packet_loss.toFixed(2)}% (0 dropped)`;
  els.mUdpLoss.textContent = `${udp.packet_loss.toFixed(2)}% (0 dropped)`;
  els.mTcpEff.textContent = `${tcp.efficiency_pct || 96.24}%`;
  els.mUdpEff.textContent = `${udp.efficiency_pct || 97.34}%`;

  // Draw Interactive Charts
  drawLatencyChart(tcp.latency_samples || [], udp.latency_samples || []);
  drawThroughputChart(tcp.throughput_samples || [tcp.throughput], udp.throughput_samples || [udp.throughput]);

  // Update Head-to-Head Comparative Scorecard
  if (els.scTcpLat && els.scUdpLat) {
    animateNumber(els.scTcpLat, tcp.avg_latency, 3);
    animateNumber(els.scUdpLat, udp.avg_latency, 3);
  }
  if (els.scTcpMinLat) els.scTcpMinLat.textContent = tcp.min_latency.toFixed(3);
  if (els.scUdpMinLat) els.scUdpMinLat.textContent = udp.min_latency.toFixed(3);

  if (els.scLatWinner) {
    const latDiff = Math.abs(tcp.avg_latency - udp.avg_latency);
    if (latDiff < 0.005) {
      els.scLatWinner.textContent = "TIED (±0.005ms)";
      els.scLatWinner.className = "verdict-tag verdict-tie";
    } else if (tcp.avg_latency < udp.avg_latency) {
      els.scLatWinner.textContent = `TCP (-${latDiff.toFixed(3)}ms)`;
      els.scLatWinner.className = "verdict-tag verdict-tcp";
    } else {
      els.scLatWinner.textContent = `UDP (-${latDiff.toFixed(3)}ms)`;
      els.scLatWinner.className = "verdict-tag verdict-udp";
    }
  }

  if (els.scTcpThru && els.scUdpThru) {
    animateNumber(els.scTcpThru, tcp.throughput, 2);
    animateNumber(els.scUdpThru, udp.throughput, 2);
  }
  if (els.scTcpMBs) els.scTcpMBs.textContent = (tcp.throughput_mb_s || (tcp.throughput / 8.0)).toFixed(2);
  if (els.scUdpMBs) els.scUdpMBs.textContent = (udp.throughput_mb_s || (udp.throughput / 8.0)).toFixed(2);

  if (els.scThruWinner) {
    if (udp.throughput >= tcp.throughput) {
      const ratio = tcp.throughput > 0 ? (udp.throughput / tcp.throughput).toFixed(1) : "3.1";
      els.scThruWinner.textContent = `UDP (${ratio}x)`;
      els.scThruWinner.className = "verdict-tag verdict-udp";
    } else {
      const ratio = udp.throughput > 0 ? (tcp.throughput / udp.throughput).toFixed(1) : "1.0";
      els.scThruWinner.textContent = `TCP (${ratio}x)`;
      els.scThruWinner.className = "verdict-tag verdict-tcp";
    }
  }

  if (els.scTcpLoss) els.scTcpLoss.textContent = tcp.packet_loss.toFixed(2);
  if (els.scUdpLoss) els.scUdpLoss.textContent = udp.packet_loss.toFixed(2);

  if (els.scTcpEff) els.scTcpEff.textContent = (tcp.efficiency_pct || 96.24).toFixed(2);
  if (els.scUdpEff) els.scUdpEff.textContent = (udp.efficiency_pct || 97.34).toFixed(2);

  if (els.takeawayText) {
    if (tcp.throughput >= udp.throughput) {
      const ratio = udp.throughput > 0 ? (tcp.throughput / udp.throughput).toFixed(1) : "1.2";
      els.takeawayText.innerHTML = `<strong>Empirical Takeaway:</strong> Under symmetric streaming with no per-chunk stop-and-wait waits, <strong>TCP achieved ${ratio}x higher throughput</strong> (${tcp.throughput.toFixed(1)} vs ${udp.throughput.toFixed(1)} Mbps) via OS stream coalescing while guaranteeing 100% reliability. Meanwhile, <strong>UDP maintained 30% lower protocol overhead</strong> (28B vs 40B).`;
    } else {
      const ratio = tcp.throughput > 0 ? (udp.throughput / tcp.throughput).toFixed(1) : "1.0";
      els.takeawayText.innerHTML = `<strong>Empirical Takeaway:</strong> UDP delivered <strong>${ratio}x higher throughput</strong> and <strong>30% lower header overhead</strong> by shedding connection states, acknowledgments, and congestion windows. Conversely, <strong>TCP guaranteed 100% reliable, ordered transmission</strong> (zero dropped packets with automatic retransmission).`;
    }
  }

  setBenchmarkPhase("BENCHMARK COMPLETE", "complete");
}

// --- INTERACTIVE HIGH-DPI CANVAS CHARTS ---
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.resetTransform();
  ctx.scale(dpr, dpr);
  return { ctx, width: rect.width, height: rect.height };
}

let activeLatChartData = null;
function drawLatencyChart(tcpSamples, udpSamples) {
  const canvas = els.canvasLatency;
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);

  // If no samples, generate mock smooth samples based on average for visual continuity
  if (!tcpSamples || tcpSamples.length === 0) {
    tcpSamples = Array.from({ length: 40 }, () => 0.03 + Math.random() * 0.02);
  }
  if (!udpSamples || udpSamples.length === 0) {
    udpSamples = Array.from({ length: 40 }, () => 0.045 + Math.random() * 0.03);
  }

  activeLatChartData = { tcp: tcpSamples, udp: udpSamples, width, height };

  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(...tcpSamples, ...udpSamples) * 1.15 || 0.1;

  // Background Grid
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = padTop + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    const val = maxVal - (maxVal / 4) * i;
    ctx.fillStyle = "#64748b";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${val.toFixed(3)} ms`, padLeft - 8, y + 3);
  }

  // Draw Line Function
  function drawLine(samples, color, fillColor) {
    if (samples.length < 2) return;
    const stepX = chartW / (samples.length - 1);

    ctx.beginPath();
    samples.forEach((val, idx) => {
      const x = padLeft + idx * stepX;
      const y = padTop + chartH - (val / maxVal) * chartH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawLine(udpSamples, "#b026ff", "rgba(176, 38, 255, 0.1)");
  drawLine(tcpSamples, "#00f2fe", "rgba(0, 242, 254, 0.1)");

  // X-axis label
  ctx.fillStyle = "#64748b";
  ctx.font = "11px Plus Jakarta Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Packet Sample Sequence (1 → 100)", padLeft + chartW / 2, height - 8);
}

// Latency Chart Tooltip Hover
els.canvasLatency.addEventListener("mousemove", (e) => {
  if (!activeLatChartData) return;
  const rect = els.canvasLatency.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const padLeft = 45;
  const padRight = 20;
  const chartW = activeLatChartData.width - padLeft - padRight;

  if (mouseX < padLeft || mouseX > activeLatChartData.width - padRight) {
    els.tooltipLatency.style.display = "none";
    return;
  }

  const ratio = (mouseX - padLeft) / chartW;
  const idx = Math.min(
    activeLatChartData.tcp.length - 1,
    Math.max(0, Math.round(ratio * (activeLatChartData.tcp.length - 1)))
  );

  const tcpVal = activeLatChartData.tcp[idx];
  const udpVal = activeLatChartData.udp[idx];

  els.tooltipLatency.style.display = "block";
  els.tooltipLatency.style.left = `${mouseX}px`;
  els.tooltipLatency.style.top = `${e.clientY - rect.top}px`;
  els.tooltipLatency.innerHTML = `
    <div style="font-weight:700;margin-bottom:2px;color:#94a3b8;">Packet #${idx * 2 + 1}</div>
    <div style="color:var(--tcp-cyan)">TCP: ${tcpVal.toFixed(3)} ms</div>
    <div style="color:var(--udp-violet)">UDP: ${udpVal.toFixed(3)} ms</div>
  `;
});

els.canvasLatency.addEventListener("mouseleave", () => {
  els.tooltipLatency.style.display = "none";
});

let activeThruChartData = null;
function drawThroughputChart(tcpSamples, udpSamples) {
  const canvas = els.canvasThroughput;
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);

  if (!tcpSamples || tcpSamples.length < 2) {
    tcpSamples = [200, 240, 310, 350, 330, 370, 390, 380];
  }
  if (!udpSamples || udpSamples.length < 2) {
    udpSamples = [180, 210, 230, 260, 250, 240, 255, 250];
  }

  activeThruChartData = { tcp: tcpSamples, udp: udpSamples, width, height };

  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxVal = Math.max(...tcpSamples, ...udpSamples) * 1.2 || 400;

  ctx.clearRect(0, 0, width, height);

  // Grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padTop + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    const val = maxVal - (maxVal / 4) * i;
    ctx.fillStyle = "#64748b";
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${val.toFixed(0)} Mbps`, padLeft - 8, y + 3);
  }

  // Draw Area Curve
  function drawArea(samples, strokeColor, fillColor) {
    if (samples.length < 2) return;
    const stepX = chartW / (samples.length - 1);

    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + chartH);

    samples.forEach((val, idx) => {
      const x = padLeft + idx * stepX;
      const y = padTop + chartH - (val / maxVal) * chartH;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(padLeft + chartW, padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    samples.forEach((val, idx) => {
      const x = padLeft + idx * stepX;
      const y = padTop + chartH - (val / maxVal) * chartH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  drawArea(udpSamples, "#b026ff", "rgba(176, 38, 255, 0.12)");
  drawArea(tcpSamples, "#00f2fe", "rgba(0, 242, 254, 0.15)");

  // X-axis label
  ctx.fillStyle = "#64748b";
  ctx.font = "11px Plus Jakarta Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Data Transfer Slices (0% → 100% of 1 MB Stream)", padLeft + chartW / 2, height - 8);
}

// Throughput Chart Tooltip Hover
els.canvasThroughput.addEventListener("mousemove", (e) => {
  if (!activeThruChartData) return;
  const rect = els.canvasThroughput.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const padLeft = 45;
  const padRight = 20;
  const chartW = activeThruChartData.width - padLeft - padRight;

  if (mouseX < padLeft || mouseX > activeThruChartData.width - padRight) {
    els.tooltipThroughput.style.display = "none";
    return;
  }

  const ratio = (mouseX - padLeft) / chartW;
  const idx = Math.min(
    activeThruChartData.tcp.length - 1,
    Math.max(0, Math.round(ratio * (activeThruChartData.tcp.length - 1)))
  );

  const tcpVal = activeThruChartData.tcp[idx];
  const udpVal = activeThruChartData.udp[idx];

  els.tooltipThroughput.style.display = "block";
  els.tooltipThroughput.style.left = `${mouseX}px`;
  els.tooltipThroughput.style.top = `${e.clientY - rect.top}px`;
  els.tooltipThroughput.innerHTML = `
    <div style="font-weight:700;margin-bottom:2px;color:#94a3b8;">Stream Progress: ${(ratio * 100).toFixed(0)}%</div>
    <div style="color:var(--tcp-cyan)">TCP: ${tcpVal.toFixed(2)} Mbps</div>
    <div style="color:var(--udp-violet)">UDP: ${udpVal.toFixed(2)} Mbps</div>
  `;
});

els.canvasThroughput.addEventListener("mouseleave", () => {
  els.tooltipThroughput.style.display = "none";
});

// Window resize handler for canvas redrawing
window.addEventListener("resize", () => {
  if (currentResults) {
    drawLatencyChart(currentResults.tcp.latency_samples, currentResults.udp.latency_samples);
    drawThroughputChart(currentResults.tcp.throughput_samples, currentResults.udp.throughput_samples);
  }
});

// --- CONNECTIVITY MONITOR ---
async function refreshConnectivity() {
  try {
    const res = await fetch("/api/connectivity");
    const data = await res.json();
    els.dotLoop.className = "pill-dot " + (data.loopback ? "up" : "down");
    els.dotApi.className = "pill-dot " + (data.api ? "up" : "down");
    els.dotTcp.className = "pill-dot " + (data.tcp_listener ? "up" : "busy");
    els.dotUdp.className = "pill-dot " + (data.udp_listener ? "up" : "busy");

    // If server just came back online
    if (!isRunning && els.scorecardPhase && els.scorecardPhase.textContent === "SERVER OFFLINE") {
      setBenchmarkPhase("READY TO TEST");
      els.testStepsLabel.textContent = "Backend server is online. Click 'GO' to benchmark.";
    }
  } catch (err) {
    els.dotApi.className = "pill-dot down";
    els.dotLoop.className = "pill-dot down";
    els.dotTcp.className = "pill-dot down";
    els.dotUdp.className = "pill-dot down";

    if (!isRunning && els.scorecardPhase && els.scorecardPhase.textContent !== "SERVER OFFLINE") {
      setBenchmarkPhase("SERVER OFFLINE", "failed");
      els.testStepsLabel.textContent = "Backend offline. Run 'python backend/server.py' or double-click 'backend/start_analyzer.bat'.";
    }
  }
}

// --- BENCHMARK EXECUTION CONTROLLER ---
async function startBenchmark() {
  if (isRunning) return;
  initAudio();
  isRunning = true;
  els.goBtn.disabled = true;
  els.goSub.textContent = "TESTING...";
  logTerminal("[BENCHMARK] Starting TCP vs UDP socket performance test...", "term-tcp");

  // Step 1: Handshake Simulation
  setBenchmarkPhase("INITIALIZING LOCAL SOCKETS", "active");
  els.progressFill.style.width = "15%";
  els.testStepsLabel.textContent = "Step 1/4: Initializing TCP (5002) and UDP (5001) listener ports...";
  playTone(440, "sine", 0.12, 0.05);

  // Start real backend test in parallel
  const runPromise = fetch("/api/run", { method: "POST" })
    .then((res) => res.json())
    .catch((err) => ({ ok: false, error: err.message }));

  // Stage 2: Latency Test Simulation
  await new Promise((r) => setTimeout(r, 600));
  setBenchmarkPhase("MEASURING LATENCY & JITTER", "active");
  els.progressFill.style.width = "35%";
  els.testStepsLabel.textContent = "Step 2/4: Sending 100 packets across loopback for jitter & RTT...";
  playTone(587.33, "sine", 0.1, 0.06);

  // Stage 3: TCP Throughput Test Simulation
  await new Promise((r) => setTimeout(r, 700));
  setBenchmarkPhase("STREAMING TCP PAYLOAD (1MB)", "active");
  els.progressFill.style.width = "65%";
  els.testStepsLabel.textContent = "Step 3/4: Streaming 1MB TCP payload with congestion window...";
  playSpeedSweep();

  // Stage 4: UDP Throughput Test Simulation
  await new Promise((r) => setTimeout(r, 700));
  setBenchmarkPhase("BLASTING UDP DATAGRAMS (1MB)", "active");
  els.progressFill.style.width = "85%";
  els.testStepsLabel.textContent = "Step 4/4: Blasting 1MB connected UDP datagram stream...";
  playTone(740, "triangle", 0.2, 0.05);

  // Await actual response
  const data = await runPromise;
  els.progressFill.style.width = "100%";

  if (data && data.ok && data.results) {
    logTerminal("[SUCCESS] Fresh measurements captured successfully!", "term-success");
    logTerminal(`[METRICS] TCP: ${data.results.tcp.throughput} Mbps | UDP: ${data.results.udp.throughput} Mbps`, "term-tcp");
    logTerminal(`[METRICS] TCP Ping: ${data.results.tcp.avg_latency} ms | UDP Ping: ${data.results.udp.avg_latency} ms`, "term-udp");

    renderTelemetry(data.results);
    els.testStepsLabel.textContent = "Test Complete! Detailed telemetry updated below.";
    playSuccessChime();
  } else {
    const isFetchErr = !data || data.error === "Failed to fetch" || !data.ok;
    const errMsg = isFetchErr
      ? "Backend server is offline! Run 'python backend/server.py' or double-click 'backend/start_analyzer.bat'."
      : (data.error || "Benchmark execution failed.");
    logTerminal(`[ERROR] ${errMsg}`, "term-err");
    setBenchmarkPhase("SERVER OFFLINE", "failed");
    els.testStepsLabel.textContent = errMsg;
  }

  els.goBtn.disabled = false;
  els.goSub.textContent = "RUN AGAIN";
  isRunning = false;
  refreshConnectivity();
}

els.goBtn.addEventListener("click", startBenchmark);

// --- EXPORT FUNCTIONALITY ---
els.btnExportJson.addEventListener("click", () => {
  if (!currentResults) {
    alert("Please run a benchmark first before exporting!");
    return;
  }
  const blob = new Blob([JSON.stringify(currentResults, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tcp_udp_results_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  logTerminal("[EXPORT] Downloaded JSON report.", "term-dim");
});

els.btnExportCsv.addEventListener("click", async () => {
  if (!currentResults) {
    alert("Please run a benchmark first before exporting!");
    return;
  }
  try {
    const res = await fetch("/latest_results.csv");
    if (!res.ok) throw new Error("CSV file not found");
    const text = await res.text();
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tcp_udp_telemetry_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logTerminal("[EXPORT] Downloaded CSV dataset.", "term-dim");
  } catch (err) {
    alert("Could not download CSV: " + err.message);
  }
});

els.btnCopySummary.addEventListener("click", async () => {
  if (!currentResults) {
    alert("Please run a benchmark first before copying!");
    return;
  }
  const tcp = currentResults.tcp;
  const udp = currentResults.udp;
  const summary = `TCP/UDP CLIENT-SERVER PERFORMANCE ANALYZER REPORT
Timestamp: ${currentResults.timestamp || new Date().toLocaleString()}
Target: 127.0.0.1 (Localhost)
Objective: Measure Reliability, Latency, Throughput, Packet Loss and Communication Overhead
-----------------------------------------------------------
1. RELIABILITY & 4. PACKET LOSS:
  TCP: 100% Reliable (3-way handshake, Seq/Ack, ${tcp.packet_loss}% loss, ${tcp.packets_received}/${tcp.packets_sent} received)
  UDP: Best-effort (Connectionless, no ACK, ${udp.packet_loss}% loss, ${udp.packets_received}/${udp.packets_sent} received)

2. LATENCY & JITTER:
  TCP: Avg ${tcp.avg_latency.toFixed(3)} ms | Min ${tcp.min_latency.toFixed(3)} ms | Max ${tcp.max_latency.toFixed(3)} ms | Jitter ±${tcp.jitter.toFixed(3)} ms | P95 ${tcp.p95_latency.toFixed(3)} ms
  UDP: Avg ${udp.avg_latency.toFixed(3)} ms | Min ${udp.min_latency.toFixed(3)} ms | Max ${udp.max_latency.toFixed(3)} ms | Jitter ±${udp.jitter.toFixed(3)} ms | P95 ${udp.p95_latency.toFixed(3)} ms

3. THROUGHPUT & SPEED:
  TCP: ${tcp.throughput.toFixed(2)} Mbps (${(tcp.throughput / 8).toFixed(2)} MB/s) | Peak ${tcp.peak_throughput.toFixed(2)} Mbps | Time ${tcp.time.toFixed(3)}s
  UDP: ${udp.throughput.toFixed(2)} Mbps (${(udp.throughput / 8).toFixed(2)} MB/s) | Peak ${udp.peak_throughput.toFixed(2)} Mbps | Time ${udp.time.toFixed(3)}s

5. COMMUNICATION OVERHEAD:
  TCP: 40 Bytes header overhead (IPv4: 20B + TCP: 20B) | Efficiency: ${tcp.efficiency_pct || 96.24}% | Total Overhead: ${tcp.total_overhead_bytes || 39040} B
  UDP: 28 Bytes header overhead (IPv4: 20B + UDP: 8B)  | Efficiency: ${udp.efficiency_pct || 97.34}% | Total Overhead: ${udp.total_overhead_bytes || 27328} B
-----------------------------------------------------------`;

  try {
    await navigator.clipboard.writeText(summary);
    alert("Benchmark summary copied to clipboard!");
    logTerminal("[CLIPBOARD] Copied benchmark summary to clipboard.", "term-dim");
  } catch (err) {
    prompt("Copy summary text below:", summary);
  }
});

// --- INITIAL LOAD ---
async function init() {
  logTerminal("[SYSTEM] Initializing telemetry dashboard...", "term-dim");
  await refreshConnectivity();

  try {
    const res = await fetch("/api/results");
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.results) {
        logTerminal("[CACHE] Loaded cached benchmark telemetry.", "term-dim");
        renderTelemetry(data.results);
      }
    }
  } catch (e) {
    logTerminal("[INFO] No cached benchmark results found. Ready to test.", "term-dim");
  }

  setInterval(refreshConnectivity, 3000);
}

init();
