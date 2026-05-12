/**
 * AURA — 播放器 + iTunes 搜索 + 登录 / 主题 / 收藏 / 最近播放（本机 localStorage）
 */

const LS_USER = "aura_user_v1";
const LS_ACCOUNTS = "aura_accounts_v1";
const LS_AVATAR_MAP = "aura_avatar_map_v1";
const LS_THEME = "aura_theme_v1";
const LS_FAV = "aura_favorites_v1";
const LS_RECENT = "aura_recent_v1";

const DEFAULT_PLAYLIST = [
  {
    title: "Neon Drift",
    artist: "SoundHelix",
    album: "Demo",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://picsum.photos/seed/neon1/400/400",
    isPreview: false,
  },
  {
    title: "Pulse Highway",
    artist: "SoundHelix",
    album: "Demo",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://picsum.photos/seed/neon2/400/400",
    isPreview: false,
  },
  {
    title: "Midnight Grid",
    artist: "SoundHelix",
    album: "Demo",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://picsum.photos/seed/neon3/400/400",
    isPreview: false,
  },
  {
    title: "Synth Horizon",
    artist: "SoundHelix",
    album: "Demo",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    cover: "https://picsum.photos/seed/neon4/400/400",
    isPreview: false,
  },
  {
    title: "Violet Run",
    artist: "SoundHelix",
    album: "Demo",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    cover: "https://picsum.photos/seed/neon5/400/400",
    isPreview: false,
  },
  {
    title: "Cyber Mirage",
    artist: "SoundHelix",
    album: "Demo",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    cover: "https://picsum.photos/seed/neon6/400/400",
    isPreview: false,
  },
];

let activePlaylist = DEFAULT_PLAYLIST.slice();
/** @type {'queue' | 'favorites' | 'recent'} */
let listView = "queue";

let filterQuery = "";
let playlistCollapsed = false;
let audioContext = null;
let analyserNode = null;
let analyserData = null;
let canvasFrameId = null;

/** @typedef {'all' | 'one' | 'off'} RepeatMode */
/** @type {RepeatMode} */
let repeatMode = "all";
let shuffleOn = false;
let currentIndex = 0;
const shuffleHistory = [];
let isScrubbing = false;

function pushShuffleHistory(index) {
  shuffleHistory.push(index);
  if (shuffleHistory.length > 20) shuffleHistory.shift();
}

/** @type {string | null} */
let lastRecordedId = null;

// -----------------------------------------------------------------------------
// DOM
// -----------------------------------------------------------------------------
const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginEmail = document.getElementById("loginEmail");
const loginPass = document.getElementById("loginPass");
const regName = document.getElementById("regName");
const regEmail = document.getElementById("regEmail");
const regPass = document.getElementById("regPass");
const regPass2 = document.getElementById("regPass2");
const authTabLogin = document.getElementById("authTabLogin");
const authTabRegister = document.getElementById("authTabRegister");
const authError = document.getElementById("authError");
const appRoot = document.getElementById("appRoot");

const audioEl = document.getElementById("audioEl");
const coverImage = document.getElementById("coverImage");
const trackTitle = document.getElementById("trackTitle");
const trackArtist = document.getElementById("trackArtist");
const trackAlbum = document.getElementById("trackAlbum");
const previewHint = document.getElementById("previewHint");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const progressKnob = document.getElementById("progressKnob");
const timeCurrent = document.getElementById("timeCurrent");
const timeDuration = document.getElementById("timeDuration");
const btnPlay = document.getElementById("btnPlay");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const btnShuffle = document.getElementById("btnShuffle");
const btnRepeat = document.getElementById("btnRepeat");
const btnFavorite = document.getElementById("btnFavorite");
const volumeSlider = document.getElementById("volumeSlider");
const playlistEl = document.getElementById("playlistEl");
const artworkWrap = document.getElementById("artworkWrap");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const btnSearch = document.getElementById("btnSearch");
const searchStatus = document.getElementById("searchStatus");
const btnRestoreDefault = document.getElementById("btnRestoreDefault");
const btnTogglePlaylist = document.getElementById("btnTogglePlaylist");
const listTitle = document.getElementById("listTitle");
const playlistHint = document.getElementById("playlistHint");
const spectrumCanvas = document.getElementById("spectrumCanvas");

const chromeSearchForm = document.getElementById("chromeSearchForm");
const chromeSearchInput = document.getElementById("chromeSearchInput");
const btnChromeSearch = document.getElementById("btnChromeSearch");
const btnTheme = document.getElementById("btnTheme");
const iconThemeDark = btnTheme.querySelector(".icon-theme-dark");
const iconThemeLight = btnTheme.querySelector(".icon-theme-light");
const userAvatarBtn = document.getElementById("userAvatarBtn");
const userAvatarImg = document.getElementById("userAvatarImg");
const userAvatarText = document.getElementById("userAvatarText");
const avatarFileInput = document.getElementById("avatarFileInput");
const userMenuBtn = document.getElementById("userMenuBtn");
const userDropdown = document.getElementById("userDropdown");
const userDropdownName = document.getElementById("userDropdownName");
const btnAvatarFromMenu = document.getElementById("btnAvatarFromMenu");
const btnLogout = document.getElementById("btnLogout");

const toastEl = document.getElementById("toast");
const toastText = document.getElementById("toastText");

const tabQueue = document.getElementById("tabQueue");
const tabFavorites = document.getElementById("tabFavorites");
const tabRecent = document.getElementById("tabRecent");

const iconPlay = btnPlay.querySelector(".icon-play");
const iconPause = btnPlay.querySelector(".icon-pause");
const svgRepeatAll = btnRepeat.querySelector(".repeat-all");
const svgRepeatOne = btnRepeat.querySelector(".repeat-one");
const svgRepeatOff = btnRepeat.querySelector(".repeat-off");
const iconHeartOutline = btnFavorite.querySelector(".icon-heart-outline");
const iconHeartFill = btnFavorite.querySelector(".icon-heart-fill");

// -----------------------------------------------------------------------------
// 用户 / 账户 / 头像 / Toast / 主题 / 收藏 / 最近
// -----------------------------------------------------------------------------

/** @typedef {{ displayName: string, email: string, password: string }} Account */
/** @typedef {{ displayName: string, email: string, avatarDataUrl?: string }} SessionUser */

/** @returns {SessionUser | null} */
function getUser() {
  try {
    const raw = localStorage.getItem(LS_USER);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && typeof o.displayName === "string") return o;
  } catch {
    /* ignore */
  }
  return null;
}

/** @param {SessionUser} user */
function setUser(user) {
  localStorage.setItem(LS_USER, JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem(LS_USER);
}

/** @returns {Account[]} */
function getAccounts() {
  try {
    const raw = localStorage.getItem(LS_ACCOUNTS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** @param {Account[]} arr */
function saveAccounts(arr) {
  localStorage.setItem(LS_ACCOUNTS, JSON.stringify(arr.slice(0, 500)));
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

/** @param {string} email */
function findAccountByEmail(email) {
  const n = normalizeEmail(email);
  return getAccounts().find((a) => normalizeEmail(a.email) === n) || null;
}

/** @returns {Record<string, string>} */
function getAvatarMap() {
  try {
    const raw = localStorage.getItem(LS_AVATAR_MAP);
    const o = raw ? JSON.parse(raw) : {};
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, string>} map */
function saveAvatarMap(map) {
  localStorage.setItem(LS_AVATAR_MAP, JSON.stringify(map));
}

/** @param {string} email @param {string} dataUrl */
function saveAvatarForEmail(email, dataUrl) {
  const key = normalizeEmail(email);
  if (!key) return;
  const map = getAvatarMap();
  map[key] = dataUrl;
  saveAvatarMap(map);
}

/** @param {string} email */
function getAvatarForEmail(email) {
  const key = normalizeEmail(email);
  if (!key) return "";
  return getAvatarMap()[key] || "";
}

/** @param {SessionUser | null} user */
function isSessionValid(user) {
  if (!user || !user.displayName) return false;
  const accounts = getAccounts();
  if (accounts.length === 0) return true;
  if (!user.email) return true;
  return !!findAccountByEmail(user.email);
}

let toastTimer = 0;

/** @param {string} message @param {'ok'|'err'} [kind='ok'] */
function showToast(message, kind = "ok") {
  toastText.textContent = message;
  toastEl.classList.toggle("toast--error", kind === "err");
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add("is-visible"));
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.classList.remove("is-visible");
    window.setTimeout(() => {
      toastEl.hidden = true;
    }, 400);
  }, 2800);
}

function showAuthError(msg) {
  authError.textContent = msg;
  authError.hidden = false;
}

function hideAuthError() {
  authError.hidden = true;
  authError.textContent = "";
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  authTabLogin.classList.toggle("is-active", isLogin);
  authTabRegister.classList.toggle("is-active", !isLogin);
  authTabLogin.setAttribute("aria-selected", isLogin ? "true" : "false");
  authTabRegister.setAttribute("aria-selected", isLogin ? "false" : "true");
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  document.getElementById("loginTitle").textContent = isLogin ? "欢迎回来" : "创建账户";
  hideAuthError();
}

/** 邮箱首字母作为默认头像字（若无邮箱则用昵称首字） */
function defaultAvatarLetter(user) {
  const em = (user.email || "").trim();
  if (em.length) {
    const ch = em[0];
    return /[a-zA-Z0-9\u4e00-\u9fff]/.test(ch) ? ch.toUpperCase() : "?";
  }
  const name = (user.displayName || "?").trim();
  return name.slice(0, 1).toUpperCase() || "?";
}

/** @param {SessionUser} user */
function setUserChrome(user) {
  const name = user.displayName || "User";
  userDropdownName.textContent = user.email ? `${name} · ${user.email}` : name;

  const fromSession = user.avatarDataUrl && String(user.avatarDataUrl).startsWith("data:");
  const fromMap = user.email ? getAvatarForEmail(user.email) : "";
  const dataUrl = fromSession ? user.avatarDataUrl : fromMap;

  if (dataUrl && dataUrl.startsWith("data:image/")) {
    userAvatarImg.src = dataUrl;
    userAvatarImg.hidden = false;
    userAvatarText.hidden = true;
    userAvatarBtn.classList.add("has-photo");
  } else {
    userAvatarImg.removeAttribute("src");
    userAvatarImg.hidden = true;
    userAvatarText.hidden = false;
    userAvatarText.textContent = defaultAvatarLetter(user);
    userAvatarBtn.classList.remove("has-photo");
  }
}

/**
 * 将图片压缩为 JPEG Data URL，控制 localStorage 体积
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileToAvatarDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 192;
      let { width, height } = img;
      const scale = Math.min(1, max / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法处理图片"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const data = canvas.toDataURL("image/jpeg", 0.82);
        if (data.length > 480_000) reject(new Error("图片仍过大，请换一张较小的图"));
        else resolve(data);
      } catch {
        reject(new Error("无法导出图片"));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片无法读取"));
    };
    img.src = url;
  });
}

/** 应用新头像到会话 + 按邮箱持久化 */
async function applyAvatarFile(file) {
  if (!file) return;
  const okType = file.type === "image/png" || file.type === "image/jpeg";
  if (!okType) {
    showToast("仅支持 PNG / JPG 图片", "err");
    return;
  }
  if (file.size > 4 * 1024 * 1024) {
    showToast("文件过大（最大 4MB）", "err");
    return;
  }
  const user = getUser();
  if (!user || !user.email) {
    showToast("请先绑定邮箱后再上传头像", "err");
    return;
  }
  try {
    const dataUrl = await fileToAvatarDataUrl(file);
    saveAvatarForEmail(user.email, dataUrl);
    const next = { ...user, avatarDataUrl: dataUrl };
    setUser(next);
    setUserChrome(next);
    showToast("头像已更新");
  } catch (e) {
    showToast(e instanceof Error ? e.message : "头像处理失败", "err");
  } finally {
    avatarFileInput.value = "";
  }
}

function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(LS_THEME, t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t === "light" ? "#f0f0f5" : "#050508");
  const isLight = t === "light";
  iconThemeLight.toggleAttribute("hidden", !isLight);
  iconThemeDark.toggleAttribute("hidden", isLight);
  btnTheme.setAttribute("aria-label", isLight ? "切换到深色" : "切换到浅色");
}

function initTheme() {
  const saved = localStorage.getItem(LS_THEME);
  if (saved === "light" || saved === "dark") applyTheme(saved);
  else applyTheme("dark");
}

function trackId(t) {
  return `${String(t.src)}|${t.title}|${t.artist}`;
}

function getFavorites() {
  try {
    const raw = localStorage.getItem(LS_FAV);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveFavorites(arr) {
  localStorage.setItem(LS_FAV, JSON.stringify(arr.slice(0, 300)));
}

function isFavoriteTrack(t) {
  const id = trackId(t);
  return getFavorites().some((x) => trackId(x) === id);
}

function toggleFavoriteCurrent() {
  const t = activePlaylist[currentIndex];
  if (!t) return;
  const id = trackId(t);
  let list = getFavorites();
  const idx = list.findIndex((x) => trackId(x) === id);
  if (idx >= 0) list.splice(idx, 1);
  else list.unshift({ ...t });
  saveFavorites(list);
  updateFavoriteButton();
  if (listView === "favorites") renderPlaylist();
}

function updateFavoriteButton() {
  const t = activePlaylist[currentIndex];
  const on = t && isFavoriteTrack(t);
  btnFavorite.classList.toggle("is-fav", !!on);
  btnFavorite.setAttribute("aria-pressed", on ? "true" : "false");
  iconHeartFill.toggleAttribute("hidden", !on);
  iconHeartOutline.toggleAttribute("hidden", on);
}

function getRecent() {
  try {
    const raw = localStorage.getItem(LS_RECENT);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveRecent(arr) {
  localStorage.setItem(LS_RECENT, JSON.stringify(arr.slice(0, 50)));
}

function pushRecent(t) {
  const id = trackId(t);
  let list = getRecent().filter((x) => trackId(x) !== id);
  list.unshift({ ...t });
  saveRecent(list);
  if (listView === "recent") renderPlaylist();
}

function recordPlayForRecent() {
  const t = activePlaylist[currentIndex];
  if (!t) return;
  const id = trackId(t);
  if (id === lastRecordedId) return;
  lastRecordedId = id;
  pushRecent(t);
}

// -----------------------------------------------------------------------------
// iTunes JSONP
// -----------------------------------------------------------------------------
function hiResArtwork(url) {
  if (!url) return "";
  return url
    .replace(/100x100bb/gi, "600x600bb")
    .replace(/60x60bb/gi, "600x600bb")
    .replace(/200x200bb/gi, "600x600bb");
}

function itunesSearchJsonp(term, limit = 45) {
  const cbName = `itunesJsonp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("搜索超时，请检查网络"));
    }, 18000);

    function cleanup() {
      window.clearTimeout(timer);
      try {
        delete window[cbName];
      } catch {
        window[cbName] = undefined;
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = (data) => {
      cleanup();
      resolve(data);
    };

    const u = new URL("https://itunes.apple.com/search");
    u.searchParams.set("term", term);
    u.searchParams.set("media", "music");
    u.searchParams.set("entity", "song");
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("country", "CN");
    u.searchParams.set("callback", cbName);

    script.src = u.toString();
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error("无法加载搜索脚本"));
    };
    document.head.appendChild(script);
  });
}

function mapItunesResults(data) {
  const raw = data && typeof data === "object" && "results" in data ? data.results : null;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === "object" && r.previewUrl)
    .map((r) => ({
      title: r.trackName || "未知曲目",
      artist: r.artistName || "未知艺人",
      album: r.collectionName || "",
      src: r.previewUrl,
      cover: hiResArtwork(r.artworkUrl100 || r.artworkUrl60 || "") || "https://picsum.photos/seed/itunes/400/400",
      isPreview: true,
    }));
}

// -----------------------------------------------------------------------------
// 列表视图
// -----------------------------------------------------------------------------
function getDisplayTracks() {
  let tracks = listView === "favorites" ? getFavorites() : listView === "recent" ? getRecent() : activePlaylist;
  if (!filterQuery) return tracks;
  const q = filterQuery.toLowerCase();
  return tracks.filter((track) => {
    const target = `${track.title} ${track.artist} ${track.album || ""}`.toLowerCase();
    return target.includes(q);
  });
}

function updateListTabs() {
  tabQueue.classList.toggle("is-active", listView === "queue");
  tabFavorites.classList.toggle("is-active", listView === "favorites");
  tabRecent.classList.toggle("is-active", listView === "recent");
  tabQueue.setAttribute("aria-selected", listView === "queue" ? "true" : "false");
  tabFavorites.setAttribute("aria-selected", listView === "favorites" ? "true" : "false");
  tabRecent.setAttribute("aria-selected", listView === "recent" ? "true" : "false");

  if (listView === "queue") {
    listTitle.textContent = "播放队列";
    playlistHint.textContent = `${activePlaylist.length} 首`;
  } else if (listView === "favorites") {
    listTitle.textContent = "收藏";
    playlistHint.textContent = `${getFavorites().length} 首`;
  } else {
    listTitle.textContent = "最近播放";
    playlistHint.textContent = `${getRecent().length} 首`;
  }
}

function setListView(view) {
  listView = view;
  updateListTabs();
  renderPlaylist();
}

// -----------------------------------------------------------------------------
// 工具
// -----------------------------------------------------------------------------
function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function updateProgressUI() {
  const duration = audioEl.duration;
  const current = audioEl.currentTime;
  const ratio = duration && Number.isFinite(duration) ? current / duration : 0;
  const pct = Math.min(100, Math.max(0, ratio * 100));
  progressFill.style.width = `${pct}%`;
  progressKnob.style.left = `${pct}%`;
  progressBar.setAttribute("aria-valuenow", String(Math.round(pct)));
  timeCurrent.textContent = formatTime(current);
  timeDuration.textContent = formatTime(Number.isFinite(duration) ? duration : 0);
}

function randomIndexExcluding(max, exclude) {
  if (max <= 1) return 0;
  let idx = exclude;
  let guard = 0;
  while (idx === exclude && guard < 50) {
    idx = Math.floor(Math.random() * max);
    guard += 1;
  }
  return idx;
}

// -----------------------------------------------------------------------------
// 播放
// -----------------------------------------------------------------------------
function setPlayingState(playing) {
  if (playing) {
    iconPlay.setAttribute("hidden", "true");
    iconPause.removeAttribute("hidden");
    btnPlay.setAttribute("title", "暂停");
    btnPlay.setAttribute("aria-label", "暂停");
    artworkWrap.classList.add("is-playing");
  } else {
    iconPause.setAttribute("hidden", "true");
    iconPlay.removeAttribute("hidden");
    btnPlay.setAttribute("title", "播放");
    btnPlay.setAttribute("aria-label", "播放");
    artworkWrap.classList.remove("is-playing");
  }
}

function highlightPlaylist() {
  const current = activePlaylist[currentIndex];
  const curId = current ? trackId(current) : "";
  playlistEl.querySelectorAll(".playlist-item").forEach((el) => {
    const id = el.dataset.trackId || "";
    const isCur = !!curId && id === curId;
    el.classList.toggle("is-current", isCur);
    el.setAttribute("aria-selected", isCur ? "true" : "false");
  });
}

/**
 * @param {number} index
 * @param {boolean} [autoplay=true]
 */
function loadTrack(index, autoplay = true) {
  const n = activePlaylist.length;
  if (n === 0) return;

  currentIndex = ((index % n) + n) % n;
  const track = activePlaylist[currentIndex];

  audioEl.src = track.src;
  coverImage.src = track.cover;
  coverImage.alt = `${track.title} 封面`;
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  trackAlbum.textContent = track.album || "";
  previewHint.hidden = !track.isPreview;

  updateFavoriteButton();
  highlightPlaylist();
  audioEl.load();

  if (autoplay) {
    const p = audioEl.play();
    if (p !== undefined) {
      p.then(() => {
        setPlayingState(true);
        recordPlayForRecent();
      }).catch(() => setPlayingState(false));
    }
  } else {
    setPlayingState(false);
  }
}

/**
 * 从收藏 / 最近中点播：优先定位队列中已有曲目，否则插入到当前曲之后并播放
 * @param {typeof DEFAULT_PLAYLIST[0]} track
 */
function playFromLibrary(track) {
  const id = trackId(track);
  const idxIn = activePlaylist.findIndex((x) => trackId(x) === id);
  listView = "queue";
  updateListTabs();
  if (idxIn >= 0) {
    renderPlaylist();
    loadTrack(idxIn, true);
    return;
  }
  activePlaylist.splice(currentIndex + 1, 0, { ...track });
  renderPlaylist();
  loadTrack(currentIndex + 1, true);
}

function playNext() {
  const n = activePlaylist.length;
  if (n === 0) return;

  if (shuffleOn) {
    const nextIdx = randomIndexExcluding(n, currentIndex);
    pushShuffleHistory(currentIndex);
    loadTrack(nextIdx, true);
    return;
  }

  if (currentIndex >= n - 1) {
    if (repeatMode === "all") loadTrack(0, true);
    else if (repeatMode === "one") {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
    } else loadTrack(0, true);
  } else {
    loadTrack(currentIndex + 1, true);
  }
}

function playPrev() {
  const n = activePlaylist.length;
  if (n === 0) return;

  if (audioEl.currentTime > 3) {
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
    return;
  }

  if (shuffleOn && shuffleHistory.length > 0) {
    const prevIdx = shuffleHistory.pop();
    if (typeof prevIdx === "number") {
      loadTrack(prevIdx, true);
      return;
    }
  }

  if (currentIndex <= 0) {
    if (repeatMode === "all") loadTrack(n - 1, true);
    else {
      loadTrack(0, true);
      audioEl.currentTime = 0;
    }
  } else {
    loadTrack(currentIndex - 1, true);
  }
}

function onTrackEnded() {
  if (repeatMode === "one") {
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
    return;
  }
  if (shuffleOn) {
    playNext();
    return;
  }
  if (currentIndex >= activePlaylist.length - 1) {
    if (repeatMode === "all") loadTrack(0, true);
    else {
      setPlayingState(false);
      audioEl.currentTime = 0;
      updateProgressUI();
    }
  } else {
    loadTrack(currentIndex + 1, true);
  }
}

function cycleRepeatMode() {
  if (repeatMode === "all") repeatMode = "one";
  else if (repeatMode === "one") repeatMode = "off";
  else repeatMode = "all";
  updateRepeatButtonUI();
}

function updateRepeatButtonUI() {
  btnRepeat.dataset.mode = repeatMode;
  const titles = { all: "列表循环", one: "单曲循环", off: "关闭循环" };
  btnRepeat.setAttribute("title", titles[repeatMode]);
  btnRepeat.setAttribute("aria-label", `循环：${titles[repeatMode]}`);
  svgRepeatAll.toggleAttribute("hidden", repeatMode !== "all");
  svgRepeatOne.toggleAttribute("hidden", repeatMode !== "one");
  svgRepeatOff.toggleAttribute("hidden", repeatMode !== "off");
  if (repeatMode === "off") btnRepeat.classList.remove("is-active");
  else btnRepeat.classList.add("is-active");
}

function updateShuffleButtonUI() {
  btnShuffle.classList.toggle("is-active", shuffleOn);
  btnShuffle.setAttribute("aria-pressed", shuffleOn ? "true" : "false");
}

// -----------------------------------------------------------------------------
// 进度条
// -----------------------------------------------------------------------------
function ratioFromClientX(clientX) {
  const rect = progressBar.getBoundingClientRect();
  return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
}

function seekToRatio(ratio) {
  const d = audioEl.duration;
  if (!Number.isFinite(d) || d <= 0) return;
  audioEl.currentTime = ratio * d;
  updateProgressUI();
}

function bindProgressInteractions() {
  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    progressBar.setPointerCapture(e.pointerId);
    isScrubbing = true;
    progressBar.classList.add("is-scrubbing");
    seekToRatio(ratioFromClientX(e.clientX));
  };
  const onPointerMove = (e) => {
    if (!isScrubbing) return;
    seekToRatio(ratioFromClientX(e.clientX));
  };
  const onPointerUp = (e) => {
    if (!progressBar.hasPointerCapture(e.pointerId)) return;
    progressBar.releasePointerCapture(e.pointerId);
    isScrubbing = false;
    progressBar.classList.remove("is-scrubbing");
  };
  progressBar.addEventListener("pointerdown", onPointerDown);
  progressBar.addEventListener("pointermove", onPointerMove);
  progressBar.addEventListener("pointerup", onPointerUp);
  progressBar.addEventListener("pointercancel", onPointerUp);
  progressBar.addEventListener("keydown", (e) => {
    const d = audioEl.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      audioEl.currentTime = Math.min(d, audioEl.currentTime + 5);
      updateProgressUI();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      audioEl.currentTime = Math.max(0, audioEl.currentTime - 5);
      updateProgressUI();
    }
  });
}

function createSpectrumAnalyzer() {
  if (audioContext) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext || !audioEl) return;
  audioContext = new AudioContext();
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 2048;
  analyserNode.smoothingTimeConstant = 0.82;
  const source = audioContext.createMediaElementSource(audioEl);
  source.connect(analyserNode);
  analyserNode.connect(audioContext.destination);
  analyserData = new Uint8Array(analyserNode.frequencyBinCount);
}

function renderSpectrum() {
  if (!analyserNode || !spectrumCanvas) return;
  const ctx = spectrumCanvas.getContext("2d");
  const width = spectrumCanvas.clientWidth * window.devicePixelRatio;
  const height = spectrumCanvas.clientHeight * window.devicePixelRatio;
  spectrumCanvas.width = width;
  spectrumCanvas.height = height;
  const draw = () => {
    if (!analyserNode) return;
    analyserNode.getByteFrequencyData(analyserData);
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "rgba(34, 211, 238, 0.85)");
    gradient.addColorStop(0.5, "rgba(167, 139, 250, 0.75)");
    gradient.addColorStop(1, "rgba(232, 121, 249, 0.65)");
    const barCount = 54;
    const barWidth = width / barCount * 0.72;
    const gap = width / barCount * 0.28;
    for (let i = 0; i < barCount; i += 1) {
      const value = analyserData[Math.floor((i * analyserData.length) / barCount)];
      const barHeight = (value / 255) * height * 0.92;
      const x = i * (barWidth + gap);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.92 - (i / barCount) * 0.3;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      ctx.globalAlpha = 0.25;
      ctx.fillRect(x, height - barHeight - 4, barWidth, 4);
    }
    ctx.globalAlpha = 1;
    canvasFrameId = requestAnimationFrame(draw);
  };
  canvasFrameId = requestAnimationFrame(draw);
}

function startSpectrum() {
  if (!spectrumCanvas) return;
  createSpectrumAnalyzer();
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  if (!canvasFrameId) {
    renderSpectrum();
  }
}

function stopSpectrum() {
  if (canvasFrameId) {
    cancelAnimationFrame(canvasFrameId);
    canvasFrameId = null;
  }
  if (spectrumCanvas) {
    const ctx = spectrumCanvas.getContext("2d");
    ctx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
  }
}

// -----------------------------------------------------------------------------
// 列表渲染
// -----------------------------------------------------------------------------
function renderPlaylist() {
  playlistEl.innerHTML = "";
  const tracks = getDisplayTracks();

  if (tracks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "playlist-empty";
    empty.textContent = filterQuery
      ? "未找到匹配的歌曲，换个关键词试试"
      : listView === "favorites"
      ? "暂无收藏，点击心形添加"
      : listView === "recent"
      ? "暂无播放记录"
      : "队列为空";
    playlistEl.appendChild(empty);
    return;
  }

  tracks.forEach((track, index) => {
    const li = document.createElement("li");
    li.className = "playlist-item";
    li.dataset.trackId = trackId(track);
    li.setAttribute("role", "option");

    const badge = document.createElement("span");
    badge.className = "playlist-badge" + (track.isPreview ? " playlist-badge--preview" : "");
    badge.textContent = track.isPreview ? "试听" : "播放中";

    li.innerHTML = `
      <img class="playlist-thumb" src="" alt="" width="48" height="48" loading="lazy" />
      <div class="playlist-info">
        <p class="playlist-name"></p>
        <p class="playlist-artist"></p>
      </div>
    `;
    li.querySelector(".playlist-thumb").src = track.cover;

    const titleElement = li.querySelector(".playlist-name");
    const artistElement = li.querySelector(".playlist-artist");
    titleElement.textContent = "";
    artistElement.textContent = "";
    titleElement.appendChild(createHighlightedFragment(track.title, filterQuery));
    artistElement.appendChild(
      createHighlightedFragment(track.album ? `${track.artist} · ${track.album}` : track.artist, filterQuery)
    );

    li.appendChild(badge);

    li.addEventListener("click", () => {
      if (listView === "queue") {
        if (shuffleOn) pushShuffleHistory(currentIndex);
        const activeIndex = activePlaylist.findIndex((item) => trackId(item) === trackId(track));
        if (activeIndex >= 0) {
          loadTrack(activeIndex, true);
          return;
        }
      }
      playFromLibrary(track);
    });

    playlistEl.appendChild(li);
  });
  highlightPlaylist();
}

// -----------------------------------------------------------------------------
// 搜索
// -----------------------------------------------------------------------------
function syncSearchInputs(value) {
  searchInput.value = value;
  chromeSearchInput.value = value;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createHighlightedFragment(text, query) {
  const fragment = document.createDocumentFragment();
  if (!query) {
    fragment.appendChild(document.createTextNode(text));
    return fragment;
  }

  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const mark = document.createElement("mark");
    mark.className = "search-match";
    mark.textContent = match[0];
    fragment.appendChild(mark);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  return fragment;
}

function setFilterQuery(value) {
  filterQuery = String(value || "").trim();
  const displayed = getDisplayTracks();

  if (filterQuery) {
    searchStatus.textContent = displayed.length
      ? `匹配 ${displayed.length} 首`
      : "未找到匹配的歌曲，换个关键词试试";
  } else {
    if (listView === "queue") {
      searchStatus.textContent = `${activePlaylist.length} 首`;
    } else if (listView === "favorites") {
      searchStatus.textContent = `${getFavorites().length} 首`;
    } else {
      searchStatus.textContent = `${getRecent().length} 首`;
    }
  }

  renderPlaylist();
}

async function runSearch(term) {
  const q = term.trim();
  if (!q) {
    searchStatus.textContent = "请输入关键词";
    return;
  }
  searchStatus.textContent = "正在搜索 iTunes 曲库…";
  btnSearch.disabled = true;
  btnChromeSearch.disabled = true;
  try {
    const data = await itunesSearchJsonp(q, 45);
    const tracks = mapItunesResults(data);
    if (tracks.length === 0) {
      searchStatus.textContent = "未找到可试听曲目，换个关键词试试";
      return;
    }
    activePlaylist = tracks;
    listView = "queue";
    updateListTabs();
    listTitle.textContent = "搜索结果";
    playlistHint.textContent = `${tracks.length} 首 · 试听`;
    btnRestoreDefault.hidden = false;
    shuffleHistory.length = 0;
    currentIndex = 0;
    renderPlaylist();
    loadTrack(0, false);
    searchStatus.textContent = `找到 ${tracks.length} 首可试听`;
  } catch (err) {
    searchStatus.textContent = err instanceof Error ? err.message : "搜索失败";
  } finally {
    btnSearch.disabled = false;
    btnChromeSearch.disabled = false;
  }
}

function restoreDefaultPlaylist() {
  activePlaylist = DEFAULT_PLAYLIST.slice();
  listView = "queue";
  updateListTabs();
  listTitle.textContent = "推荐歌单";
  playlistHint.textContent = "点击播放";
  btnRestoreDefault.hidden = true;
  shuffleHistory.length = 0;
  syncSearchInputs("");
  setFilterQuery("");
  currentIndex = 0;
  loadTrack(0, false);
}

// -----------------------------------------------------------------------------
// 登录 / 顶栏
// -----------------------------------------------------------------------------
function closeUserMenu() {
  userDropdown.hidden = true;
  userMenuBtn.setAttribute("aria-expanded", "false");
}

function openUserMenu() {
  userDropdown.hidden = false;
  userMenuBtn.setAttribute("aria-expanded", "true");
}

function enterApp(withIntro) {
  appRoot.hidden = false;
  document.body.classList.add("is-logged-in");
  if (withIntro) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.add("is-app-ready");
      });
    });
  } else {
    document.body.classList.add("is-app-ready");
  }
}

// -----------------------------------------------------------------------------
// 初始化播放器逻辑（登录后调用一次）
// -----------------------------------------------------------------------------
let playerInited = false;

function initPlayer() {
  if (playerInited) return;
  playerInited = true;

  audioEl.volume = Number(volumeSlider.value) || 0.85;

  updateListTabs();
  renderPlaylist();
  loadTrack(0, false);
  setPlayingState(false);
  updateProgressUI();
  updateRepeatButtonUI();
  updateShuffleButtonUI();
  updateFavoriteButton();

  bindProgressInteractions();

  audioEl.addEventListener("play", () => {
    startSpectrum();
  });
  audioEl.addEventListener("pause", () => {
    stopSpectrum();
  });
  audioEl.addEventListener("ended", () => {
    stopSpectrum();
  });

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    syncSearchInputs(searchInput.value);
    runSearch(searchInput.value);
  });

  chromeSearchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    syncSearchInputs(chromeSearchInput.value);
    runSearch(chromeSearchInput.value);
  });

  searchInput.addEventListener("input", () => {
    syncSearchInputs(searchInput.value);
    setFilterQuery(searchInput.value);
  });
  chromeSearchInput.addEventListener("input", () => {
    syncSearchInputs(chromeSearchInput.value);
    setFilterQuery(chromeSearchInput.value);
  });

  btnTogglePlaylist.addEventListener("click", () => {
    playlistCollapsed = !playlistCollapsed;
    btnTogglePlaylist.textContent = playlistCollapsed ? "展开列表" : "折叠列表";
    btnTogglePlaylist.setAttribute("aria-expanded", String(!playlistCollapsed));
    document.querySelector(".panel--list").classList.toggle("is-collapsed", playlistCollapsed);
  });

  btnRestoreDefault.addEventListener("click", () => restoreDefaultPlaylist());

  tabQueue.addEventListener("click", () => setListView("queue"));
  tabFavorites.addEventListener("click", () => setListView("favorites"));
  tabRecent.addEventListener("click", () => setListView("recent"));

  btnFavorite.addEventListener("click", () => toggleFavoriteCurrent());

  btnPlay.addEventListener("click", () => {
    if (audioEl.paused) {
      const p = audioEl.play();
      if (p !== undefined) {
        p.then(() => {
          setPlayingState(true);
          recordPlayForRecent();
        }).catch(() => setPlayingState(false));
      }
    } else {
      audioEl.pause();
      setPlayingState(false);
    }
  });

  btnNext.addEventListener("click", () => playNext());
  btnPrev.addEventListener("click", () => playPrev());

  btnShuffle.addEventListener("click", () => {
    shuffleOn = !shuffleOn;
    shuffleHistory.length = 0;
    updateShuffleButtonUI();
  });

  btnRepeat.addEventListener("click", () => cycleRepeatMode());

  volumeSlider.addEventListener("input", () => {
    audioEl.volume = Number(volumeSlider.value);
  });

  audioEl.addEventListener("timeupdate", () => {
    if (!isScrubbing) updateProgressUI();
  });
  audioEl.addEventListener("loadedmetadata", () => updateProgressUI());
  audioEl.addEventListener("play", () => {
    setPlayingState(true);
    recordPlayForRecent();
  });
  audioEl.addEventListener("pause", () => setPlayingState(false));
  audioEl.addEventListener("ended", () => onTrackEnded());
  audioEl.addEventListener("error", () => {
    trackTitle.textContent = "音频无法播放";
    trackArtist.textContent = "链接可能失效或格式不受支持";
    setPlayingState(false);
  });

  btnTheme.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
  });

  userAvatarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeUserMenu();
    avatarFileInput.click();
  });

  userMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (userDropdown.hidden) openUserMenu();
    else closeUserMenu();
  });

  btnAvatarFromMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    closeUserMenu();
    avatarFileInput.click();
  });

  avatarFileInput.addEventListener("change", () => {
    const f = avatarFileInput.files && avatarFileInput.files[0];
    if (f) applyAvatarFile(f);
  });

  btnLogout.addEventListener("click", () => {
    clearUser();
    closeUserMenu();
    location.reload();
  });

  document.addEventListener("click", () => closeUserMenu());

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (e.code === "Space" && tag === "BODY") {
      e.preventDefault();
      btnPlay.click();
    }
  });
}

function boot() {
  initTheme();

  authTabLogin.addEventListener("click", () => setAuthMode("login"));
  authTabRegister.addEventListener("click", () => setAuthMode("register"));

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    hideAuthError();
    const input = loginEmail.value.trim() || "游客";
    const session = {
      displayName: input,
      email: input,
      avatarDataUrl: undefined,
    };
    setUser(session);
    setUserChrome(session);
    initPlayer();
    enterApp(true);
    showToast("登录成功");
  });

  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    hideAuthError();
    const displayName = regName.value.trim() || "新用户";
    const email = regEmail.value.trim() || "user@example.com";
    const password = regPass.value || "pass";
    const accounts = getAccounts();
    accounts.push({ displayName, email, password });
    saveAccounts(accounts);
    const session = {
      displayName,
      email,
      avatarDataUrl: undefined,
    };
    setUser(session);
    setUserChrome(session);
    initPlayer();
    enterApp(true);
    showToast("注册成功，已自动登录");
  });

  const existing = getUser();
  if (existing) {
    if (!isSessionValid(existing)) {
      clearUser();
    } else {
      let av = existing.avatarDataUrl;
      if ((!av || !String(av).startsWith("data:")) && existing.email) {
        const m = getAvatarForEmail(existing.email);
        if (m && String(m).startsWith("data:")) av = m;
      }
      const merged = {
        ...existing,
        avatarDataUrl: av && String(av).startsWith("data:") ? av : undefined,
      };
      setUser(merged);
      setUserChrome(merged);
      initPlayer();
      enterApp(true);
    }
  }

  userDropdown.addEventListener("click", (e) => e.stopPropagation());
}

boot();
