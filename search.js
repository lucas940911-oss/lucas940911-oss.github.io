// search.js — Label P songs search (client-side)
let SONGS = [];

/**
 * 將字串標準化：小寫、統一引號、移除標點、多空白合併
 * 目的：讓 `god` 能找到 `God’s Plan` / `HUMBLE.` 能被 `humble` 搜到
 */
function keyify(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .trim()
    // 統一各種引號
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    // 移除標點（保留英文數字、中日文、空白、單引號）
    .replace(/[^a-z0-9\u4e00-\u9fff\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 防止資料內容出現 HTML 時被注入（雖然你自己維護資料，但保險）
function escapeHtml(str) {
  return (str || "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * ✅ 統一取得歌手清單
 * 支援：
 * - 新格式：artists: ["A","B"]
 * - 舊格式：artist: "A"
 * - 舊格式：artist: ["A"]
 */
function getArtists(song) {
  if (Array.isArray(song.artists) && song.artists.length) return song.artists;

  if (Array.isArray(song.artist) && song.artist.length) return song.artist;
  if (typeof song.artist === "string" && song.artist.trim()) return [song.artist.trim()];

  return [];
}

/**
 * 載入 songs.json
 * ⚠️ 若你把 songs.json 放到 /data/songs.json，記得把下面路徑改掉
 */
async function loadSongs() {
  const res = await fetch("songs.json", { cache: "no-store" });
  if (!res.ok) throw new Error("songs.json load failed");
  SONGS = await res.json();
}

/**
 * 比對規則：只搜 artists/artist + title
 */
function matches(song, query) {
  const q = keyify(query);
  if (!q) return true;

  const artistsText = getArtists(song).map(keyify).join(" ");
  const hay = `${artistsText} ${keyify(song.title)}`;

  return hay.includes(q);
}

/**
 * 渲染卡片到 #results
 * 最多顯示 30 筆，避免未來上百首時一次畫太多
 */
function renderResults(list) {
  const results = document.getElementById("results");
  results.innerHTML = "";

  if (!list.length) {
    results.innerHTML = `<div class="card"><h3>找不到符合的歌曲</h3></div>`;
    return;
  }

  const limited = list.slice(0, 30);

  for (const song of limited) {
    const title = escapeHtml(song.title);
    const artistLabel = escapeHtml(getArtists(song).join(", "));

    const pageBtn =
      song.page && song.page.trim()
        ? `<a class="btn" href="${song.page}">查看翻譯</a>`
        : "";

    const reelBtn =
      song.reel && song.reel.trim()
        ? `<a class="btn" href="${song.reel}" target="_blank" rel="noopener">Reels</a>`
        : "";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${title} — ${artistLabel}</h3>
      <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
        ${pageBtn}
        ${reelBtn}
      </div>
    `;
    results.appendChild(card);
  }

  if (list.length > 30) {
    const more = document.createElement("div");
    more.className = "card";
    more.innerHTML = `<p>符合結果超過 30 筆，請再輸入更精準的關鍵字。</p>`;
    results.appendChild(more);
  }
}

/**
 * debounce：輸入停 200ms 再搜尋，避免每敲一個字就重算
 */
function debounce(fn, delay = 200) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

async function initSearch() {
  const input = document.getElementById("search");
  const results = document.getElementById("results");
  if (!input || !results) return;

  try {
    await loadSongs();
  } catch (e) {
    results.innerHTML = `
      <div class="card">
        <h3>載入失敗</h3>
        <p>找不到 songs.json 或路徑不正確。請確認 songs.json 跟 songs.html 在同一層。</p>
      </div>
    `;
    return;
  }

  // 預設顯示全部
  renderResults(SONGS);

  const run = debounce(() => {
    const filtered = SONGS.filter((s) => matches(s, input.value));
    renderResults(filtered);
  }, 200);

  input.addEventListener("input", run);

  // ✅ 讓 Enter 有反應：按 Enter 就強制跑一次搜尋（不跳頁、不重整）
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const filtered = SONGS.filter((s) => matches(s, input.value));
      renderResults(filtered);
    }
  });
}

// 啟動
initSearch();
