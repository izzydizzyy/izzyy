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
      `translateY(-2px) rotateX(${y * -1.2}deg) rotateY(${x * 1.2}deg)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "";
  });
});
