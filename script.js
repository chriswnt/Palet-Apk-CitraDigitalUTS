/* Palet — JavaScript murni. Color Thief 2.6.0 disimpan di folder vendor. */
"use strict";

const $ = (id) => document.getElementById(id);
const MAX_BYTES = 15 * 1024 * 1024;
const COLOR_COUNT = 6;
const ACCEPTED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/bmp"
]);
const state = { requestId: 0, objectUrl: null, colors: [], dominant: null, busy: false };
let toastTimer;

function setError(message = "") {
  $("error-message").textContent = message;
  $("error-message").hidden = !message;
}

function setBusy(busy) {
  state.busy = busy;
  $("loading-overlay").hidden = !busy;
  $("palette-panel").setAttribute("aria-busy", String(busy));
  $("url-button").disabled = busy;
  $("copy-all-button").disabled = busy;
  $("copy-dominant-button").disabled = busy;
  $("swatch-grid").querySelectorAll("button").forEach((button) => { button.disabled = busy; });
  if (busy) $("status-message").textContent = "Sedang membaca gambar dan mengambil palet warna.";
}

function rgbToHex(rgb) {
  return "#" + rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Harus diatur sebelum src agar piksel gambar lintas situs dapat dibaca.
    if (/^https?:/i.test(source)) img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    const timer = setTimeout(() => {
      img.onload = img.onerror = null;
      img.src = "";
      reject(new Error("Gambar terlalu lama dimuat. Coba unduh lalu unggah dari perangkat."));
    }, 15000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Gambar tidak bisa dibaca. Untuk tautan, pastikan URL langsung ke gambar dan situs mengizinkan akses CORS. Kamu juga bisa mengunduh lalu mengunggahnya."));
    };
    img.src = source;
  });
}

function extractPalette(img) {
  if (typeof ColorThief !== "function") {
    throw new Error("Color Thief belum tersedia. Pastikan folder vendor ikut diekstrak bersama index.html.");
  }
  // Batasi ukuran analisis agar foto besar tetap cepat diproses.
  const scale = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const unique = new Map();
  let visible = 0;
  let eligible = 0;
  let sum = [0, 0, 0];
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 125) continue;
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    visible++;
    rgb.forEach((value, channel) => { sum[channel] += value; });
    if (!(rgb[0] > 250 && rgb[1] > 250 && rgb[2] > 250)) eligible++;
    // Hanya perlu mengetahui apakah gambar benar-benar satu warna.
    if (unique.size < 2) unique.set(rgb.join(","), rgb);
  }
  if (!visible) throw new Error("Gambar ini sepenuhnya transparan atau sangat transparan. Pilih gambar dengan warna yang terlihat.");
  // Color Thief 2 mengabaikan putih mendekati murni. Tangani kasus khusus
  // satu warna/putih secara langsung agar tidak menghasilkan palet palsu.
  if (unique.size === 1 || eligible === 0) {
    const rgb = unique.size === 1 ? [...unique.values()][0] : sum.map((value) => value / visible);
    const hex = rgbToHex(rgb);
    return { colors: [hex], dominant: hex, preview: canvas.toDataURL("image/png") };
  }
  const thief = new ColorThief();
  // Canvas tidak mempunyai naturalWidth, jadi adaptor memberi ukuran yang
  // dipakai Color Thief saat menyalin sumber canvas ke canvas internalnya.
  canvas.naturalWidth = canvas.width;
  canvas.naturalHeight = canvas.height;
  const quality = visible < 10000 || eligible < 1000 ? 1 : 5;
  const palette = thief.getPalette(canvas, COLOR_COUNT, quality);
  if (!palette || !palette.length) throw new Error("Warna belum dapat diambil. Coba gambar lain dengan area berwarna lebih besar.");
  return {
    colors: [...new Set(palette.map(rgbToHex))],
    dominant: rgbToHex(thief.getColor(canvas, quality)),
    preview: canvas.toDataURL("image/png")
  };
}

function renderPalette() {
  $("color-ribbon").replaceChildren();
  $("swatch-grid").replaceChildren();
  state.colors.forEach((hex) => {
    const strip = document.createElement("span");
    strip.style.backgroundColor = hex;
    $("color-ribbon").append(strip);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.setAttribute("aria-label", `Salin warna ${hex}`);
    const color = document.createElement("span");
    color.className = "swatch-color";
    color.style.backgroundColor = hex;
    const label = document.createElement("span");
    label.className = "swatch-label";
    label.textContent = hex;
    button.append(color, label);
    button.addEventListener("click", () => copyText(hex));
    $("swatch-grid").append(button);
  });
  $("dominant-chip").style.backgroundColor = state.dominant;
  $("dominant-hex").textContent = state.dominant;
  $("color-count").textContent = `${state.colors.length} warna`;
  $("empty-palette").hidden = true;
  $("palette-result").hidden = false;
}

async function processSource(source, name, objectUrl = null) {
  const requestId = ++state.requestId;
  setError();
  setBusy(true);
  try {
    const img = await loadImage(source);
    if (requestId !== state.requestId) return;
    // Beri browser kesempatan menampilkan status loading sebelum analisis.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (requestId !== state.requestId) return;
    const result = extractPalette(img);
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = objectUrl;
    state.colors = result.colors;
    state.dominant = result.dominant;
    // Pratinjau memakai frame yang sama dengan analisis (termasuk GIF).
    $("preview-image").src = result.preview;
    $("preview-image").alt = `Pratinjau ${name}`;
    $("preview-wrapper").hidden = false;
    $("upload-prompt").hidden = true;
    $("drop-zone").classList.add("has-image");
    $("reset-button").hidden = false;
    $("file-name").textContent = name;
    $("file-name").title = name;
    $("image-dimensions").textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
    renderPalette();
    $("status-message").textContent = `${state.colors.length} warna berhasil diambil dari ${name}.`;
  } catch (error) {
    if (requestId === state.requestId) {
      setError(error.name === "SecurityError" ? "Situs sumber tidak mengizinkan pembacaan warna. Unduh gambar lalu unggah dari perangkat." : error.message);
      $("status-message").textContent = "Gambar baru gagal diproses. Pilih gambar lain.";
    }
  } finally {
    if (objectUrl && objectUrl !== state.objectUrl) URL.revokeObjectURL(objectUrl);
    if (requestId === state.requestId) setBusy(false);
  }
}

function handleFile(file) {
  if (!file) return;
  if (!ACCEPTED_TYPES.has(file.type)) return setError("Format belum didukung. Pilih JPG, PNG, WebP, GIF, AVIF, atau BMP.");
  if (file.size > MAX_BYTES) return setError("Ukuran gambar melebihi 15 MB. Pilih atau kompres gambar yang lebih kecil.");
  $("image-url").value = "";
  const source = URL.createObjectURL(file);
  return processSource(source, file.name, source);
}

function reset() {
  ++state.requestId;
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  Object.assign(state, { objectUrl: null, colors: [], dominant: null });
  setBusy(false);
  setError();
  $("preview-image").removeAttribute("src");
  $("preview-wrapper").hidden = true;
  $("upload-prompt").hidden = false;
  $("empty-palette").hidden = false;
  $("palette-result").hidden = true;
  $("reset-button").hidden = true;
  $("drop-zone").classList.remove("has-image");
  $("file-input").value = $("image-url").value = "";
  $("file-name").textContent = "Belum ada gambar";
  $("file-name").removeAttribute("title");
  $("image-dimensions").textContent = "—";
  $("color-count").textContent = "0 warna";
  $("status-message").textContent = "Gambar dan palet dihapus.";
  $("upload-button").focus();
}

async function copyText(text) {
  if (!text || state.busy) return;
  try {
    // execCommand menjadi fallback untuk browser yang membuka file lokal.
    try { await navigator.clipboard.writeText(text); }
    catch {
      const previousFocus = document.activeElement;
      const field = document.createElement("textarea");
      field.value = text;
      field.className = "sr-only";
      document.body.append(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      previousFocus?.focus();
      if (!copied) throw new Error("Salin otomatis tidak tersedia. Pilih kode HEX lalu salin secara manual.");
    }
    $("toast").textContent = text.includes("\n") ? "Semua kode HEX tersalin" : `${text} tersalin`;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; }, 2500);
  } catch (error) { setError(error.message); }
}

$("upload-button").addEventListener("click", () => $("file-input").click());
$("change-button").addEventListener("click", () => $("file-input").click());
$("file-input").addEventListener("change", (event) => {
  handleFile(event.target.files[0]);
  event.target.value = "";
});
$("reset-button").addEventListener("click", reset);
$("copy-all-button").addEventListener("click", () => copyText(state.colors.join("\n")));
$("copy-dominant-button").addEventListener("click", () => copyText(state.dominant));
$("url-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const url = new URL($("image-url").value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
    if (location.protocol === "https:" && url.protocol !== "https:") return setError("Gunakan tautan HTTPS agar gambar dapat dibuka dengan aman di halaman ini.");
    processSource(url.href, "Gambar dari " + url.hostname);
  } catch { setError("Masukkan tautan gambar yang valid, diawali https://."); }
});

// Cegah browser membuka berkas saat gambar dilepas di luar area unggah.
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());
$("drop-zone").addEventListener("dragover", (event) => {
  event.preventDefault();
  $("drop-zone").classList.add("is-dragging");
});
$("drop-zone").addEventListener("dragleave", (event) => {
  if (!$("drop-zone").contains(event.relatedTarget)) $("drop-zone").classList.remove("is-dragging");
});
$("drop-zone").addEventListener("drop", (event) => {
  event.preventDefault();
  $("drop-zone").classList.remove("is-dragging");
  handleFile(event.dataTransfer.files[0]);
});

// Opsional: browser yang mendukung WebMCP dapat membaca hasil yang terlihat.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: "get_image_palette",
      title: "Baca palet gambar",
      description: "Membaca palet HEX dari gambar yang sudah dipilih pengguna di halaman ini.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input) {
        if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new Error("Masukan harus berupa objek kosong.");
        if (state.busy) throw new Error("Gambar masih diproses.");
        if (!state.colors.length) throw new Error("Pilih gambar terlebih dahulu.");
        return { source: $("file-name").textContent, colors: [...state.colors], dominant: state.dominant };
      }
    }, { signal: lifecycle.signal })).catch(() => {});
    window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
  } catch { /* Dukungan opsional; antarmuka tetap berjalan tanpa WebMCP. */ }
}
