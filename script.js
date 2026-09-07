const DISCORD_USER_ID = "1313630076809510975";
const GITHUB_USER = "izzydizzyy";
const LANYARD_URL = `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`;

const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");

/* theme */
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

  localStorage.setItem("izzy-theme", root.dataset.theme);
  updateThemeText();
});

document.getElementById("year").textContent =
  new Date().getFullYear();

/* discord link */
document.getElementById("discordLink").addEventListener("click", async (event) => {
  event.preventDefault();

  const username =
    document.getElementById("discordUsername").textContent.replace(/^@/, "") ||
    "izzy.js";

  try {
    await navigator.clipboard.writeText(username);
    event.currentTarget.textContent = `copied: ${username}`;
  } catch {
    event.currentTarget.textContent = username;
  }

  setTimeout(() => {
    event.currentTarget.textContent = "discord";
  }, 1400);
});

/* lanyard */
const statusColors = {
  online: "#23a55a",
  idle: "#f0b232",
  dnd: "#f23f43",
  offline: "#80848e"
};

function getDiscordAvatar(user) {
  if (!user?.id || !user?.avatar) return "";

  const ext = user.avatar.startsWith("a_") ? "gif" : "webp";

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
}

function getDecoration(user) {
  const asset = user?.avatar_decoration_data?.asset;

  if (!asset) return "";

  return `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=240`;
}

function getCustomStatus(activities = []) {
  const custom = activities.find((activity) => activity.type === 4);

  if (!custom) return "";

  const emoji = custom.emoji?.name
    ? `${custom.emoji.name} `
    : "";

  return `${emoji}${custom.state || ""}`.trim();
}

let spotifyTimer = null;
let spotifyTimestamps = null;

function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";

  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function updateSpotifyProgress() {
  if (!spotifyTimestamps) return;

  const start = Number(spotifyTimestamps.start);
  const end = Number(spotifyTimestamps.end);

  if (!start || !end) return;

  const duration = Math.max(0, end - start);
  const elapsed = Math.min(
    Math.max(0, Date.now() - start),
    duration
  );

  const percent =
    duration > 0
      ? (elapsed / duration) * 100
      : 0;

  document.getElementById("spotifyProgress").style.width =
    `${percent}%`;

  document.getElementById("spotifyElapsed").textContent =
    formatTime(elapsed);

  document.getElementById("spotifyDuration").textContent =
    formatTime(duration);
}

function renderSpotify(spotify) {
  const liveLabel = document.getElementById("spotifyLiveLabel");
  const subtitle = document.getElementById("spotifySubtitle");
  const art = document.getElementById("spotifyAlbumArt");
  const album = document.getElementById("spotifyAlbum");
  const song = document.getElementById("spotifySong");
  const artist = document.getElementById("spotifyArtist");
  const progressWrap = document.getElementById("spotifyProgressWrap");
  const open = document.getElementById("spotifyOpen");

  clearInterval(spotifyTimer);
  spotifyTimer = null;
  spotifyTimestamps = null;

  if (!spotify) {
    liveLabel.classList.remove("is-live");
    liveLabel.innerHTML = "<i></i> not playing";

    subtitle.textContent =
      "when spotify is active on discord, it shows here automatically.";

    album.textContent = "spotify";
    song.textContent = "nothing playing rn";
    artist.textContent = "check back later.";

    art.removeAttribute("src");
    art.style.opacity = "0";

    progressWrap.hidden = true;
    open.hidden = true;

    visualizer.setLive(false);
    return;
  }

  liveLabel.classList.add("is-live");
  liveLabel.innerHTML = "<i></i> listening now";

  subtitle.textContent =
    "live from my discord spotify presence.";

  album.textContent =
    spotify.album || "spotify";

  song.textContent =
    spotify.song || "unknown track";

  artist.textContent =
    spotify.artist || "unknown artist";

  if (spotify.album_art_url) {
    art.src = spotify.album_art_url;

    art.onload = () => {
      art.style.opacity = "1";
    };
  }

  if (spotify.track_id) {
    open.href =
      `https://open.spotify.com/track/${spotify.track_id}`;

    open.hidden = false;
  } else {
    open.hidden = true;
  }

  if (spotify.timestamps?.start && spotify.timestamps?.end) {
    spotifyTimestamps = spotify.timestamps;
    progressWrap.hidden = false;

    updateSpotifyProgress();

    spotifyTimer =
      setInterval(updateSpotifyProgress, 1000);
  } else {
    progressWrap.hidden = true;
  }

  visualizer.setLive(true);
}

function renderDiscord(data) {
  const user = data.discord_user;

  const avatar = document.getElementById("discordAvatar");
  const decor = document.getElementById("discordDecor");
  const fallback = document.getElementById("avatarFallback");

  const displayName = document.getElementById("discordDisplayName");
  const username = document.getElementById("discordUsername");
  const customStatus = document.getElementById("discordCustomStatus");

  const statusText = document.getElementById("discordStatusText");
  const statusDot = document.getElementById("discordStatusDot");
  const presenceDot = document.getElementById("discordPresenceDot");

  const display =
    user?.global_name ||
    user?.display_name ||
    user?.username ||
    "izzy";

  displayName.textContent = display;

  if (user?.username) {
    username.textContent = `@${user.username}`;
    fallback.textContent =
      user.username.slice(0, 1).toLowerCase();
  }

  const avatarUrl = getDiscordAvatar(user);

  if (avatarUrl) {
    avatar.src = avatarUrl;

    avatar.onload = () => {
      avatar.style.opacity = "1";
    };
  }

  const decorUrl = getDecoration(user);

  if (decorUrl) {
    decor.src = decorUrl;

    decor.onload = () => {
      decor.style.opacity = "1";
    };
  } else {
    decor.removeAttribute("src");
    decor.style.opacity = "0";
  }

  const status =
    data.discord_status || "offline";

  const color =
    statusColors[status] ||
    statusColors.offline;

  statusDot.style.background = color;
  presenceDot.style.background = color;

  statusText.textContent = status;

  const custom =
    getCustomStatus(data.activities);

  customStatus.textContent =
    custom ||
    (status === "offline"
      ? "offline rn"
      : "student developer · probably in vscode");

  renderSpotify(
    data.listening_to_spotify
      ? data.spotify
      : null
  );
}

async function loadLanyard() {
  try {
    const response =
      await fetch(LANYARD_URL, {
        cache: "no-store"
      });

    if (!response.ok) {
      throw new Error("lanyard request failed");
    }

    const payload =
      await response.json();

    if (!payload.success || !payload.data) {
      throw new Error("invalid lanyard payload");
    }

    renderDiscord(payload.data);
  } catch (error) {
    console.log("[izzy] lanyard unavailable");

    document.getElementById("discordStatusText").textContent =
      "lanyard unavailable";

    renderSpotify(null);
  }
}

loadLanyard();

/* refresh live presence every 30s */
setInterval(loadLanyard, 30000);

/* github */
async function loadGitHub() {
  try {
    const response =
      await fetch(
        `https://api.github.com/users/${GITHUB_USER}`,
        { cache: "no-store" }
      );

    if (!response.ok) {
      throw new Error("github api unavailable");
    }

    const user =
      await response.json();

    document.getElementById("githubName").textContent =
      user.login || GITHUB_USER;

    document.getElementById("repoCount").textContent =
      user.public_repos ?? "--";

    document.getElementById("followerCount").textContent =
      user.followers ?? "--";

    document.getElementById("followingCount").textContent =
      user.following ?? "--";

    const avatar =
      document.getElementById("githubAvatarLarge");

    avatar.src =
      user.avatar_url;

    avatar.onload = () => {
      avatar.style.opacity = "1";
    };
  } catch {
    console.log("[izzy] github stats unavailable");
  }
}

loadGitHub();

/* card movement */
const cards =
  document.querySelectorAll(".card");

cards.forEach((card) => {
  card.addEventListener("mousemove", (event) => {
    if (window.innerWidth < 841) return;

    const rect =
      card.getBoundingClientRect();

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

/* background visualizer */
const canvas =
  document.getElementById("soundwave");

const ctx =
  canvas.getContext("2d");

function themeColors() {
  const light =
    root.dataset.theme === "light";

  return light
    ? {
        strings: [
          "#173b24",
          "#1c5f7a",
          "#7a2159",
          "#8a7a1c"
        ],
        node: "rgba(20,20,25,.5)"
      }
    : {
        strings: [
          "#d8ffd8",
          "#8fe0ff",
          "#ff8fd0",
          "#ffe28f"
        ],
        node: "rgba(255,255,255,.55)"
      };
}

class Visualizer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;

    this.live = false;
    this.energy = .12;
    this.targetEnergy = .12;

    this.t = 0;
    this.beatClock = 0;
    this.nextBeat =
      .6 + Math.random() * .4;

    this.strings = 4;
    this.dpr =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );

    this.resize();

    window.addEventListener(
      "resize",
      () => this.resize()
    );

    this.loop =
      this.loop.bind(this);

    requestAnimationFrame(this.loop);
  }

  resize() {
    const w =
      window.innerWidth;

    const h =
      window.innerHeight;

    this.canvas.width =
      w * this.dpr;

    this.canvas.height =
      h * this.dpr;

    this.canvas.style.width =
      `${w}px`;

    this.canvas.style.height =
      `${h}px`;

    this.ctx.setTransform(
      this.dpr,
      0,
      0,
      this.dpr,
      0,
      0
    );

    this.w = w;
    this.h = h;
  }

  setLive(live) {
    this.live = live;
  }

  readEnergy(dt) {
    if (this.live) {
      this.beatClock += dt;

      if (this.beatClock >= this.nextBeat) {
        this.beatClock = 0;

        this.nextBeat =
          .42 + Math.random() * .5;

        this.targetEnergy =
          .65 + Math.random() * .35;
      } else {
        this.targetEnergy =
          Math.max(
            this.targetEnergy * .96,
            .3
          );
      }
    } else {
      this.targetEnergy =
        .1 + Math.sin(this.t * .6) * .03;
    }

    this.energy +=
      (this.targetEnergy - this.energy) * .12;
  }

  drawString(index, colors) {
    const { ctx, w, h } = this;

    const color =
      colors.strings[
        index % colors.strings.length
      ];

    const baseY =
      h * (.22 + index * .19);

    const amp =
      (10 + index * 4) +
      this.energy * (60 + index * 22);

    const freq =
      .0018 + index * .0004;

    const speed =
      .6 + index * .18;

    const phase =
      this.t * speed + index * 1.3;

    ctx.beginPath();

    const segments = 64;

    for (
      let i = 0;
      i <= segments;
      i++
    ) {
      const x =
        (w / segments) * i;

      const wobble =
        Math.sin(x * freq + phase) * amp +
        Math.sin(
          x * freq * 2.3 - phase * 1.4
        ) * amp * .25;

      const y =
        baseY + wobble;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = color;
    ctx.lineWidth =
      1.4 + this.energy * 1.6;

    ctx.globalAlpha =
      .16 + this.energy * .35;

    ctx.shadowColor = color;
    ctx.shadowBlur =
      6 + this.energy * 22;

    ctx.stroke();

    if (this.energy > .3) {
      ctx.globalAlpha =
        Math.min(
          .6,
          (this.energy - .3) * 1.2
        );

      ctx.fillStyle =
        colors.node;

      const nodeCount = 6;

      for (
        let n = 1;
        n < nodeCount;
        n++
      ) {
        const x =
          (w / nodeCount) * n;

        const wobble =
          Math.sin(x * freq + phase) * amp +
          Math.sin(
            x * freq * 2.3 - phase * 1.4
          ) * amp * .25;

        const y =
          baseY + wobble;

        ctx.beginPath();

        ctx.arc(
          x,
          y,
          1.6 + this.energy * 2.2,
          0,
          Math.PI * 2
        );

        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  loop(now) {
    const dt =
      this.lastTime
        ? (now - this.lastTime) / 1000
        : .016;

    this.lastTime = now;
    this.t += dt;

    this.readEnergy(dt);

    this.ctx.clearRect(
      0,
      0,
      this.w,
      this.h
    );

    const colors =
      themeColors();

    for (
      let i = 0;
      i < this.strings;
      i++
    ) {
      this.drawString(i, colors);
    }

    requestAnimationFrame(this.loop);
  }
}

const visualizer =
  new Visualizer(canvas, ctx);
