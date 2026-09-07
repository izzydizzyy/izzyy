const DISCORD_USER_ID = "1313630076809510975";
const GITHUB_USER = "izzydizzyy";
const LANYARD_URL = `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`;

const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");

/* ---------------------------------------------------------
   theme
--------------------------------------------------------- */

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

/* ---------------------------------------------------------
   discord
--------------------------------------------------------- */

document.getElementById("discordLink").addEventListener(
  "click",
  async (event) => {
    event.preventDefault();

    const username =
      document
        .getElementById("discordUsername")
        .textContent
        .replace(/^@/, "") || "izzy.js";

    try {
      await navigator.clipboard.writeText(username);
      event.currentTarget.textContent =
        `copied: ${username}`;
    } catch {
      event.currentTarget.textContent = username;
    }

    setTimeout(() => {
      event.currentTarget.textContent = "discord";
    }, 1400);
  }
);

const statusColors = {
  online: "#23a55a",
  idle: "#f0b232",
  dnd: "#f23f43",
  offline: "#80848e"
};

function getDiscordAvatar(user) {
  if (!user?.id || !user?.avatar) return "";

  const ext =
    user.avatar.startsWith("a_")
      ? "gif"
      : "webp";

  return (
    `https://cdn.discordapp.com/avatars/` +
    `${user.id}/${user.avatar}.${ext}?size=256`
  );
}

function getDecoration(user) {
  const asset =
    user?.avatar_decoration_data?.asset;

  if (!asset) return "";

  return (
    "https://cdn.discordapp.com/" +
    `avatar-decoration-presets/${asset}.png?size=240`
  );
}

function getCustomStatus(activities = []) {
  const custom =
    activities.find(
      (activity) => activity.type === 4
    );

  if (!custom) return "";

  const emoji =
    custom.emoji?.name
      ? `${custom.emoji.name} `
      : "";

  return `${emoji}${custom.state || ""}`.trim();
}

/* ---------------------------------------------------------
   spotify metadata + official embed player
--------------------------------------------------------- */

let spotifyTimer = null;
let spotifyTimestamps = null;
let currentSpotify = null;
let currentTrackId = null;

/* Spotify iframe controller */
let spotifyIframeApi = null;
let spotifyController = null;
let spotifyControllerReady = false;
let listenHereEnabled = false;
let lastLoadedTrackId = null;

window.onSpotifyIframeApiReady = (IFrameAPI) => {
  spotifyIframeApi = IFrameAPI;

  const element =
    document.getElementById("spotifyPlayer");

  const options = {
    width: "100%",
    height: 152,
    theme: "dark"
  };

  IFrameAPI.createController(
    element,
    options,
    (controller) => {
      spotifyController = controller;

      controller.addListener("ready", () => {
        spotifyControllerReady = true;

        if (listenHereEnabled && currentSpotify) {
          loadCurrentTrackIntoPlayer(true);
        }
      });

      controller.addListener(
        "playback_started",
        () => {
          setListenButtonState(true);
        }
      );

      controller.addListener(
        "playback_update",
        (event) => {
          if (event?.data?.isPaused) {
            setListenButtonState(false);
          }
        }
      );
    }
  );
};

function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return "0:00";
  }

  const total =
    Math.floor(ms / 1000);

  const minutes =
    Math.floor(total / 60);

  const seconds =
    String(total % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function updateSpotifyProgress() {
  if (!spotifyTimestamps) return;

  const start =
    Number(spotifyTimestamps.start);

  const end =
    Number(spotifyTimestamps.end);

  if (!start || !end) return;

  const duration =
    Math.max(0, end - start);

  const elapsed =
    Math.min(
      Math.max(0, Date.now() - start),
      duration
    );

  const percent =
    duration > 0
      ? (elapsed / duration) * 100
      : 0;

  document
    .getElementById("spotifyProgress")
    .style.width = `${percent}%`;

  document
    .getElementById("spotifyElapsed")
    .textContent = formatTime(elapsed);

  document
    .getElementById("spotifyDuration")
    .textContent = formatTime(duration);
}

function getLiveStartSeconds() {
  if (!spotifyTimestamps?.start) return 0;

  return Math.max(
    0,
    Math.floor(
      (Date.now() -
        Number(spotifyTimestamps.start)) /
      1000
    )
  );
}

function setListenButtonState(playing) {
  const button =
    document.getElementById("listenLiveBtn");

  const label =
    document.getElementById("listenLiveLabel");

  button.classList.toggle(
    "is-live",
    Boolean(playing)
  );

  label.textContent =
    playing
      ? "playing here"
      : "listen here";
}

async function loadCurrentTrackIntoPlayer(playAfterLoad = false) {
  if (
    !spotifyControllerReady ||
    !spotifyController ||
    !currentTrackId
  ) {
    return;
  }

  const spotifyUri =
    `spotify:track:${currentTrackId}`;

  const startAt =
    getLiveStartSeconds();

  try {
    /*
      loadEntity's startAt gives the embed a reasonable place
      to begin when the user chooses to listen on the site.
    */
    spotifyController.loadEntity(
      spotifyUri,
      false,
      startAt
    );

    lastLoadedTrackId =
      currentTrackId;

    if (playAfterLoad) {
      /*
        Some browsers still require a direct user interaction.
        This works best after the user clicked "listen here".
      */
      setTimeout(() => {
        try {
          spotifyController.play();
        } catch {}
      }, 250);
    }
  } catch {
    console.log(
      "[izzy] spotify embed could not load track"
    );
  }
}

document
  .getElementById("listenLiveBtn")
  .addEventListener(
    "click",
    async () => {
      if (!currentTrackId) return;

      listenHereEnabled = true;

      document
        .getElementById("spotifyPlayerShell")
        .hidden = false;

      if (
        spotifyControllerReady &&
        spotifyController
      ) {
        if (
          lastLoadedTrackId !==
          currentTrackId
        ) {
          await loadCurrentTrackIntoPlayer(
            true
          );
        } else {
          try {
            spotifyController.resume();
          } catch {
            try {
              spotifyController.play();
            } catch {}
          }
        }
      }

      setListenButtonState(true);
    }
  );

function renderSpotify(spotify) {
  const liveLabel =
    document.getElementById(
      "spotifyLiveLabel"
    );

  const subtitle =
    document.getElementById(
      "spotifySubtitle"
    );

  const art =
    document.getElementById(
      "spotifyAlbumArt"
    );

  const album =
    document.getElementById(
      "spotifyAlbum"
    );

  const song =
    document.getElementById(
      "spotifySong"
    );

  const artist =
    document.getElementById(
      "spotifyArtist"
    );

  const progressWrap =
    document.getElementById(
      "spotifyProgressWrap"
    );

  const open =
    document.getElementById(
      "spotifyOpen"
    );

  const listenButton =
    document.getElementById(
      "listenLiveBtn"
    );

  clearInterval(spotifyTimer);
  spotifyTimer = null;

  spotifyTimestamps = null;
  currentSpotify = spotify || null;
  currentTrackId =
    spotify?.track_id || null;

  if (!spotify) {
    liveLabel.classList.remove(
      "is-live"
    );

    liveLabel.innerHTML =
      "<i></i> not playing";

    subtitle.textContent =
      "when spotify is active on discord, it shows here automatically.";

    album.textContent = "spotify";
    song.textContent =
      "nothing playing rn";

    artist.textContent =
      "check back later.";

    art.removeAttribute("src");
    art.style.opacity = "0";

    progressWrap.hidden = true;
    open.hidden = true;

    listenButton.disabled = true;
    setListenButtonState(false);

    visualizer.setSpotifyActive(false);

    return;
  }

  liveLabel.classList.add("is-live");
  liveLabel.innerHTML =
    "<i></i> listening now";

  subtitle.textContent =
    "live from my discord spotify presence.";

  album.textContent =
    spotify.album || "spotify";

  song.textContent =
    spotify.song || "unknown track";

  artist.textContent =
    spotify.artist || "unknown artist";

  listenButton.disabled =
    !spotify.track_id;

  if (spotify.album_art_url) {
    art.src =
      spotify.album_art_url;

    art.onload = () => {
      art.style.opacity = "1";
    };
  }

  if (spotify.track_id) {
    open.href =
      `https://open.spotify.com/track/` +
      spotify.track_id;

    open.hidden = false;
  } else {
    open.hidden = true;
  }

  if (
    spotify.timestamps?.start &&
    spotify.timestamps?.end
  ) {
    spotifyTimestamps =
      spotify.timestamps;

    progressWrap.hidden = false;

    updateSpotifyProgress();

    spotifyTimer =
      setInterval(
        updateSpotifyProgress,
        1000
      );
  } else {
    progressWrap.hidden = true;
  }

  visualizer.setSpotifyActive(true);

  /*
    If the user already opted into audio on this page,
    update the embed whenever their live track changes.
  */
  if (
    listenHereEnabled &&
    spotify.track_id &&
    spotify.track_id !==
      lastLoadedTrackId
  ) {
    loadCurrentTrackIntoPlayer(true);
  }
}

function renderDiscord(data) {
  const user =
    data.discord_user;

  const avatar =
    document.getElementById(
      "discordAvatar"
    );

  const decor =
    document.getElementById(
      "discordDecor"
    );

  const fallback =
    document.getElementById(
      "avatarFallback"
    );

  const displayName =
    document.getElementById(
      "discordDisplayName"
    );

  const username =
    document.getElementById(
      "discordUsername"
    );

  const customStatus =
    document.getElementById(
      "discordCustomStatus"
    );

  const statusText =
    document.getElementById(
      "discordStatusText"
    );

  const statusDot =
    document.getElementById(
      "discordStatusDot"
    );

  const presenceDot =
    document.getElementById(
      "discordPresenceDot"
    );

  const display =
    user?.global_name ||
    user?.display_name ||
    user?.username ||
    "izzy";

  displayName.textContent =
    display;

  if (user?.username) {
    username.textContent =
      `@${user.username}`;

    fallback.textContent =
      user.username
        .slice(0, 1)
        .toLowerCase();
  }

  const avatarUrl =
    getDiscordAvatar(user);

  if (avatarUrl) {
    avatar.src =
      avatarUrl;

    avatar.onload = () => {
      avatar.style.opacity = "1";
    };
  }

  const decorUrl =
    getDecoration(user);

  if (decorUrl) {
    decor.src =
      decorUrl;

    decor.onload = () => {
      decor.style.opacity = "1";
    };
  } else {
    decor.removeAttribute("src");
    decor.style.opacity = "0";
  }

  const status =
    data.discord_status ||
    "offline";

  const color =
    statusColors[status] ||
    statusColors.offline;

  statusDot.style.background =
    color;

  presenceDot.style.background =
    color;

  statusText.textContent =
    status;

  const custom =
    getCustomStatus(
      data.activities
    );

  customStatus.textContent =
    custom ||
    (
      status === "offline"
        ? "offline rn"
        : "student developer · probably in vscode"
    );

  renderSpotify(
    data.listening_to_spotify
      ? data.spotify
      : null
  );
}

async function loadLanyard() {
  try {
    const response =
      await fetch(
        LANYARD_URL,
        { cache: "no-store" }
      );

    if (!response.ok) {
      throw new Error(
        "lanyard request failed"
      );
    }

    const payload =
      await response.json();

    if (
      !payload.success ||
      !payload.data
    ) {
      throw new Error(
        "invalid lanyard payload"
      );
    }

    renderDiscord(
      payload.data
    );
  } catch {
    console.log(
      "[izzy] lanyard unavailable"
    );

    document
      .getElementById(
        "discordStatusText"
      )
      .textContent =
        "lanyard unavailable";

    renderSpotify(null);
  }
}

loadLanyard();

/* 15s feels live without hammering the endpoint */
setInterval(
  loadLanyard,
  15000
);

/* ---------------------------------------------------------
   github
--------------------------------------------------------- */

async function loadGitHub() {
  try {
    const response =
      await fetch(
        `https://api.github.com/users/${GITHUB_USER}`,
        { cache: "no-store" }
      );

    if (!response.ok) {
      throw new Error(
        "github api unavailable"
      );
    }

    const user =
      await response.json();

    document
      .getElementById("githubName")
      .textContent =
        user.login || GITHUB_USER;

    document
      .getElementById("repoCount")
      .textContent =
        user.public_repos ?? "--";

    document
      .getElementById("followerCount")
      .textContent =
        user.followers ?? "--";

    document
      .getElementById("followingCount")
      .textContent =
        user.following ?? "--";

    const avatar =
      document.getElementById(
        "githubAvatarLarge"
      );

    avatar.src =
      user.avatar_url;

    avatar.onload = () => {
      avatar.style.opacity = "1";
    };
  } catch {
    console.log(
      "[izzy] github stats unavailable"
    );
  }
}

loadGitHub();

/* ---------------------------------------------------------
   card hover
--------------------------------------------------------- */

const cards =
  document.querySelectorAll(".card");

cards.forEach((card) => {
  card.addEventListener(
    "mousemove",
    (event) => {
      if (
        window.innerWidth < 841
      ) {
        return;
      }

      const rect =
        card.getBoundingClientRect();

      const x =
        (
          event.clientX -
          rect.left
        ) /
        rect.width -
        .5;

      const y =
        (
          event.clientY -
          rect.top
        ) /
        rect.height -
        .5;

      card.style.transform =
        `translateY(-4px) ` +
        `rotateX(${y * -1.15}deg) ` +
        `rotateY(${x * 1.15}deg)`;
    }
  );

  card.addEventListener(
    "mouseleave",
    () => {
      card.style.transform = "";
    }
  );
});

/* ---------------------------------------------------------
   soundwave
   intentionally NOT analyzing Spotify audio.
   It becomes richer while Spotify is active, but the motion
   is independent of the sound recording.
--------------------------------------------------------- */

const canvas =
  document.getElementById(
    "soundwave"
  );

const ctx =
  canvas.getContext("2d");

function themeColors() {
  const light =
    root.dataset.theme === "light";

  return light
    ? {
        lines: [
          [23, 59, 36],
          [28, 95, 122],
          [122, 33, 89],
          [138, 122, 28]
        ],
        particle: [35, 35, 40]
      }
    : {
        lines: [
          [216, 255, 216],
          [143, 224, 255],
          [255, 143, 208],
          [255, 226, 143]
        ],
        particle: [255, 255, 255]
      };
}

class Visualizer {
  constructor(canvas, ctx) {
    this.canvas =
      canvas;

    this.ctx =
      ctx;

    this.spotifyActive =
      false;

    this.energy =
      .12;

    this.targetEnergy =
      .12;

    this.t = 0;

    this.dpr =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );

    this.pointer = {
      x: .5,
      y: .5,
      active: false
    };

    this.particles =
      Array.from(
        { length: 38 },
        (_, i) => ({
          seed: Math.random() * 100,
          speed:
            .08 +
            Math.random() * .16,
          size:
            .5 +
            Math.random() * 1.3,
          lane:
            Math.random(),
          phase:
            Math.random() *
            Math.PI *
            2
        })
      );

    this.resize();

    window.addEventListener(
      "resize",
      () => this.resize()
    );

    window.addEventListener(
      "pointermove",
      (event) => {
        this.pointer.x =
          event.clientX /
          window.innerWidth;

        this.pointer.y =
          event.clientY /
          window.innerHeight;

        this.pointer.active = true;
      },
      { passive: true }
    );

    this.loop =
      this.loop.bind(this);

    requestAnimationFrame(
      this.loop
    );
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

  setSpotifyActive(active) {
    this.spotifyActive =
      Boolean(active);
  }

  updateEnergy() {
    const base =
      this.spotifyActive
        ? .55
        : .12;

    const breathe =
      Math.sin(this.t * .8) *
      (
        this.spotifyActive
          ? .08
          : .025
      );

    this.targetEnergy =
      base + breathe;

    this.energy +=
      (
        this.targetEnergy -
        this.energy
      ) * .06;
  }

  waveY(x, lane, phase) {
    const center =
      this.h *
      (
        .18 +
        lane * .21
      );

    const mousePull =
      this.pointer.active
        ? (
            this.pointer.y -
            .5
          ) * 18
        : 0;

    const amp =
      16 +
      lane * 7 +
      this.energy * 58;

    const n1 =
      Math.sin(
        x * .002 +
        this.t *
          (
            .42 +
            lane * .11
          ) +
        phase
      );

    const n2 =
      Math.sin(
        x * .0054 -
        this.t *
          (
            .25 +
            lane * .07
          ) -
        phase * 1.7
      ) * .31;

    const n3 =
      Math.cos(
        x * .00115 +
        this.t * .18 +
        lane
      ) * .18;

    return (
      center +
      (n1 + n2 + n3) *
        amp +
      mousePull *
        (
          .15 +
          lane * .12
        )
    );
  }

  drawWave(index, rgb) {
    const ctx =
      this.ctx;

    const lane =
      index;

    const phase =
      index * 1.31;

    const [r, g, b] =
      rgb;

    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        this.w,
        0
      );

    gradient.addColorStop(
      0,
      `rgba(${r},${g},${b},0)`
    );

    gradient.addColorStop(
      .16,
      `rgba(${r},${g},${b},.5)`
    );

    gradient.addColorStop(
      .5,
      `rgba(${r},${g},${b},.8)`
    );

    gradient.addColorStop(
      .84,
      `rgba(${r},${g},${b},.5)`
    );

    gradient.addColorStop(
      1,
      `rgba(${r},${g},${b},0)`
    );

    ctx.beginPath();

    const steps = 100;

    for (
      let i = 0;
      i <= steps;
      i++
    ) {
      const x =
        (this.w / steps) * i;

      const y =
        this.waveY(
          x,
          lane,
          phase
        );

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle =
      gradient;

    ctx.lineWidth =
      1.15 +
      this.energy * 1.35;

    ctx.shadowColor =
      `rgba(${r},${g},${b},.65)`;

    ctx.shadowBlur =
      8 +
      this.energy * 26;

    ctx.globalAlpha =
      .38 +
      this.energy * .25;

    ctx.stroke();

    /* thin echo line */
    ctx.shadowBlur = 0;
    ctx.globalAlpha = .12;

    ctx.save();
    ctx.translate(
      0,
      7 + index * 2
    );
    ctx.stroke();
    ctx.restore();

    ctx.globalAlpha = 1;
  }

  drawParticles(colors) {
    const ctx =
      this.ctx;

    const [
      pr,
      pg,
      pb
    ] =
      colors.particle;

    for (
      const p of
      this.particles
    ) {
      const x =
        (
          (
            p.seed +
            this.t *
              p.speed *
              10
          ) %
          100
        ) /
        100 *
        this.w;

      const lane =
        p.lane * 3;

      const y =
        this.waveY(
          x,
          lane,
          p.phase
        );

      const alpha =
        (
          this.spotifyActive
            ? .26
            : .08
        ) *
        (
          .55 +
          .45 *
            Math.sin(
              this.t *
                .9 +
              p.phase
            )
        );

      ctx.beginPath();
      ctx.arc(
        x,
        y,
        p.size +
          this.energy * .7,
        0,
        Math.PI * 2
      );

      ctx.fillStyle =
        `rgba(${pr},${pg},${pb},${Math.max(.02, alpha)})`;

      ctx.fill();
    }
  }

  drawGlow() {
    const ctx =
      this.ctx;

    const x =
      this.pointer.active
        ? this.pointer.x *
          this.w
        : this.w * .5;

    const y =
      this.pointer.active
        ? this.pointer.y *
          this.h
        : this.h * .45;

    const radius =
      Math.max(
        this.w,
        this.h
      ) * .42;

    const glow =
      ctx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        radius
      );

    glow.addColorStop(
      0,
      root.dataset.theme ===
        "light"
        ? "rgba(60,80,90,.035)"
        : "rgba(150,190,255,.045)"
    );

    glow.addColorStop(
      1,
      "rgba(0,0,0,0)"
    );

    ctx.fillStyle = glow;
    ctx.fillRect(
      0,
      0,
      this.w,
      this.h
    );
  }

  loop(now) {
    const dt =
      this.lastTime
        ? (
            now -
            this.lastTime
          ) /
          1000
        : .016;

    this.lastTime = now;
    this.t += dt;

    this.updateEnergy();

    this.ctx.clearRect(
      0,
      0,
      this.w,
      this.h
    );

    this.drawGlow();

    const colors =
      themeColors();

    colors.lines.forEach(
      (rgb, index) =>
        this.drawWave(
          index,
          rgb
        )
    );

    this.drawParticles(
      colors
    );

    requestAnimationFrame(
      this.loop
    );
  }
}

const visualizer =
  new Visualizer(
    canvas,
    ctx
  );
