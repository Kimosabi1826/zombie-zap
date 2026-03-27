const goalHits = 30;
const leaderboardKey = "zombieZapTop10";
const lambdaSaveUrl = "https://kkdh7ntgy24mkphgy4wsutfjou0kzndo.lambda-url.us-east-2.on.aws/";
const zombieFaces = ["🧟", "🤢", "💀", "👹"];
const burstTexts = ["+1", "Nice!", "Headshot!", "Zap!", "Boom!"];

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
let level = 1;
let combo = 0;
let gameRunning = false;
let startTime = null;
let timerInterval = null;
let pendingScore = null;

let soundEnabled = true;
let audioCtx = null;

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

function renderLeaderboard() {
  const saved = getSavedScores();
  leaderboardList.innerHTML = "";

  if (saved.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No zombie zappers yet.";
    li.className = "empty";
    leaderboardList.appendChild(li);
    bestTimeEl.textContent = "--";
    return;
  }

  saved.forEach((entry, index) => {
    const accuracyText =
      typeof entry.accuracy === "number" ? ` — ${entry.accuracy.toFixed(1)}%` : "";

    const li = document.createElement("li");
    li.textContent = `#${index + 1} ${entry.name} — ${entry.time.toFixed(2)}s${accuracyText}`;
    leaderboardList.appendChild(li);
  });

  bestTimeEl.textContent = `${saved[0].time.toFixed(2)}s`;
}

function qualifiesForTop10(timeValue) {
  const saved = getSavedScores();
  return saved.length < 10 || timeValue < saved[saved.length - 1].time;
}

function getProjectedRank(timeValue) {
  const saved = getSavedScores();
  const combined = [...saved, { name: "You", time: timeValue }]
    .sort((a, b) => a.time - b.time)
    .slice(0, 10);

  const rank = combined.findIndex((entry) => entry.name === "You" && entry.time === timeValue);
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
  if (level === 1) return 88;
  if (level === 2) return 68;
  return 52;
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
}

function startTimer() {
  startTime = performance.now();

  timerInterval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    timeEl.textContent = elapsed.toFixed(2);
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

  closeModal();
}

function startGame() {
  resetGameState();
  hideTitleScreen();

  gameRunning = true;
  messageEl.textContent = "Zap the zombie heads before they take over!";
  target.hidden = false;

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
  renderLeaderboard();

  await saveScoreToAws(name, pendingScore.time, pendingScore.accuracy);

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
  breakComboOnMiss();
  updateAccuracy();
  showFlash(missPop, "MISS!");
  playMissSound();

  if (misses < 4) {
    messageEl.textContent = "You missed. The zombies are laughing.";
  } else if (misses < 8) {
    messageEl.textContent = "Easy there, cowboy. Aim first.";
  } else {
    messageEl.textContent = "Spray-and-pray is not the move.";
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

createParticles();
renderLeaderboard();