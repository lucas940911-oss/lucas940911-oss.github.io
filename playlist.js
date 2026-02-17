// ✅ 把這行換成你的 Apps Script Web App /exec URL
const SONGS_URL = "https://script.google.com/macros/s/AKfycbyXFx65BMWwmEoPH4tbpfeqAOqFfqfPDTxYlTJ9Yw6y/dev";

const grid = document.getElementById("grid");
const msg = document.getElementById("msg");
const q = document.getElementById("q");
const artistSelect = document.getElementById("artist");

let songs = [];

function escapeHTML(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function normalize(str = "") {
  return String(str).toLowerCase().trim();
}

function uniqueArtists(list) {
  const set = new Set();
  list.forEach(s => (s.artists || []).forEach(a => set.add(a)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

function buildArtistOptions() {
  const artists = uniqueArtists(songs);
  artists.forEach(a => {
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

  // ✅ 只要 embed 掛了，這個連結仍會出現（穩）
  const fallbackLink = reel
    ? `<a href="${reel}" target="_blank" rel="noreferrer" class="btn">Open on Instagram</a>`
    : `<span style="opacity:.7;">（缺少 reels 連結）</span>`;

  // ✅ Instagram embed：官方建議 blockquote + data-instgrm-permalink
  const embed = reel ? `
    <blockquote class="instagram-media"
      data-instgrm-permalink="${reel}"
      data-instgrm-version="14"
      style="width:100%; margin: 10px 0 0; min-width: 0;">
      <a href="${reel}" target="_blank" rel="noreferrer">Open on Instagram</a>
    </blockquote>
  ` : "";

  return `
    <div class="card">
      <h3>${title}</h3>
      <div style="opacity:.75; margin: -6px 0 10px;">${artists}</div>
      ${fallbackLink}
      ${embed}
    </div>
  `;
}

function render(list) {
  if (!list.length) {
    grid.innerHTML = "";
    msg.textContent = "沒有符合條件的結果。";
    return;
  }

  msg.textContent = `共 ${list.length} 首`;
  grid.innerHTML = list.map(cardHTML).join("");

  // ✅ 讓 IG script 解析剛插入的 blockquote
  if (window.instgrm && window.instgrm.Embeds && typeof window.instgrm.Embeds.process === "function") {
    window.instgrm.Embeds.process();
  }
}

function applyFilters() {
  const kw = normalize(q.value);
  const a = artistSelect.value;

  const filtered = songs.filter(s => {
    const hay = normalize(`${(s.artists || []).join(" ")} ${s.title || ""}`);
    const hitKw = kw ? hay.includes(kw) : true;
    const hitArtist = a ? (s.artists || []).includes(a) : true;
    return hitKw && hitArtist;
  });

  render(filtered);
}

async function loadSongs() {
  msg.textContent = "載入中…";
  grid.innerHTML = "";

  if (!SONGS_URL || SONGS_URL === "YOUR_WEBAPP_URL") {
    msg.textContent = "你還沒設定 SONGS_URL（請把 YOUR_WEBAPP_URL 換成 Apps Script /exec）。";
    return;
  }

  const res = await fetch(SONGS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  const data = await res.json();

  // ✅ 防呆：統一 artists
  songs = (Array.isArray(data) ? data : []).map(s => ({
    title: s.title || "",
    artists: Array.isArray(s.artists) ? s.artists : (s.artist ? [s.artist] : []),
    reel: s.reel || "",
    page: s.page || ""
  }));

  buildArtistOptions();
  render(songs);

  q.addEventListener("input", applyFilters);
  artistSelect.addEventListener("change", applyFilters);
}

loadSongs().catch(err => {
  console.error(err);
  msg.textContent = `載入失敗：${err.message}`;
});
