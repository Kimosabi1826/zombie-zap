const goalHits = 30;
const missPenaltySeconds = 1;
const leaderboardKey = "zombieZapTop10";
const lambdaSaveUrl = "https://fhrvao6guduce3aytbmv2xrxam0gxtrc.lambda-url.us-east-1.on.aws/";
const lambdaGetUrl = "https://iqgynpjqeoamfhuhcr4k63goxy0pfbfi.lambda-url.us-east-1.on.aws/";
const zombieFaces = ["🧟", "🤢", "💀", "👹"];
const burstTexts = ["+1", "Nice!", "Headshot!", "Zap!", "Boom!"];
const levelBackgrounds = {
  1: "bg_level1.png",
  2: "bg_level2.png",
  3: "bg_level3.png"
};
const walkerFaces = ["🧟", "🧟‍♂️", "🧟‍♀️", "💀"];

const hitsEl = document.getElementById("hits");
const timeEl = document.getElementById("time");
const levelEl = document.getElementById("level");
const comboEl = document.getElementById("combo");
const accuracyEl = document.getElementById("accuracy");
const bestTimeEl = document.getElementById("bestTime");
const messageEl = document.getElementById("message");
const gameArea = document.getElementById("gameArea");
const target = document.getElementById("target");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const soundBtn = document.getElementById("soundBtn");
const leaderboardList = document.getElementById("leaderboardList");
const levelFlash = document.getElementById("levelFlash");
const comboPop = document.getElementById("comboPop");
const missPop = document.getElementById("missPop");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const flashLayer = document.getElementById("flashLayer");
const burstLayer = document.getElementById("burstLayer");

const titleScreen = document.getElementById("titleScreen");
const titleStartBtn = document.getElementById("titleStartBtn");

const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultTime = document.getElementById("resultTime");
const resultAccuracy = document.getElementById("resultAccuracy");
const resultRank = document.getElementById("resultRank");
const nameEntryWrap = document.getElementById("nameEntryWrap");
const playerNameInput = document.getElementById("playerName");
const saveScoreBtn = document.getElementById("saveScoreBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const playAgainBtn = document.getElementById("playAgainBtn");

const particlesEl = document.getElementById("particles");

let hits = 0;
let misses = 0;
let totalClicks = 0;
let penaltyTime = 0;
let level = 1;
let combo = 0;
let gameRunning = false;
let startTime = null;
let timerInterval = null;
let pendingScore = null;

let soundEnabled = true;
let audioCtx = null;

let cloudScores = [];
let leaderboardLoading = false;

function injectPolishStyles() {
  if (document.getElementById("zombie-zap-polish-styles")) return;

  const style = document.createElement("style");
  style.id = "zombie-zap-polish-styles";
  style.textContent = `
    .game-area {
      transition: background-image 0.45s ease, box-shadow 0.25s ease, transform 0.18s ease;
    }

    .game-area.shake {
      animation: zzShake 0.28s ease;
    }

    .game-area.hit-pulse {
      animation: zzHitPulse 0.18s ease;
    }

    .game-area.miss-pulse::before {
      animation: zzMissGlow 0.28s ease;
    }

    @keyframes zzShake {
      0% { transform: translateX(0); }
      15% { transform: translateX(-8px); }
      30% { transform: translateX(8px); }
      45% { transform: translateX(-6px); }
      60% { transform: translateX(6px); }
      75% { transform: translateX(-3px); }
      100% { transform: translateX(0); }
    }

    @keyframes zzHitPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.008); }
      100% { transform: scale(1); }
    }

    @keyframes zzMissGlow {
      0% { opacity: 0; }
      30% { opacity: 1; }
      100% { opacity: 0; }
    }

    .ember-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    }

    .ember {
      position: absolute;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: radial-gradient(circle, #ffd27a 0%, #ff8b2d 55%, rgba(255, 90, 0, 0.0) 100%);
      box-shadow: 0 0 10px rgba(255, 120, 0, 0.45);
      opacity: 0.75;
      animation: emberRise linear infinite;
    }

    @keyframes emberRise {
      0% {
        transform: translateY(0) translateX(0) scale(0.8);
        opacity: 0;
      }
      15% {
        opacity: 0.85;
      }
      100% {
        transform: translateY(-260px) translateX(18px) scale(1.3);
        opacity: 0;
      }
    }

    .walker-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 2;
      overflow: hidden;
    }

    .walker {
      position: absolute;
      bottom: 12px;
      font-size: 2rem;
      opacity: 0.72;
      filter: drop-shadow(0 6px 8px rgba(0,0,0,0.35));
      animation: walkerBob 2s ease-in-out infinite;
      user-select: none;
      text-shadow:
        0 0 8px rgba(255,255,255,0.10),
        0 0 14px rgba(255, 110, 20, 0.18);
    }

    .walker.left {
      animation-name: walkerBob, walkerDriftLeft;
      animation-duration: 2.2s, 11s;
      animation-iteration-count: infinite, infinite;
      animation-timing-function: ease-in-out, linear;
    }

    .walker.right {
      animation-name: walkerBob, walkerDriftRight;
      animation-duration: 2.4s, 12s;
      animation-iteration-count: infinite, infinite;
      animation-timing-function: ease-in-out, linear;
    }

    @keyframes walkerBob {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-6px) scale(1.03); }
    }

    @keyframes walkerDriftLeft {
      0% { left: 2%; }
      50% { left: 8%; }
      100% { left: 2%; }
    }

    @keyframes walkerDriftRight {
      0% { right: 2%; }
      50% { right: 8%; }
      100% { right: 2%; }
    }

    .game-area.level-1 {
      box-shadow:
        inset 0 0 40px rgba(255, 80, 20, 0.05),
        0 20px 40px rgba(0,0,0,0.32);
    }

    .game-area.level-2 {
      box-shadow:
        inset 0 0 45px rgba(255, 90, 30, 0.08),
        0 20px 40px rgba(0,0,0,0.34);
    }

    .game-area.level-3 {
      box-shadow:
        inset 0 0 60px rgba(255, 60, 20, 0.12),
        0 20px 40px rgba(0,0,0,0.38);
    }

    .game-area.level-3 .walker {
      animation-duration: 1.9s, 8s;
      opacity: 0.82;
    }

    #target {
      z-index: 8 !important;
    }

    #target.teleport-in {
      animation: targetTeleport 0.16s ease;
    }

    @keyframes targetTeleport {
      0% {
        transform: scale(0.6) rotate(-14deg);
        opacity: 0.35;
      }
      75% {
        transform: scale(1.08) rotate(6deg);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    .score-burst {
      z-index: 9 !important;
    }

    #levelFlash,
    #comboPop,
    #missPop {
      z-index: 10 !important;
    }

    .leaderboard-loading {
      color: #d9e3dc;
      opacity: 0.82;
      font-style: italic;
      background: rgba(255,255,255,0.04);
    }
  `;
  document.head.appendChild(style);
}

function ensureApocalypseScene() {
  if (!gameArea) return;

  let emberLayer = gameArea.querySelector(".ember-layer");
  if (!emberLayer) {
    emberLayer = document.createElement("div");
    emberLayer.className = "ember-layer";
    gameArea.appendChild(emberLayer);
  }

  if (emberLayer.children.length === 0) {
    for (let i = 0; i < 26; i += 1) {
      const ember = document.createElement("span");
      ember.className = "ember";
      ember.style.left = `${Math.random() * 100}%`;
      ember.style.bottom = `${Math.random() * 28}px`;
      ember.style.animationDuration = `${4 + Math.random() * 5}s`;
      ember.style.animationDelay = `${Math.random() * 5}s`;
      ember.style.width = `${2 + Math.random() * 4}px`;
      ember.style.height = ember.style.width;
      emberLayer.appendChild(ember);
    }
  }

  let walkerLayer = gameArea.querySelector(".walker-layer");
  if (!walkerLayer) {
    walkerLayer = document.createElement("div");
    walkerLayer.className = "walker-layer";
    gameArea.appendChild(walkerLayer);
  }

  updateWalkerLayer();
}

function updateWalkerLayer() {
  const walkerLayer = gameArea.querySelector(".walker-layer");
  if (!walkerLayer) return;

  walkerLayer.innerHTML = "";

  let walkerCount = 2;
  if (level === 2) walkerCount = 4;
  if (level === 3) walkerCount = 6;

  for (let i = 0; i < walkerCount; i += 1) {
    const walker = document.createElement("span");
    walker.className = `walker ${i % 2 === 0 ? "left" : "right"}`;
    walker.textContent = randomFrom(walkerFaces);
    walker.style.bottom = `${10 + Math.random() * 80}px`;
    walker.style.fontSize = `${1.7 + Math.random() * 0.9}rem`;
    walker.style.opacity = `${0.45 + Math.random() * 0.35}`;

    if (walker.classList.contains("left")) {
      walker.style.left = `${2 + Math.random() * 8}%`;
    } else {
      walker.style.right = `${2 + Math.random() * 8}%`;
    }

    walkerLayer.appendChild(walker);
  }
}

function updateBackgroundByLevel() {
  if (!gameArea) return;

  const bg = levelBackgrounds[level] || levelBackgrounds[1];
  gameArea.style.backgroundImage = `url("${bg}")`;

  gameArea.classList.remove("level-1", "level-2", "level-3");
  gameArea.classList.add(`level-${level}`);

  updateWalkerLayer();
}

function triggerMissShake() {
  gameArea.classList.remove("shake");
  void gameArea.offsetWidth;
  gameArea.classList.add("shake");
}

function triggerHitPulse() {
  gameArea.classList.remove("hit-pulse");
  void gameArea.offsetWidth;
  gameArea.classList.add("hit-pulse");
}

function triggerMissPulse() {
  gameArea.classList.remove("miss-pulse");
  void gameArea.offsetWidth;
  gameArea.classList.add("miss-pulse");
}

function triggerTargetTeleport() {
  target.classList.remove("teleport-in");
  void target.offsetWidth;
  target.classList.add("teleport-in");
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function resumeAudioIfNeeded() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

function playTone({ frequency = 440, type = "sine", duration = 0.1, volume = 0.03, sweepTo = null }) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);

  if (sweepTo !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(sweepTo, 1), now + duration);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playLaserSound() {
  playTone({
    frequency: 1200,
    type: "sawtooth",
    duration: 0.05,
    volume: 0.02,
    sweepTo: 240
  });
}

function playMissSound() {
  playTone({
    frequency: 220,
    type: "square",
    duration: 0.08,
    volume: 0.015,
    sweepTo: 120
  });
}

function playLevelUpSound() {
  if (!soundEnabled) return;

  playTone({ frequency: 420, type: "triangle", duration: 0.08, volume: 0.025, sweepTo: 620 });
  setTimeout(() => {
    playTone({ frequency: 620, type: "triangle", duration: 0.1, volume: 0.03, sweepTo: 900 });
  }, 90);
}

function playWinSound() {
  if (!soundEnabled) return;

  const notes = [523, 659, 784, 1047];
  notes.forEach((note, index) => {
    setTimeout(() => {
      playTone({
        frequency: note,
        type: "triangle",
        duration: 0.18,
        volume: 0.035,
        sweepTo: note * 1.03
      });
    }, index * 120);
  });
}

function triggerFlash() {
  flashLayer.classList.remove("show");
  void flashLayer.offsetWidth;
  flashLayer.classList.add("show");
}

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function setRandomZombieFace() {
  target.textContent = randomFrom(zombieFaces);
}

function spawnScoreBurst(x, y) {
  const burst = document.createElement("div");
  burst.className = "score-burst";
  burst.textContent = randomFrom(burstTexts);
  burst.style.left = `${x}px`;
  burst.style.top = `${y}px`;

  burstLayer.appendChild(burst);

  setTimeout(() => {
    burst.remove();
  }, 900);
}

function createParticles() {
  particlesEl.innerHTML = "";

  for (let i = 0; i < 22; i += 1) {
    const p = document.createElement("div");
    p.className = "particle";

    const size = Math.random() * 4 + 3;
    const left = Math.random() * 100;
    const duration = Math.random() * 10 + 8;
    const delay = Math.random() * 8;

    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${left}%`;
    p.style.bottom = `${Math.random() * 20 - 10}%`;
    p.style.animationDuration = `${duration}s`;
    p.style.animationDelay = `-${delay}s`;

    particlesEl.appendChild(p);
  }
}

function getSavedScores() {
  return JSON.parse(localStorage.getItem(leaderboardKey) || "[]");
}

function setSavedScores(scores) {
  localStorage.setItem(leaderboardKey, JSON.stringify(scores));
}

function getMedal(index) {
  if (index === 0) return "🥇 ";
  if (index === 1) return "🥈 ";
  if (index === 2) return "🥉 ";
  return "";
}

function renderLeaderboard(scores = cloudScores) {
  leaderboardList.innerHTML = "";

  if (leaderboardLoading) {
    const li = document.createElement("li");
    li.textContent = "Loading apocalypse rankings...";
    li.className = "empty leaderboard-loading";
    leaderboardList.appendChild(li);
    return;
  }

  if (!scores || scores.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No zombie zappers yet.";
    li.className = "empty";
    leaderboardList.appendChild(li);
    bestTimeEl.textContent = "--";
    return;
  }

  scores.forEach((entry, index) => {
    const accuracyValue =
      typeof entry.accuracy === "number"
        ? entry.accuracy
        : Number(entry.accuracy);

    const accuracyText =
      Number.isFinite(accuracyValue)
        ? ` — ${accuracyValue.toFixed(1)}%`
        : "";

    const playerName = entry.playerName || entry.name || "Player";
    const timeValue = Number(entry.time);

    const li = document.createElement("li");
    li.textContent = `${getMedal(index)}#${index + 1} ${playerName} — ${timeValue.toFixed(2)}s${accuracyText}`;
    leaderboardList.appendChild(li);
  });

  bestTimeEl.textContent = `${Number(scores[0].time).toFixed(2)}s`;
}

async function fetchTopScoresFromAws() {
  leaderboardLoading = true;
  renderLeaderboard([]);

  try {
    const response = await fetch(lambdaGetUrl, {
      method: "GET"
    });

    const raw = await response.json();

    const parsed = Array.isArray(raw) ? raw : [];
    parsed.sort((a, b) => Number(a.time) - Number(b.time));

    cloudScores = parsed.slice(0, 10);
    return cloudScores;
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return cloudScores;
  } finally {
    leaderboardLoading = false;
    renderLeaderboard(cloudScores);
  }
}

function qualifiesForTop10(timeValue) {
  const scores = cloudScores.length > 0 ? cloudScores : getSavedScores();
  return scores.length < 10 || timeValue < Number(scores[scores.length - 1].time);
}

function getProjectedRank(timeValue) {
  const scores = cloudScores.length > 0 ? cloudScores : getSavedScores();

  const combined = [...scores, { playerName: "You", time: timeValue }]
    .sort((a, b) => Number(a.time) - Number(b.time))
    .slice(0, 10);

  const rank = combined.findIndex(
    (entry) => (entry.playerName === "You" || entry.name === "You") && Number(entry.time) === timeValue
  );

  return rank === -1 ? null : rank + 1;
}

function showFlash(element, text) {
  element.textContent = text;
  element.classList.remove("show");
  void element.offsetWidth;
  element.classList.add("show");
}

function updateCleanupProgress() {
  const percent = Math.round((hits / goalHits) * 100);
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
}

function getAccuracyValue() {
  if (totalClicks === 0) return 100;
  return (hits / totalClicks) * 100;
}

function updateAccuracy() {
  const accuracy = getAccuracyValue();
  accuracyEl.textContent = `${accuracy.toFixed(0)}%`;
  return accuracy;
}

function getDisplayTimeValue() {
  if (!startTime) return penaltyTime;
  return (performance.now() - startTime) / 1000 + penaltyTime;
}

function updateDisplayedClock() {
  timeEl.textContent = getDisplayTimeValue().toFixed(2);
}

function updateLevel() {
  let newLevel = 1;

  if (hits >= 20) {
    newLevel = 3;
  } else if (hits >= 10) {
    newLevel = 2;
  }

  if (newLevel !== level) {
    level = newLevel;
    levelEl.textContent = String(level);
    updateBackgroundByLevel();
    showFlash(levelFlash, `LEVEL ${level}!`);
    messageEl.textContent = `Uh oh... the zombies got faster. Level ${level}!`;
    playLevelUpSound();
    triggerFlash();
  } else {
    levelEl.textContent = String(level);
  }
}

function updateComboOnHit() {
  combo += 1;
  comboEl.textContent = String(combo);

  if (combo > 0 && combo % 5 === 0) {
    showFlash(comboPop, `COMBO x${combo}`);
  }
}

function breakComboOnMiss() {
  combo = 0;
  comboEl.textContent = "0";
}

function getTargetSize() {
  if (level === 1) return 98;
  if (level === 2) return 76;
  return 60;
}

function moveTarget() {
  const areaRect = gameArea.getBoundingClientRect();
  const size = getTargetSize();

  target.style.width = `${size}px`;
  target.style.height = `${size}px`;

  const topPadding = 52;
  const maxX = areaRect.width - size;
  const maxY = areaRect.height - size - topPadding;

  const randomX = Math.random() * Math.max(maxX, 0);
  const randomY = topPadding + Math.random() * Math.max(maxY, 0);

  target.style.left = `${randomX}px`;
  target.style.top = `${randomY}px`;

  setRandomZombieFace();
  triggerTargetTeleport();
}

function startTimer() {
  startTime = performance.now();

  timerInterval = setInterval(() => {
    updateDisplayedClock();
  }, 20);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  return Number(timeEl.textContent);
}

function hideTitleScreen() {
  titleScreen.classList.add("hidden");
}

function openModal() {
  resultModal.classList.remove("hidden");
}

function closeModal() {
  resultModal.classList.add("hidden");
  nameEntryWrap.classList.add("hidden");
  playerNameInput.value = "";
}

function resetGameState() {
  hits = 0;
  misses = 0;
  totalClicks = 0;
  penaltyTime = 0;
  level = 1;
  combo = 0;
  gameRunning = false;
  startTime = null;
  pendingScore = null;

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  hitsEl.textContent = "0";
  timeEl.textContent = "0.00";
  levelEl.textContent = "1";
  comboEl.textContent = "0";
  accuracyEl.textContent = "100%";
  progressFill.style.width = "0%";
  progressText.textContent = "0%";
  messageEl.textContent = "Press Start and prepare to roast some zombies.";
  target.hidden = true;
  burstLayer.innerHTML = "";
  gameArea.style.backgroundImage = `url("${levelBackgrounds[1]}")`;
  gameArea.classList.remove("level-1", "level-2", "level-3", "shake", "hit-pulse", "miss-pulse");
  gameArea.classList.add("level-1");

  closeModal();
}

function startGame() {
  resetGameState();
  hideTitleScreen();

  gameRunning = true;
  messageEl.textContent = "Zap the zombie heads before they take over!";
  target.hidden = false;

  updateBackgroundByLevel();
  triggerFlash();
  moveTarget();
  startTimer();
}

function finishGame() {
  gameRunning = false;
  target.hidden = true;

  const finalTime = stopTimer();
  const finalAccuracy = getAccuracyValue();
  const qualifies = qualifiesForTop10(finalTime);
  const rank = qualifies ? getProjectedRank(finalTime) : null;

  resultTitle.textContent = "🧟 Zombie Wave Cleared!";
  resultTime.textContent = `Your time: ${finalTime.toFixed(2)}s`;
  resultAccuracy.textContent = `Accuracy: ${finalAccuracy.toFixed(1)}%`;
  resultRank.textContent = rank ? `Projected Rank: #${rank}` : "Rank: Outside Top 10";
  messageEl.textContent = `You zapped all 30 zombies in ${finalTime.toFixed(2)}s. Not bad, hero.`;

  pendingScore = {
    time: finalTime,
    accuracy: finalAccuracy,
    qualifies,
    rank
  };

  if (qualifies) {
    nameEntryWrap.classList.remove("hidden");
    setTimeout(() => playerNameInput.focus(), 50);
  } else {
    nameEntryWrap.classList.add("hidden");
  }

  playWinSound();
  triggerFlash();
  openModal();
  renderLeaderboard();
}

async function saveScoreToAws(name, time, accuracy) {
  try {
    const response = await fetch(lambdaSaveUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        playerName: name,
        time: time,
        accuracy: accuracy
      })
    });

    const result = await response.json();
    console.log("AWS save result:", result);
  } catch (error) {
    console.error("AWS save failed:", error);
  }
}

async function savePendingScore() {
  if (!pendingScore || !pendingScore.qualifies) return;

  const name = playerNameInput.value.trim() || "Player";
  const saved = getSavedScores();

  saved.push({
    name,
    time: pendingScore.time,
    accuracy: pendingScore.accuracy
  });

  saved.sort((a, b) => a.time - b.time);
  const trimmed = saved.slice(0, 10);
  setSavedScores(trimmed);

  await saveScoreToAws(name, pendingScore.time, pendingScore.accuracy);
  await fetchTopScoresFromAws();

  resultRank.textContent = "Score saved!";
  nameEntryWrap.classList.add("hidden");
  pendingScore = null;
}

target.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!gameRunning) return;

  resumeAudioIfNeeded();

  totalClicks += 1;
  hits += 1;

  hitsEl.textContent = String(hits);

  updateComboOnHit();
  updateLevel();
  updateCleanupProgress();
  updateAccuracy();
  playLaserSound();
  triggerHitPulse();

  const areaRect = gameArea.getBoundingClientRect();
  const burstX = event.clientX - areaRect.left;
  const burstY = event.clientY - areaRect.top;
  spawnScoreBurst(burstX, burstY);

  moveTarget();

  if (hits >= goalHits) {
    finishGame();
    return;
  }

  if (hits < 10) {
    messageEl.textContent = "The first wave is shambling in...";
  } else if (hits < 20) {
    messageEl.textContent = "Okay, now they’re getting annoying.";
  } else {
    messageEl.textContent = "Final wave! No panic-clicking!";
  }
});

gameArea.addEventListener("click", (event) => {
  if (!gameRunning) return;
  if (event.target === target) return;

  resumeAudioIfNeeded();

  totalClicks += 1;
  misses += 1;
  penaltyTime += missPenaltySeconds;
  breakComboOnMiss();
  updateAccuracy();
  updateDisplayedClock();
  triggerMissShake();
  triggerMissPulse();
  showFlash(missPop, "MISS! +1s");
  playMissSound();

  if (misses < 4) {
    messageEl.textContent = "You missed. +1 second. The zombies approve.";
  } else if (misses < 8) {
    messageEl.textContent = "Too wild. +1 second. Aim first.";
  } else {
    messageEl.textContent = "Spray-and-pray is expensive. +1 second.";
  }
});

titleStartBtn.addEventListener("click", () => {
  resumeAudioIfNeeded();
  startGame();
});

startBtn.addEventListener("click", () => {
  resumeAudioIfNeeded();
  startGame();
});

resetBtn.addEventListener("click", () => {
  resetGameState();
});

soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? "Sound: On" : "Sound: Off";

  if (soundEnabled) {
    resumeAudioIfNeeded();
  }
});

saveScoreBtn.addEventListener("click", () => {
  savePendingScore();
});

closeModalBtn.addEventListener("click", () => {
  closeModal();
});

playAgainBtn.addEventListener("click", () => {
  closeModal();
  startGame();
});

playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    savePendingScore();
  }
});

window.addEventListener("resize", () => {
  if (gameRunning && !target.hidden) {
    moveTarget();
  }
});

injectPolishStyles();
ensureApocalypseScene();
updateBackgroundByLevel();
createParticles();
fetchTopScoresFromAws();