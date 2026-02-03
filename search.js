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
 * 渲染卡片到指定容器
 * - targetId 預設 "results"
 * - limit 預設 30（recent 通常會用 6）
 */
function renderResults(list, targetId = "results", limit = 30) {
  const results = document.getElementById(targetId);
  if (!results) return;

  results.innerHTML = "";

  if (!list.length) {
    // recent 區塊如果沒資料就留空，不要顯示「找不到」
    if (targetId === "recent") return;

    results.innerHTML = `<div class="card"><h3>找不到符合的歌曲</h3></div>`;
    return;
  }

  const limited = list.slice(0, limit);

  for (const song of limited) {
    const title = escapeHtml(song.title);

    // ✅ 顯示用：歌手用「•」分隔更像音樂平台
    const artistLabel = escapeHtml(getArtists(song).join(" • "));

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
      <div class="song-meta">
        <p class="song-artist">${artistLabel}</p>
        <h3 class="song-title">${title}</h3>
      </div>

      <div class="song-actions">
        ${pageBtn}
        ${reelBtn}
      </div>
    `;
    results.appendChild(card);
  }

  // results 區才需要「超過上限提示」
  if (targetId === "results" && list.length > limit) {
    const more = document.createElement("div");
    more.className = "card";
    more.innerHTML = `<p>符合結果超過 ${limit} 筆，請再輸入更精準的關鍵字。</p>`;
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
  const resultsEl = document.getElementById("results");
  const recentEl = document.getElementById("recent");
  if (!input || !resultsEl) return;

  try {
    await loadSongs();
  } catch (e) {
    resultsEl.innerHTML = `
      <div class="card">
        <h3>載入失敗</h3>
        <p>找不到 songs.json 或路徑不正確。請確認 songs.json 跟 songs.html 在同一層。</p>
      </div>
    `;
    return;
  }

  // ✅ 先渲染 Recently（前 6 首）
  // 目前先用資料順序當「最近」，之後你若加上 date 欄位可改成真正排序
  if (recentEl) renderResults(SONGS, "recent", 6);

  // ✅ 預設顯示全部 Results
  renderResults(SONS_SAFE(), "results", 30);

  function SONS_SAFE() {
    // 避免 SONGS 不是陣列時爆掉（容錯）
    return Array.isArray(SONGS) ? SONGS : [];
  }

  const run = debounce(() => {
    const q = input.value;

    const filtered = SONS_SAFE().filter((s) => matches(s, q));
    renderResults(filtered, "results", 30);

    // 有輸入時：recent 淡出（如果你 style.css 有做淡出可更漂亮）
    // 沒輸入時：recent 回來
    if (recentEl) {
      const hasQuery = keyify(q).length > 0;
      recentEl.style.opacity = hasQuery ? "0.35" : "1";
      recentEl.style.pointerEvents = hasQuery ? "none" : "auto";
    }
  }, 200);

  input.addEventListener("input", run);

  // ✅ 讓 Enter 有反應：按 Enter 就強制跑一次搜尋（不跳頁、不重整）
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const filtered = SONS_SAFE().filter((s) => matches(s, input.value));
      renderResults(filtered, "results", 30);
    }
  });
}

// 啟動
initSearch();
