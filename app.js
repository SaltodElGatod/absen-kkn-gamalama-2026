const KKN_START = new Date(2026, 5, 22);
const KKN_DAYS = 40;
const ATTENDANCE_KEY = "kkn-gamalama-attendance-v2";
const SESSION_KEY = "kkn-gamalama-session-v2";

const USERS = [
  { name: "Rusdi Usman", npm: "04392211024" },
  { name: "Muhamad Ramdani Daud", npm: "04392311002" },
  { name: "M. Mufrih Syafrudin", npm: "03082311032" },
  { name: "Isnadina Putri Iksan", npm: "03082311033" },
  { name: "Asti", npm: "03082311035" },
  { name: "Affan Husen", npm: "03082311036" },
  { name: "Asria A. Arif", npm: "03082311038" },
  { name: "Nurul Husni Husen", npm: "07352311154" },
  { name: "Rezha Amelia Putri Firmansyah", npm: "07352311127" },
  { name: "Muhammad Salwan Wahab", npm: "07352311159" },
];

const ADMIN = { role: "admin", username: "admin", password: "admin123", name: "Admin" };

const els = {
  loginView: document.querySelector("#loginView"),
  appView: document.querySelector("#appView"),
  loginForm: document.querySelector("#loginForm"),
  usernameInput: document.querySelector("#usernameInput"),
  passwordInput: document.querySelector("#passwordInput"),
  loginMessage: document.querySelector("#loginMessage"),
  sessionName: document.querySelector("#sessionName"),
  logoutBtn: document.querySelector("#logoutBtn"),
  dashboardTitle: document.querySelector("#dashboardTitle"),
  adminUserFilter: document.querySelector("#adminUserFilter"),
  hadirCount: document.querySelector("#hadirCount"),
  alpaCount: document.querySelector("#alpaCount"),
  izinCount: document.querySelector("#izinCount"),
  sakitCount: document.querySelector("#sakitCount"),
  progressText: document.querySelector("#progressText"),
  progressBar: document.querySelector("#progressBar"),
  qrPanel: document.querySelector("#qrPanel"),
  qrcode: document.querySelector("#qrcode"),
  todayLabel: document.querySelector("#todayLabel"),
  dailyLink: document.querySelector("#dailyLink"),
  scanMessage: document.querySelector("#scanMessage"),
  statusPanel: document.querySelector("#statusPanel"),
  todayStatus: document.querySelector("#todayStatus"),
  adminActions: document.querySelector("#adminActions"),
  adminMessage: document.querySelector("#adminMessage"),
  statusUserInput: document.querySelector("#statusUserInput"),
  statusTypeInput: document.querySelector("#statusTypeInput"),
  statusDateInput: document.querySelector("#statusDateInput"),
  saveStatusBtn: document.querySelector("#saveStatusBtn"),
  exportExcelBtn: document.querySelector("#exportExcelBtn"),
  tableTitle: document.querySelector("#tableTitle"),
  recordsBody: document.querySelector("#recordsBody"),
  adminSummaryPanel: document.querySelector("#adminSummaryPanel"),
  participantGrid: document.querySelector("#participantGrid"),
};

let records = loadJson(ATTENDANCE_KEY, []);
let session = loadJson(SESSION_KEY, null);

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function displayDate(key) {
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

function addDays(date, days) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function kknEndDate() {
  return addDays(KKN_START, KKN_DAYS - 1);
}

function kknDayNumber(date = new Date()) {
  const start = new Date(KKN_START.getFullYear(), KKN_START.getMonth(), KKN_START.getDate());
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - start) / 86400000) + 1;
}

function isKknDate(key) {
  const day = kknDayNumber(new Date(`${key}T00:00:00`));
  return day >= 1 && day <= KKN_DAYS;
}

function elapsedKknDates() {
  const todayDay = Math.max(0, Math.min(KKN_DAYS, kknDayNumber()));
  return Array.from({ length: todayDay }, (_, index) => dateKey(addDays(KKN_START, index)));
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveRecords() {
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
}

function saveSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  session = null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeLogin(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message ${type}`;
}

function getUser(npm) {
  return USERS.find((user) => user.npm === npm);
}

function recordFor(npm, date) {
  return records.find((record) => record.npm === npm && record.date === date);
}

function upsertRecord(npm, date, status, source) {
  const user = getUser(npm);
  if (!user || !isKknDate(date)) return { ok: false, message: "Tanggal atau akun tidak valid." };

  const existing = recordFor(npm, date);
  if (existing?.status === "hadir" && status === "hadir") {
    return { ok: false, message: "Anda sudah absen untuk hari ini." };
  }

  const now = new Date();
  const payload = {
    npm,
    name: user.name,
    date,
    status,
    source,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    updatedAt: now.toISOString(),
  };

  if (existing) Object.assign(existing, payload);
  else records.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, ...payload });

  saveRecords();
  return { ok: true, message: status === "hadir" ? "Absensi berhasil. Anda tercatat hadir hari ini." : "Status berhasil disimpan." };
}

function dailyToken(key = dateKey()) {
  let hash = 0;
  const text = `GAMALAMA-2026-${key}`;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  return hash.toString(36).toUpperCase();
}

function attendanceLink() {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("absen", dateKey());
  url.searchParams.set("token", dailyToken());
  return url.toString();
}

function buildRows(npmList) {
  return npmList.flatMap((npm) => {
    const user = getUser(npm);
    return elapsedKknDates().map((date) => {
      const record = recordFor(npm, date);
      return {
        date,
        npm,
        name: user.name,
        status: record?.status || "alpa",
        time: record?.time || "-",
        source: record?.source || "otomatis",
      };
    });
  });
}

function summaryFor(npmList) {
  const counts = { hadir: 0, alpa: 0, izin: 0, sakit: 0 };
  buildRows(npmList).forEach((row) => {
    counts[row.status] += 1;
  });
  return counts;
}

function currentNpmList() {
  if (!session) return [];
  if (session.role === "user") return [session.npm];
  const selected = els.adminUserFilter.value;
  return selected === "all" ? USERS.map((user) => user.npm) : [selected];
}

function renderQr() {
  const today = dateKey();
  const link = attendanceLink();
  els.todayLabel.textContent = `${displayDate(today)} | Hari ${Math.max(1, Math.min(KKN_DAYS, kknDayNumber()))}`;
  els.dailyLink.textContent = link;
  els.qrcode.innerHTML = "";
  if (window.QRCode) {
    new QRCode(els.qrcode, { text: link, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M });
  } else {
    els.qrcode.textContent = link;
  }
}

function renderDashboard() {
  const npmList = currentNpmList();
  const counts = summaryFor(npmList);
  const totalDone = counts.hadir + counts.izin + counts.sakit;
  const totalSlots = Math.max(1, elapsedKknDates().length * Math.max(1, npmList.length));
  const progress = Math.round((totalDone / totalSlots) * 100);

  els.hadirCount.textContent = counts.hadir;
  els.alpaCount.textContent = counts.alpa;
  els.izinCount.textContent = counts.izin;
  els.sakitCount.textContent = counts.sakit;
  els.progressText.textContent = `${totalDone}/${totalSlots}`;
  els.progressBar.style.width = `${Math.min(100, progress)}%`;
}

function renderTodayStatus() {
  if (!session || session.role !== "user") {
    els.todayStatus.textContent = "Admin melihat semua data peserta.";
    els.todayStatus.className = "today-status";
    return;
  }
  const record = recordFor(session.npm, dateKey());
  const status = record?.status || "belum absen";
  els.todayStatus.textContent = status === "hadir" ? "Hadir hari ini" : status;
  els.todayStatus.className = `today-status ${record?.status || ""}`;
}

function renderTable() {
  const rows = buildRows(currentNpmList()).sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    return byDate || a.name.localeCompare(b.name);
  });
  if (rows.length === 0) {
    els.recordsBody.innerHTML = `<tr><td colspan="6">Belum ada data absensi.</td></tr>`;
    return;
  }
  els.recordsBody.innerHTML = rows
    .map(
      (row) => `<tr>
        <td>${displayDate(row.date)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.npm)}</td>
        <td class="status ${escapeHtml(row.status)}">${escapeHtml(row.status)}</td>
        <td>${escapeHtml(row.time)}</td>
        <td>${escapeHtml(row.source)}</td>
      </tr>`,
    )
    .join("");
}

function renderParticipantSummary() {
  if (session?.role !== "admin") return;
  els.participantGrid.innerHTML = USERS.map((user) => {
    const counts = summaryFor([user.npm]);
    const done = counts.hadir + counts.izin + counts.sakit;
    const total = Math.max(1, elapsedKknDates().length);
    const percent = Math.round((done / total) * 100);
    return `<article class="participant-card">
      <div>
        <h3>${escapeHtml(user.name)}</h3>
        <p>${escapeHtml(user.npm)}</p>
      </div>
      <strong>${percent}%</strong>
      <div class="mini-stats">
        <span>H ${counts.hadir}</span>
        <span>A ${counts.alpa}</span>
        <span>I ${counts.izin}</span>
        <span>S ${counts.sakit}</span>
      </div>
    </article>`;
  }).join("");
}

function renderAdminControls() {
  const userOptions = USERS.map((user) => `<option value="${user.npm}">${escapeHtml(user.name)} - ${user.npm}</option>`).join("");
  els.adminUserFilter.innerHTML = `<option value="all">Semua peserta</option>${userOptions}`;
  els.statusUserInput.innerHTML = userOptions;
  els.statusDateInput.value = dateKey();
  els.statusDateInput.min = dateKey(KKN_START);
  els.statusDateInput.max = dateKey(kknEndDate());
}

function renderApp() {
  const isAdmin = session?.role === "admin";
  els.loginView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.logoutBtn.classList.remove("hidden");
  els.sessionName.textContent = isAdmin ? "Admin" : `${session.name} (${session.npm})`;
  els.dashboardTitle.textContent = isAdmin ? "Rekap Semua Peserta" : `Rekap ${session.name}`;
  els.tableTitle.textContent = isAdmin ? "Riwayat Semua Peserta" : "Riwayat Absensi Saya";
  els.qrPanel.classList.toggle("hidden", isAdmin);
  els.statusPanel.classList.toggle("hidden", isAdmin);
  els.adminActions.classList.toggle("hidden", !isAdmin);
  els.adminUserFilter.classList.toggle("hidden", !isAdmin);
  els.adminSummaryPanel.classList.toggle("hidden", !isAdmin);
  if (isAdmin) renderAdminControls();
  renderQr();
  renderDashboard();
  renderTodayStatus();
  renderTable();
  renderParticipantSummary();
}

function renderLogin() {
  els.loginView.classList.remove("hidden");
  els.appView.classList.add("hidden");
  els.logoutBtn.classList.add("hidden");
  els.sessionName.textContent = "Belum login";
}

function handlePendingQrAfterLogin() {
  const params = new URLSearchParams(window.location.search);
  const date = params.get("absen");
  const token = params.get("token");
  if (!date || !token || session?.role !== "user") return;

  if (date !== dateKey() || token !== dailyToken(date)) {
    setMessage(els.scanMessage, "Link QR sudah tidak berlaku untuk hari ini.", "error");
    return;
  }

  const result = upsertRecord(session.npm, date, "hadir", "scan qr");
  setMessage(els.scanMessage, result.message, result.ok ? "success" : "error");
  window.history.replaceState({}, document.title, window.location.pathname);
}

els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = els.usernameInput.value.trim();
  const password = els.passwordInput.value.trim();

  if (normalizeLogin(username) === ADMIN.username && password === ADMIN.password) {
    session = { role: "admin", name: ADMIN.name };
  } else {
    const user = USERS.find((item) => normalizeLogin(item.name) === normalizeLogin(username) && item.npm === password);
    if (!user) {
      setMessage(els.loginMessage, "Username atau password salah. Peserta login memakai nama lengkap sebagai username dan NPM sebagai password.", "error");
      return;
    }
    session = { role: "user", ...user };
  }

  saveSession();
  els.loginForm.reset();
  setMessage(els.loginMessage, "");
  renderApp();
  handlePendingQrAfterLogin();
  renderDashboard();
  renderTodayStatus();
  renderTable();
  renderParticipantSummary();
});

els.logoutBtn.addEventListener("click", () => {
  clearSession();
  renderLogin();
});

els.adminUserFilter.addEventListener("change", () => {
  renderDashboard();
  renderTable();
  renderParticipantSummary();
});

els.saveStatusBtn.addEventListener("click", () => {
  const result = upsertRecord(els.statusUserInput.value, els.statusDateInput.value, els.statusTypeInput.value, "input admin");
  setMessage(els.adminMessage, result.message, result.ok ? "success" : "error");
  renderDashboard();
  renderTodayStatus();
  renderTable();
  renderParticipantSummary();
});

els.exportExcelBtn.addEventListener("click", () => {
  const rows = buildRows(USERS.map((user) => user.npm));
  const headers = ["Tanggal", "Nama", "NPM", "Status", "Jam", "Keterangan"];
  const csv = [headers, ...rows.map((row) => [displayDate(row.date), row.name, row.npm, row.status, row.time, row.source])]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `absensi-kkn-gamalama-${dateKey()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

if (session) {
  renderApp();
  handlePendingQrAfterLogin();
  renderDashboard();
  renderTodayStatus();
  renderTable();
  renderParticipantSummary();
} else {
  renderLogin();
}

setInterval(() => {
  if (session) {
    renderQr();
    renderDashboard();
    renderTodayStatus();
    renderTable();
    renderParticipantSummary();
  }
}, 60000);
