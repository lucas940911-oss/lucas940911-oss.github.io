// playlist.js — Label P Reels Playlist
// Data source: Google Apps Script Web App (/exec)

const SONGS_URL =
  "https://script.google.com/macros/s/AKfycbx3NfhoPwClRnby7o9LBVnZIUWg5EiIJun66BBrEnm3xrY_osu-ckNbN1TptDxQ05XaYQ/exec";

// === DOM ===
const grid = document.getElementById("grid");
const msg = document.getElementById("msg");
const q = document.getElementById("q");
const artistSelect = document.getElementById("artist");

// 防呆：如果 HTML 少元素，不讓整頁炸掉
if (!grid || !msg || !q || !artistSelect) {
  console.error(
    "playlist.js: 缺少必要元素 (#grid, #msg, #q, #artist)，請檢查 playlist.html"
  );
}

let songs = [];

// === 工具函式 ===
function escapeHTML(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function normalize(str = "") {
  return String(str).toLowerCase().trim();
}

function setMessage(text) {
  if (msg) msg.textContent = text;
}

function uniqueArtists(list) {
  const set = new Set();
  list.forEach(s => (s.artists || []).forEach(a => set.add(a)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

// === UI 建構 ===
function buildArtistOptions() {
  if (!artistSelect) return;

  // 保留第一個「全部歌手」
  const firstOption = artistSelect.querySelector("option[value='']");
  artistSelect.innerHTML = "";
  if (firstOption) {
    artistSelect.appendChild(firstOption);
  } else {
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "全部歌手";
    artistSelect.appendChild(optAll);
  }

  uniqueArtists(songs).forEach(a => {
    const opt = document.createElement("option");
    opt.value = a;
    opt.textContent = a;
    artistSelect.appendChild(opt);
  });
}

function cardHTML(song) {
  const title = escapeHTML(song.title || "");
  const artists = escapeHTML((song.artists || []).join(", "));
  const reel = song.reel || "";

  const fallback = reel
    ? `<a href="${reel}" target="_blank" rel="noreferrer" class="btn">Open on Instagram</a>`
    : `<span style="opacity:.7;">（缺少 reels 連結）</span>`;

  const embed = reel
    ? `
    <blockquote class="instagram-media"
      data-instgrm-permalink="${reel}"
      data-instgrm-version="14"
      style="width:100%; margin:10px 0 0; min-width:0;">
      <a href="${reel}" target="_blank" rel="noreferrer">Open on Instagram</a>
    </blockquote>
  `
    : "";

  return `
    <div class="card">
      <h3>${title}</h3>
      <div style="opacity:.75; margin:-6px 0 10px;">${artists}</div>
      ${fallback}
      ${embed}
    </div>
  `;
}

function render(list) {
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = "";
    setMessage("沒有符合條件的結果。");
    return;
  }

  setMessage(`共 ${list.length} 首`);
  grid.innerHTML = list.map(cardHTML).join("");

  // 重新解析 IG embed
  if (window.instgrm?.Embeds?.process) {
    window.instgrm.Embeds.process();
  }
}

function applyFilters() {
  const kw = normalize(q?.value || "");
  const selectedArtist = artistSelect?.value || "";

  const filtered = songs.filter(s => {
    const haystack = normalize(
      `${(s.artists || []).join(" ")} ${s.title || ""}`
    );

    const matchKeyword = kw ? haystack.includes(kw) : true;
    const matchArtist = selectedArtist
      ? (s.artists || []).includes(selectedArtist)
      : true;

    return matchKeyword && matchArtist;
  });

  render(filtered);
}

// === 載入資料 ===
async function loadSongs() {
  setMessage("載入中…");
  if (grid) grid.innerHTML = "";

  try {
    const res = await fetch(SONGS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

    const data = await res.json();

    songs = (Array.isArray(data) ? data : []).map(s => ({
      title: s.title || "",
      artists: Array.isArray(s.artists)
        ? s.artists
        : (s.artist ? [s.artist] : []),
      reel: s.reel || "",
      page: s.page || ""
    }));

    buildArtistOptions();
    render(songs);

    q?.addEventListener("input", applyFilters);
    artistSelect?.addEventListener("change", applyFilters);

  } catch (err) {
    console.error(err);
    setMessage(`載入失敗：${err.message}`);
  }
}

loadSongs();
