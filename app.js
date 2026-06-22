const KKN_START = new Date(2026, 5, 22);
const KKN_DAYS = 40;
const ATTENDANCE_KEY = "kkn-gamalama-attendance-v3";
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
  hadirCount: document.querySelector("#hadirCount"),
  alpaCount: document.querySelector("#alpaCount"),
  izinCount: document.querySelector("#izinCount"),
  sakitCount: document.querySelector("#sakitCount"),
  progressLabel: document.querySelector("#progressLabel"),
  progressText: document.querySelector("#progressText"),
  progressBar: document.querySelector("#progressBar"),
  todayLabel: document.querySelector("#todayLabel"),
  scanMessage: document.querySelector("#scanMessage"),
  statusPanel: document.querySelector("#statusPanel"),
  todayStatus: document.querySelector("#todayStatus"),
  attendanceActions: document.querySelector("#attendanceActions"),
  checkInBtn: document.querySelector("#checkInBtn"),
  checkOutBtn: document.querySelector("#checkOutBtn"),
  permitForm: document.querySelector("#permitForm"),
  permitReasonInput: document.querySelector("#permitReasonInput"),
  adminActions: document.querySelector("#adminActions"),
  adminMessage: document.querySelector("#adminMessage"),
  statusDateInput: document.querySelector("#statusDateInput"),
  exportExcelBtn: document.querySelector("#exportExcelBtn"),
  tableTitle: document.querySelector("#tableTitle"),
  recordsBody: document.querySelector("#recordsBody"),
  actionHeader: document.querySelector("#actionHeader"),
  adminSummaryPanel: document.querySelector("#adminSummaryPanel"),
  participantGrid: document.querySelector("#participantGrid"),
  togglePasswordBtn: document.querySelector("#togglePasswordBtn"),
};

let records = loadJson(ATTENDANCE_KEY, []);
let session = loadJson(SESSION_KEY, null);
let pendingQr = getPendingQr();

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

function currentTime() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function ensureModernRecord(record) {
  if (!record) return null;
  if (!record.checkIn && record.time && record.status === "hadir") record.checkIn = record.time;
  if (!record.checkOut) record.checkOut = "";
  return record;
}

function upsertRecord(npm, date, status, source) {
  const user = getUser(npm);
  if (!user || !isKknDate(date)) return { ok: false, message: "Tanggal atau akun tidak valid." };

  const existing = ensureModernRecord(recordFor(npm, date));

  const payload = {
    npm,
    name: user.name,
    date,
    status,
    source,
    checkIn: status === "hadir" ? existing?.checkIn || currentTime() : "",
    checkOut: existing?.checkOut || "",
    reason: "",
    updatedAt: new Date().toISOString(),
  };

  if (existing) Object.assign(existing, payload);
  else records.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, ...payload });

  saveRecords();
  return { ok: true, message: status === "hadir" ? "Absensi berhasil. Anda tercatat hadir hari ini." : "Status berhasil disimpan." };
}

function saveAdminEdit(npm, date, status, checkIn, checkOut) {
  const user = getUser(npm);
  if (!user || !isKknDate(date)) return { ok: false, message: "Tanggal atau akun tidak valid." };

  const existing = ensureModernRecord(recordFor(npm, date));
  if (!status || status === "alpa") {
    records = records.filter((record) => !(record.npm === npm && record.date === date));
    saveRecords();
    return { ok: true, message: "Riwayat tanggal ini dikosongkan." };
  }

  if ((checkIn || checkOut) && status !== "hadir") return { ok: false, message: "Jam masuk/pulang hanya dipakai untuk status hadir." };
  if (checkOut && !checkIn) return { ok: false, message: "Isi jam masuk sebelum jam pulang." };

  const payload = {
    npm,
    name: user.name,
    date,
    status,
    source: "edit admin",
    checkIn: status === "hadir" ? checkIn : "",
    checkOut: status === "hadir" ? checkOut : "",
    reason: existing?.reason || "",
    updatedAt: new Date().toISOString(),
  };

  if (existing) Object.assign(existing, payload);
  else records.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, ...payload });

  saveRecords();
  return { ok: true, message: "Perubahan absensi berhasil disimpan." };
}

function savePermit(npm, date, status, reason) {
  const user = getUser(npm);
  const cleanReason = reason.trim();
  if (!user || !isKknDate(date)) return { ok: false, message: "Tanggal atau akun tidak valid." };
  if (!["izin", "sakit"].includes(status)) return { ok: false, message: "Pilih izin atau sakit." };
  if (cleanReason.length < 5) return { ok: false, message: "Alasan minimal 5 karakter." };

  const existing = ensureModernRecord(recordFor(npm, date));
  const payload = {
    npm,
    name: user.name,
    date,
    status,
    source: "keterangan peserta",
    checkIn: "",
    checkOut: "",
    reason: cleanReason,
    updatedAt: new Date().toISOString(),
  };

  if (existing) Object.assign(existing, payload);
  else records.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, ...payload });

  saveRecords();
  return { ok: true, message: `Keterangan ${status} berhasil dikirim.` };
}

function checkIn(npm, date) {
  const user = getUser(npm);
  if (!user || !isKknDate(date)) return { ok: false, message: "Tanggal atau akun tidak valid." };
  const existing = ensureModernRecord(recordFor(npm, date));
  if (existing?.checkIn) return { ok: false, message: "Anda sudah absen datang hari ini." };

  const payload = {
    npm,
    name: user.name,
    date,
    status: "hadir",
    source: "scan qr",
    checkIn: currentTime(),
    checkOut: existing?.checkOut || "",
    reason: "",
    updatedAt: new Date().toISOString(),
  };

  if (existing) Object.assign(existing, payload);
  else records.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, ...payload });
  saveRecords();
  return { ok: true, message: "Absen datang berhasil disimpan." };
}

function checkOut(npm, date) {
  const existing = ensureModernRecord(recordFor(npm, date));
  if (!existing || existing.status !== "hadir" || !existing.checkIn) return { ok: false, message: "Absen datang dulu sebelum absen pulang." };
  if (existing.checkOut) return { ok: false, message: "Anda sudah absen pulang hari ini." };

  existing.checkOut = currentTime();
  existing.updatedAt = new Date().toISOString();
  saveRecords();
  return { ok: true, message: "Absen pulang berhasil disimpan." };
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

function getPendingQr() {
  const params = new URLSearchParams(window.location.search);
  const date = params.get("absen");
  const token = params.get("token");
  if (!date || !token) return null;
  return { date, token };
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
        checkIn: record?.checkIn || record?.time || "-",
        checkOut: record?.checkOut || "-",
        reason: record?.reason || "-",
        source: record?.source || "otomatis",
      };
    });
  });
}

function summaryFor(npmList) {
  const counts = { hadir: 0, alpa: 0, izin: 0, sakit: 0 };
  const rows = session?.role === "admin" ? records.filter((record) => npmList.includes(record.npm)) : buildRows(npmList);
  rows.forEach((row) => {
    counts[row.status] += 1;
  });
  return counts;
}

function currentNpmList() {
  if (!session) return [];
  if (session.role === "user") return [session.npm];
  return USERS.map((user) => user.npm);
}

function selectedAdminDate() {
  return els.statusDateInput.value || dateKey();
}

function isFutureDate(key) {
  return key > dateKey();
}

function renderDateLabel() {
  const today = dateKey();
  els.todayLabel.textContent = `${displayDate(today)} | Hari ${Math.max(1, Math.min(KKN_DAYS, kknDayNumber()))}`;
}

function renderDashboard() {
  const npmList = currentNpmList();
  const counts = summaryFor(npmList);
  const totalDone = counts.hadir + counts.izin + counts.sakit;
  const totalSlots = Math.max(1, elapsedKknDates().length * Math.max(1, npmList.length));
  const progress = Math.round((totalDone / totalSlots) * 100);

  els.progressLabel.textContent = session?.role === "admin" ? "Progres hari berjalan" : "Progres absensi saya";
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
  const record = ensureModernRecord(recordFor(session.npm, dateKey()));
  const status = record?.status || "belum absen";
  els.todayStatus.textContent = status === "hadir" ? `Hadir | Masuk ${record.checkIn || "-"} | Pulang ${record.checkOut || "-"}` : status;
  els.todayStatus.className = `today-status ${record?.status || ""}`;
  els.attendanceActions.classList.toggle("hidden", !pendingQr);
  els.permitForm.classList.toggle("hidden", !pendingQr);
}

function renderTable() {
  const isAdmin = session?.role === "admin";
  const rows = (isAdmin ? buildRowsForAdminDate() : buildRows(currentNpmList())).sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    return byDate || a.name.localeCompare(b.name);
  });
  if (rows.length === 0) {
    els.recordsBody.innerHTML = `<tr><td colspan="${isAdmin ? 8 : 7}">Belum ada data absensi.</td></tr>`;
    return;
  }
  els.actionHeader.classList.toggle("hidden", !isAdmin);
  els.recordsBody.innerHTML = rows
    .map(
      (row) => `<tr>
        <td>${displayDate(row.date)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.npm)}</td>
        ${isAdmin ? adminEditableCells(row) : readonlyCells(row)}
      </tr>`,
    )
    .join("");
}

function buildRowsForAdminDate() {
  const date = selectedAdminDate();
  return USERS.map((user) => {
    const record = recordFor(user.npm, date);
    const future = isFutureDate(date);
    return {
      date,
      npm: user.npm,
      name: user.name,
      status: future ? "" : record?.status || "",
      checkIn: future ? "" : record?.checkIn || record?.time || "",
      checkOut: future ? "" : record?.checkOut || "",
      reason: future ? "" : record?.reason || "",
      source: record?.source || (future ? "" : "otomatis"),
    };
  });
}

function readonlyCells(row) {
  return `
    <td>${escapeHtml(row.checkIn)}</td>
    <td>${escapeHtml(row.checkOut)}</td>
    <td class="status ${escapeHtml(row.status)}">${escapeHtml(row.status)}</td>
    <td>${escapeHtml(row.reason)}</td>
  `;
}

function adminEditableCells(row) {
  const statusOptions = ["", "hadir", "izin", "sakit", "alpa"]
    .map((status) => `<option value="${status}" ${row.status === status ? "selected" : ""}>${status || "Kosong"}</option>`)
    .join("");
  return `
    <td><input class="table-input" data-field="checkIn" data-npm="${escapeHtml(row.npm)}" type="time" value="${escapeHtml(row.checkIn)}" /></td>
    <td><input class="table-input" data-field="checkOut" data-npm="${escapeHtml(row.npm)}" type="time" value="${escapeHtml(row.checkOut)}" /></td>
    <td><select class="table-input status-select" data-field="status" data-npm="${escapeHtml(row.npm)}">${statusOptions}</select></td>
    <td>${escapeHtml(row.reason || "-")}</td>
    <td><button class="row-save" type="button" data-npm="${escapeHtml(row.npm)}">Simpan</button></td>
  `;
}

function adminRowValue(npm, field) {
  return Array.from(els.recordsBody.querySelectorAll(`[data-field="${field}"]`)).find((input) => input.dataset.npm === npm)?.value || "";
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
  if (!els.statusDateInput.value) els.statusDateInput.value = dateKey();
  els.statusDateInput.min = dateKey(KKN_START);
  els.statusDateInput.max = dateKey(kknEndDate());
}

function renderApp() {
  const isAdmin = session?.role === "admin";
  els.loginView.classList.add("hidden");
  els.appView.classList.remove("hidden");
  els.appView.classList.toggle("admin-layout", isAdmin);
  els.appView.classList.toggle("user-layout", !isAdmin);
  els.logoutBtn.classList.remove("hidden");
  els.sessionName.textContent = isAdmin ? "Admin" : `${session.name} (${session.npm})`;
  els.dashboardTitle.textContent = isAdmin ? "Rekap Semua Peserta" : `Rekap ${session.name}`;
  els.tableTitle.textContent = isAdmin ? "Riwayat Semua Peserta" : "Riwayat Absensi Saya";
  els.statusPanel.classList.toggle("hidden", isAdmin);
  els.adminActions.classList.toggle("hidden", !isAdmin);
  els.adminSummaryPanel.classList.toggle("hidden", !isAdmin);
  if (isAdmin) renderAdminControls();
  renderDateLabel();
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
  if (!pendingQr || session?.role !== "user") return;
  const { date, token } = pendingQr;

  if (date !== dateKey() || token !== dailyToken(date)) {
    setMessage(els.scanMessage, "Link QR sudah tidak berlaku untuk hari ini.", "error");
    return;
  }

  els.attendanceActions.classList.remove("hidden");
  setMessage(els.scanMessage, "Silakan pilih Absen Datang atau Absen Pulang.", "success");
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

els.togglePasswordBtn.addEventListener("click", () => {
  const showPassword = els.passwordInput.type === "password";
  els.passwordInput.type = showPassword ? "text" : "password";
  els.togglePasswordBtn.setAttribute("aria-label", showPassword ? "Sembunyikan sandi" : "Lihat sandi");
  els.togglePasswordBtn.setAttribute("title", showPassword ? "Sembunyikan sandi" : "Lihat sandi");
});

els.statusDateInput.addEventListener("change", () => {
  renderDashboard();
  renderTable();
  renderParticipantSummary();
});

els.recordsBody.addEventListener("click", (event) => {
  const button = event.target.closest(".row-save");
  if (!button || session?.role !== "admin") return;

  const npm = button.dataset.npm;
  const date = selectedAdminDate();
  const status = adminRowValue(npm, "status");
  const checkIn = adminRowValue(npm, "checkIn");
  const checkOut = adminRowValue(npm, "checkOut");
  const result = saveAdminEdit(npm, date, status, checkIn, checkOut);
  setMessage(els.adminMessage, result.message, result.ok ? "success" : "error");
  renderDashboard();
  renderTable();
  renderParticipantSummary();
});

els.checkInBtn.addEventListener("click", () => {
  if (!pendingQr || session?.role !== "user") return;
  const result = checkIn(session.npm, pendingQr.date);
  setMessage(els.scanMessage, result.message, result.ok ? "success" : "error");
  renderDashboard();
  renderTodayStatus();
  renderTable();
});

els.checkOutBtn.addEventListener("click", () => {
  if (!pendingQr || session?.role !== "user") return;
  const result = checkOut(session.npm, pendingQr.date);
  setMessage(els.scanMessage, result.message, result.ok ? "success" : "error");
  renderDashboard();
  renderTodayStatus();
  renderTable();
});

els.permitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!pendingQr || session?.role !== "user") return;
  const permitType = new FormData(els.permitForm).get("permitType");
  const result = savePermit(session.npm, pendingQr.date, permitType, els.permitReasonInput.value);
  setMessage(els.scanMessage, result.message, result.ok ? "success" : "error");
  if (result.ok) els.permitForm.reset();
  renderDashboard();
  renderTodayStatus();
  renderTable();
});

els.exportExcelBtn.addEventListener("click", () => {
  const rows = records
    .filter((record) => USERS.some((user) => user.npm === record.npm))
    .map((record) => ({
      ...record,
      checkIn: record.checkIn || record.time || "",
      checkOut: record.checkOut || "",
      reason: record.reason || "",
    }));
  const headers = ["Tanggal", "Nama", "NPM", "Jam Masuk", "Jam Pulang", "Status", "Alasan"];
  const csv = [headers, ...rows.map((row) => [displayDate(row.date), row.name, row.npm, row.checkIn, row.checkOut, row.status, row.reason])]
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
    renderDateLabel();
    renderDashboard();
    renderTodayStatus();
    renderTable();
    renderParticipantSummary();
  }
}, 60000);
