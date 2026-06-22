const KKN_START = new Date(2026, 5, 22);
const KKN_DAYS = 40;
const SITE_URL = "https://absen-kkn-gamalama-2026.vercel.app/";

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

function kknDayNumber(date = new Date()) {
  const start = new Date(KKN_START.getFullYear(), KKN_START.getMonth(), KKN_START.getDate());
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - start) / 86400000) + 1;
}

function dailyToken(key = dateKey()) {
  let hash = 0;
  const text = `GAMALAMA-2026-${key}`;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  return hash.toString(36).toUpperCase();
}

function attendanceLink() {
  const url = new URL(SITE_URL);
  url.searchParams.set("absen", dateKey());
  url.searchParams.set("token", dailyToken());
  return url.toString();
}

let activeDate = "";

function renderQr() {
  const today = dateKey();
  const day = Math.max(1, Math.min(KKN_DAYS, kknDayNumber()));
  const link = attendanceLink();
  const qrBox = document.querySelector("#externalQr");

  activeDate = today;
  document.querySelector("#qrDate").textContent = `${displayDate(today)} | Hari ${day}`;
  qrBox.innerHTML = "";

  if (window.QRCode) {
    new QRCode(qrBox, {
      text: link,
      width: 240,
      height: 240,
      correctLevel: QRCode.CorrectLevel.M,
    });
  } else {
    qrBox.textContent = "QR gagal dimuat.";
  }
}

renderQr();

setInterval(() => {
  if (dateKey() !== activeDate) renderQr();
}, 60000);
