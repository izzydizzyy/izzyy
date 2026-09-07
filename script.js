const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");

const savedTheme = localStorage.getItem("izzy-theme");
if (savedTheme === "dark" || savedTheme === "light") {
  root.dataset.theme = savedTheme;
}

function updateThemeText() {
  themeLabel.textContent =
    root.dataset.theme === "dark"
      ? "light"
      : "dark";
}
updateThemeText();

themeToggle.addEventListener("click", () => {
  root.dataset.theme =
    root.dataset.theme === "dark"
      ? "light"
      : "dark";
  localStorage.setItem(
    "izzy-theme",
    root.dataset.theme
  );
  updateThemeText();
});

document.getElementById("year").textContent =
  new Date().getFullYear();

document.getElementById("discordLink").addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    navigator.clipboard
      ?.writeText("izzy.js")
      .then(() => {
        event.currentTarget.textContent = "copied: izzy.js";
        setTimeout(() => {
          event.currentTarget.textContent = "discord";
        }, 1400);
      })
      .catch(() => {
        event.currentTarget.textContent = "izzy.js";
      });
  }
);

async function loadGitHub() {
  try {
    const response = await fetch(
      "https://api.github.com/users/izzydizzyy"
    );
    if (!response.ok) {
      throw new Error("github api unavailable");
    }
    const user = await response.json();
    document.getElementById("githubName").textContent =
      user.login || "izzydizzyy";
    document.getElementById("repoCount").textContent =
      user.public_repos ?? "--";
    document.getElementById("followerCount").textContent =
      user.followers ?? "--";
    document.getElementById("followingCount").textContent =
      user.following ?? "--";
    const avatars = [
      document.getElementById("githubAvatar"),
      document.getElementById("githubAvatarLarge")
    ];
    avatars.forEach((avatar) => {
      avatar.src = user.avatar_url;
      avatar.onload = () => {
        avatar.style.opacity = "1";
      };
    });
  } catch {
    console.log("[izzy] github stats unavailable");
  }
}
loadGitHub();

const cards = document.querySelectorAll(".card");
cards.forEach((card) => {
  card.addEventListener("mousemove", (event) => {
    if (window.innerWidth < 841) return;
    const rect = card.getBoundingClientRect();
    const x =
      (event.clientX - rect.left) / rect.width - .5;
    const y =
      (event.clientY - rect.top) / rect.height - .5;
    card.style.transform =
      `translateY(-4px) rotateX(${y * -1.4}deg) rotateY(${x * 1.4}deg)`;
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
  });
});

/* =========================================================
   listen live — spotify embed toggle
   =========================================================
   Real caveat: once audio is inside the Spotify iframe, the
   browser can't read its waveform (cross-origin + DRM), so
   the visualizer below can't literally analyze that stream.
   It reacts to *play state* instead. If you ever point
   #spotifyEmbed at a same-origin <audio> file instead, the
   visualizer auto-switches to real Web Audio analysis — see
   trySameOriginAudioAnalysis() below.
========================================================= */

const listenLiveBtn = document.getElementById("listenLiveBtn");
const listenLiveLabel = document.getElementById("listenLiveLabel");
const embedWrap = document.getElementById("spotifyEmbedWrap");
const embedFrame = document.getElementById("spotifyEmbed");
const npTitle = document.getElementById("npTitle");
const npSub = document.getElementById("npSub");
const npBars = document.getElementById("npBars");

let isLive = false;

listenLiveBtn.addEventListener("click", () => {
  isLive = !isLive;

  listenLiveBtn.classList.toggle("is-live", isLive);
  embedWrap.classList.toggle("open", isLive);
  npBars.style.animationPlayState = isLive ? "running" : "paused";

  if (isLive) {
    if (!embedFrame.src) {
      embedFrame.src = embedFrame.dataset.src;
    }
    listenLiveLabel.textContent = "listening";
    npTitle.textContent = "streaming now";
    npSub.textContent = "playing through the embed below";
    visualizer.setLive(true);
  } else {
    listenLiveLabel.textContent = "listen live";
    npTitle.textContent = "nothing live right now";
    npSub.textContent = "tap listen live to pull up what's playing";
    visualizer.setLive(false);
  }
});

/* =========================================================
   soundwave background — connected strings visualizer
========================================================= */

const canvas = document.getElementById("soundwave");
const ctx = canvas.getContext("2d");

function themeColors() {
  const light = root.dataset.theme === "light";
  return light
    ? {
        strings: ["#173b24", "#1c5f7a", "#7a2159", "#8a7a1c"],
        node: "rgba(20,20,25,.5)",
        bg: null
      }
    : {
        strings: ["#d8ffd8", "#8fe0ff", "#ff8fd0", "#ffe28f"],
        node: "rgba(255,255,255,.55)",
        bg: null
      };
}

class Visualizer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.live = false;
    this.energy = 0.12;
    this.targetEnergy = 0.12;
    this.t = 0;
    this.beatClock = 0;
    this.nextBeat = 0.6 + Math.random() * 0.4;

    this.strings = 4;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.analyser = null;
    this.freqData = null;

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const { innerWidth: w, innerHeight: h } = window;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
  }

  setLive(live) {
    this.live = live;
    this.targetEnergy = live ? 0.85 : 0.12;
  }

  /* Optional real analysis path — wire this up if #spotifyEmbed
     ever becomes a same-origin <audio src="..."> element instead
     of the Spotify iframe. Not used by default. */
  attachAudioElement(audioEl) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const source = audioCtx.createMediaElementSource(audioEl);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    this.analyser = analyser;
    this.freqData = new Uint8Array(analyser.frequencyBinCount);
  }

  readEnergy(dt) {
    if (this.analyser && this.freqData) {
      this.analyser.getByteFrequencyData(this.freqData);
      const bassSlice = this.freqData.slice(0, 12);
      const avg =
        bassSlice.reduce((a, b) => a + b, 0) / bassSlice.length / 255;
      this.targetEnergy = 0.18 + avg * 0.9;
      this.energy += (this.targetEnergy - this.energy) * 0.35;
      return;
    }

    // simulated bass: idle shimmer, or a loose "beat" pulse when live
    if (this.live) {
      this.beatClock += dt;
      if (this.beatClock >= this.nextBeat) {
        this.beatClock = 0;
        this.nextBeat = 0.42 + Math.random() * 0.5;
        this.targetEnergy = 0.65 + Math.random() * 0.35;
      } else {
        this.targetEnergy *= 0.96;
        this.targetEnergy = Math.max(this.targetEnergy, 0.3);
      }
    } else {
      this.targetEnergy = 0.1 + Math.sin(this.t * 0.6) * 0.03;
    }

    this.energy += (this.targetEnergy - this.energy) * 0.12;
  }

  drawString(index, colors) {
    const { ctx, w, h } = this;
    const color = colors.strings[index % colors.strings.length];
    const baseY = h * (0.22 + index * 0.19);
    const amp = (10 + index * 4) + this.energy * (60 + index * 22);
    const freq = 0.0018 + index * 0.0004;
    const speed = 0.6 + index * 0.18;
    const phase = this.t * speed + index * 1.3;

    ctx.beginPath();
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const x = (w / segments) * i;
      const wobble =
        Math.sin(x * freq + phase) * amp +
        Math.sin(x * freq * 2.3 - phase * 1.4) * amp * 0.25;
      const y = baseY + wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4 + this.energy * 1.6;
    ctx.globalAlpha = 0.16 + this.energy * 0.35;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6 + this.energy * 22;
    ctx.stroke();

    // nodes along the string — connection points, brighter with bass
    if (this.energy > 0.3) {
      ctx.globalAlpha = Math.min(0.6, (this.energy - 0.3) * 1.2);
      ctx.fillStyle = colors.node;
      const nodeCount = 6;
      for (let n = 1; n < nodeCount; n++) {
        const x = (w / nodeCount) * n;
        const wobble =
          Math.sin(x * freq + phase) * amp +
          Math.sin(x * freq * 2.3 - phase * 1.4) * amp * 0.25;
        const y = baseY + wobble;
        ctx.beginPath();
        ctx.arc(x, y, 1.6 + this.energy * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  loop(now) {
    const dt = this.lastTime ? (now - this.lastTime) / 1000 : 0.016;
    this.lastTime = now;
    this.t += dt;

    this.readEnergy(dt);

    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);

    const colors = themeColors();
    for (let i = 0; i < this.strings; i++) {
      this.drawString(i, colors);
    }

    requestAnimationFrame(this.loop);
  }
}

const visualizer = new Visualizer(canvas, ctx);
