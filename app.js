const TODAY = new Date();

const state = { order: "release", phase: "all" };

const $timeline = document.getElementById("timeline");
const $summary = document.getElementById("summary");
const $filters = document.getElementById("phaseFilters");
const $modal = document.getElementById("modal");
const $modalBody = document.getElementById("modalBody");

const isUpcoming = (m) => new Date(m.release) > TODAY;
const releaseOrder = [...MOVIES].sort((a, b) => a.release.localeCompare(b.release));
const fileNo = (m) => String(releaseOrder.indexOf(m) + 1).padStart(4, "0");

// 今日の日付から「最新作」と「次回公開作」を自動判定
const released = releaseOrder.filter((m) => !isUpcoming(m));
const LATEST = released[released.length - 1];
const NEXT = releaseOrder.find(isUpcoming);
// 一番目立たせる作品：次回公開作（無ければ最新作）
const FEATURED = NEXT || LATEST;

function formatDate(iso) {
  const [y, mo, d] = iso.split("-").map(Number);
  return `${y}.${String(mo).padStart(2, "0")}.${String(d).padStart(2, "0")}`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// TMDB のポスターを表示。読み込めない場合は CRT 風の仮ポスターを表示
function posterHtml(m) {
  return `
    <div class="poster">
      <div class="poster-fallback"><small>FILE ${fileNo(m)}</small>${escapeHtml(m.en)}</div>
      <img src="${m.poster}" alt="${escapeHtml(m.title)} ポスター" loading="lazy" onerror="this.remove()">
    </div>`;
}

function badgesHtml(m) {
  return [
    m === NEXT ? '<span class="badge next">NEXT</span>' : "",
    m === LATEST ? '<span class="badge latest">最新作</span>' : "",
    `<span class="badge">PHASE ${m.phase}</span>`,
    m.branch ? '<span class="badge variant">VARIANT</span>' : "",
    isUpcoming(m) ? '<span class="badge upcoming">公開予定</span>' : "",
  ].join("");
}

function sortedMovies() {
  const list = MOVIES.filter((m) => state.phase === "all" || m.phase === Number(state.phase));
  return state.order === "release"
    ? list.sort((a, b) => a.release.localeCompare(b.release))
    : list.sort((a, b) => a.chrono - b.chrono);
}

// 区切り見出し：公開順は公開年、時系列順は作中年代
function groupLabel(m) {
  return state.order === "release" ? `▸ ${m.release.slice(0, 4)}` : `▸ ${m.era}`;
}

function render() {
  const list = sortedMovies();
  let lastGroup = null;
  let html = "";

  list.forEach((m, i) => {
    const group = groupLabel(m);
    if (group !== lastGroup) {
      html += `<li class="year-marker">${escapeHtml(group)}</li>`;
      lastGroup = group;
    }
    const no = state.order === "release" ? i + 1 : m.chrono;
    html += `
      <li class="entry ${m.branch ? "branch" : ""} ${m === FEATURED ? "is-featured" : ""}">
        ${m.branch ? '<svg class="branch-line" aria-hidden="true"><path/><circle r="5"/></svg>' : ""}
        <button class="card" style="animation-delay:${Math.min(i, 12) * 30}ms" data-id="${m.id}">
          <div class="card-head">
            <span class="file-no">#${String(no).padStart(2, "0")} ／ FILE ${fileNo(m)}</span>
            <span class="badges">${badgesHtml(m)}</span>
          </div>
          <div class="card-main">
            ${posterHtml(m)}
            <div class="card-body">
              <h2 class="card-title">${escapeHtml(m.title)}</h2>
              <p class="card-en">${escapeHtml(m.en)}</p>
              <p class="card-dates"><span>公開</span><b>${formatDate(m.release)}</b><span>作中</span><b>${escapeHtml(m.era)}</b></p>
              <p class="card-desc">${escapeHtml(m.desc)}</p>
            </div>
          </div>
        </button>
      </li>`;
  });

  $timeline.innerHTML = html;
  drawBranches();
  const label = state.order === "release" ? "SORT: 公開順" : "SORT: 時系列順";
  $summary.textContent = `${label} ／ ${list.length} FILES`;
}

// 別ユニバース作品：メインのタイムラインからカードへ曲線を引く
function drawBranches() {
  const root = getComputedStyle(document.documentElement);
  const lineX = parseFloat(root.getPropertyValue("--line-x"));
  const gutter = parseFloat(root.getPropertyValue("--gutter"));
  const startY = 18; // svg の top: -18px 分
  const endY = startY + 34; // カード内の接続位置

  document.querySelectorAll(".branch-line").forEach((svg) => {
    const pad = parseFloat(getComputedStyle(svg.parentElement).paddingLeft);
    const w = gutter - lineX + pad;
    svg.setAttribute("width", w);
    svg.setAttribute("height", endY + 4);
    svg.querySelector("path").setAttribute("d", `M0 0 C 0 ${endY * 0.75}, ${w * 0.35} ${endY}, ${w} ${endY}`);
    const c = svg.querySelector("circle");
    c.setAttribute("cx", w * 0.62);
    c.setAttribute("cy", endY - 1.5);
  });
}

// ページ上部：次回公開作を大きく表示し、公開までをカウントダウン。最新作は小さく添える
function renderSpotlight() {
  const $spot = document.getElementById("spotlight");
  let html = "";
  if (FEATURED) {
    const m = FEATURED;
    html += `
      <button class="spot-hero" data-id="${m.id}">
        <p class="spot-label"><span class="status-dot"></span>${m === NEXT ? "NEXT RELEASE ／ 次回公開" : "LATEST RELEASE ／ 最新作"}</p>
        <div class="spot-main">
          ${posterHtml(m)}
          <div class="spot-body">
            <div class="badges">${badgesHtml(m)}</div>
            <h2 class="spot-title">${escapeHtml(m.title)}</h2>
            <p class="card-en">${escapeHtml(m.en)}</p>
            <p class="spot-date">${formatDate(m.release)} 公開</p>
            ${m === NEXT ? `
            <div class="countdown" id="countdown" aria-label="公開までの残り時間">
              <div><b data-unit="d">--</b><span>DAYS</span></div>
              <div><b data-unit="h">--</b><span>HRS</span></div>
              <div><b data-unit="m">--</b><span>MIN</span></div>
              <div><b data-unit="s">--</b><span>SEC</span></div>
            </div>` : ""}
            <p class="spot-desc">${escapeHtml(m.desc)}</p>
            <span class="spot-cta">ファイルを開く ▸</span>
          </div>
        </div>
      </button>`;
  }
  if (NEXT && LATEST) {
    html += `
      <button class="spot-sub" data-id="${LATEST.id}">
        ${posterHtml(LATEST)}
        <div>
          <p class="spot-label">LATEST RELEASE ／ 最新作</p>
          <p class="spot-sub-title">${escapeHtml(LATEST.title)}</p>
          <p class="card-dates"><span>公開</span><b>${formatDate(LATEST.release)}</b></p>
        </div>
      </button>`;
  }
  $spot.innerHTML = html;
  $spot.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-id]");
    if (btn) openModal(btn.dataset.id);
  });
  if (FEATURED === NEXT) startCountdown();
}

function startCountdown() {
  const target = new Date(`${NEXT.release}T00:00:00`);
  const cells = {};
  document.querySelectorAll("#countdown [data-unit]").forEach((el) => { cells[el.dataset.unit] = el; });
  const tick = () => {
    const diff = Math.max(0, target - new Date());
    const sec = Math.floor(diff / 1000);
    cells.d.textContent = Math.floor(sec / 86400);
    cells.h.textContent = String(Math.floor(sec / 3600) % 24).padStart(2, "0");
    cells.m.textContent = String(Math.floor(sec / 60) % 60).padStart(2, "0");
    cells.s.textContent = String(sec % 60).padStart(2, "0");
  };
  tick();
  setInterval(tick, 1000);
}

function renderFilters() {
  const phases = ["all", ...[...new Set(MOVIES.map((m) => m.phase))].sort()];
  $filters.innerHTML = phases.map((p) => `
    <button class="chip ${state.phase === String(p) ? "is-active" : ""}" data-phase="${p}">
      ${p === "all" ? "ALL" : `PHASE ${p}`}
    </button>`).join("");
}

function openModal(id) {
  const m = MOVIES.find((x) => x.id === id);
  if (!m) return;
  $modal.classList.toggle("variant", !!m.branch);
  $modalBody.innerHTML = `
    <div class="modal-hero ${m.branch ? "branch" : ""}">
      ${posterHtml(m)}
      <div>
        <div class="badges">${badgesHtml(m)}</div>
        <h2 class="modal-title">${escapeHtml(m.title)}</h2>
        <p class="card-en">${escapeHtml(m.en)}</p>
      </div>
    </div>
    <div class="modal-section">
      <p>${escapeHtml(m.desc)}</p>
      <dl class="facts">
        <dt>FILE No.</dt><dd>${fileNo(m)}</dd>
        <dt>公開日</dt><dd>${formatDate(m.release)}（全米）</dd>
        <dt>作中の年代</dt><dd>${escapeHtml(m.era)}</dd>
        <dt>公開順</dt><dd>${releaseOrder.indexOf(m) + 1}作目</dd>
        <dt>時系列順</dt><dd>${m.chrono}番目</dd>
        <dt>分類</dt><dd>${m.branch ? "分岐タイムライン（別ユニバース）" : "神聖時間軸"}</dd>
      </dl>
      <a class="tmdb-link" href="https://www.themoviedb.org/movie/${m.tmdb}?language=ja-JP" target="_blank" rel="noopener">TMDB で詳しく見る ↗</a>
    </div>`;
  $modal.showModal();
}

// ---------- Events ----------
document.querySelectorAll(".seg-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.order = btn.dataset.order;
    document.querySelectorAll(".seg-btn").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", active);
    });
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

$filters.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  state.phase = chip.dataset.phase;
  renderFilters();
  render();
});

$timeline.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) openModal(card.dataset.id);
});

document.getElementById("modalClose").addEventListener("click", () => $modal.close());
$modal.addEventListener("click", (e) => { if (e.target === $modal) $modal.close(); });
window.matchMedia("(min-width: 720px)").addEventListener("change", drawBranches);

renderSpotlight();
renderFilters();
render();
