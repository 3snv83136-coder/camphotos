(() => {
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const playerWrap = document.getElementById("playerWrap");
  const emptyState = document.getElementById("emptyState");
  const hud = document.getElementById("hud");
  const timecode = document.getElementById("timecode");
  const statusEl = document.getElementById("status");
  const captureBtn = document.getElementById("captureBtn");
  const capturesEl = document.getElementById("captures");
  const captureCount = document.getElementById("captureCount");
  const videoInput = document.getElementById("videoInput");
  const videoInputEmpty = document.getElementById("videoInputEmpty");
  const folderBtn = document.getElementById("folderBtn");
  const openFolderBtn = document.getElementById("openFolderBtn");
  const folderLabel = document.getElementById("folderLabel");
  const hint = document.getElementById("hint");
  const speedDown = document.getElementById("speedDown");
  const speedUp = document.getElementById("speedUp");
  const speedBtn = document.getElementById("speedBtn");
  const closeVideoBtn = document.getElementById("closeVideoBtn");
  const closeVideoSideBtn = document.getElementById("closeVideoSideBtn");

  const api = window.camphotos;
  const isElectron = Boolean(api?.isElectron);

  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
  let speedIndex = SPEEDS.indexOf(1);

  let objectUrl = null;
  let capturing = false;
  let dirHandle = null;
  const sessionCaptures = [];

  function formatSpeed(rate) {
    return `${rate}×`;
  }

  function applySpeed() {
    const rate = SPEEDS[speedIndex];
    video.playbackRate = rate;
    speedBtn.textContent = formatSpeed(rate);
    speedDown.disabled = !video.src || speedIndex <= 0;
    speedUp.disabled = !video.src || speedIndex >= SPEEDS.length - 1;
    speedBtn.disabled = !video.src;
  }

  function changeSpeed(delta) {
    if (!video.src) return;
    const next = speedIndex + delta;
    if (next < 0 || next >= SPEEDS.length) return;
    speedIndex = next;
    applySpeed();
    showStatus(`Vitesse ${formatSpeed(SPEEDS[speedIndex])}`);
  }

  function stampName() {
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .replace("T", "_")
      .slice(0, 19);
    return `capture_${stamp}.png`;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "00:00";
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  function updateTimecode() {
    timecode.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  }

  function showStatus(message, ms = 2800) {
    statusEl.textContent = message;
    statusEl.classList.add("show");
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => statusEl.classList.remove("show"), ms);
  }

  function shortPath(p) {
    if (!p) return "";
    const home = "/Users/";
    if (p.includes("/Documents/")) {
      return "Documents/" + p.split("/Documents/")[1];
    }
    return p.length > 48 ? `…${p.slice(-46)}` : p;
  }

  async function refreshElectronFolderLabel() {
    if (!isElectron) return;
    const dir = await api.getCaptureDir();
    folderLabel.textContent = `Dossier · ${shortPath(dir)}`;
    folderLabel.classList.add("ready");
    openFolderBtn.hidden = false;
  }

  function setVideoUiOpen(open) {
    closeVideoBtn.hidden = !open;
    closeVideoSideBtn.hidden = !open;
  }

  function closeVideo() {
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (objectUrl && objectUrl.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrl);
    }
    objectUrl = null;
    playerWrap.classList.remove("has-video");
    emptyState.hidden = false;
    hud.hidden = true;
    captureBtn.disabled = true;
    timecode.textContent = "00:00 / 00:00";
    setVideoUiOpen(false);
    applySpeed();
    showStatus("Vidéo fermée — choisis-en une autre");
  }

  function loadVideoFromUrl(url, displayName, converted = false) {
    if (objectUrl && objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
    objectUrl = url.startsWith("blob:") ? url : null;
    video.src = url;
    video.controls = true;
    playerWrap.classList.add("has-video");
    emptyState.hidden = true;
    hud.hidden = false;
    captureBtn.disabled = false;
    setVideoUiOpen(true);
    applySpeed();
    video.play().catch(() => {});
    showStatus(converted ? `${displayName} (converti)` : displayName);
  }

  function loadVideo(file) {
    if (!file) return;
    if (objectUrl && objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    loadVideoFromUrl(objectUrl, file.name, false);
  }

  async function openVideoElectron(filePath) {
    showStatus("Ouverture / conversion AVI…", 60000);
    captureBtn.disabled = true;
    const result = await api.openVideoPath(filePath);
    if (!result?.ok) {
      showStatus(result?.error || "Impossible d’ouvrir ce fichier", 5000);
      return;
    }
    loadVideoFromUrl(result.url, result.name, result.converted);
  }

  async function pickVideoElectron(event) {
    event?.preventDefault();
    event?.stopPropagation();
    const result = await api.pickVideo();
    if (result?.canceled) return;
    if (!result?.ok) {
      showStatus(result?.error || "Impossible d’ouvrir ce fichier", 5000);
      return;
    }
    loadVideoFromUrl(result.url, result.name, result.converted);
  }

  speedDown.addEventListener("click", () => changeSpeed(-1));
  speedUp.addEventListener("click", () => changeSpeed(1));
  speedBtn.addEventListener("click", () => {
    if (!video.src) return;
    speedIndex = SPEEDS.indexOf(1);
    applySpeed();
    showStatus("Vitesse 1×");
  });
  closeVideoBtn.addEventListener("click", closeVideo);
  closeVideoSideBtn.addEventListener("click", closeVideo);

  async function onFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (isElectron && file.path) {
      await openVideoElectron(file.path);
      return;
    }

    const isAvi = /\.avi$/i.test(file.name) || file.type === "video/x-msvideo" || file.type === "video/avi";
    if (!isElectron && isAvi) {
      showStatus("AVI peu supporté dans le navigateur — utilise l’app Mac");
    }
    loadVideo(file);
  }

  videoInput.addEventListener("change", onFileChange);
  videoInputEmpty.addEventListener("change", onFileChange);

  if (isElectron) {
    document.querySelectorAll('label.file-btn').forEach((label) => {
      label.addEventListener("click", pickVideoElectron);
    });
  }

  video.addEventListener("timeupdate", updateTimecode);
  video.addEventListener("loadedmetadata", updateTimecode);
  video.addEventListener("error", () => {
    showStatus("Lecture impossible (codec). Sur Mac, ouvre via l’app pour convertir l’AVI.");
  });

  function renderCaptures() {
    captureCount.textContent = String(sessionCaptures.length);
    capturesEl.innerHTML = sessionCaptures
      .map(
        (c) => `
        <a class="capture-card" href="${c.url}" download="${c.filename}" title="${c.filename}">
          <img src="${c.url}" alt="${c.filename}" loading="lazy" />
          <span>${c.filename}</span>
        </a>`
      )
      .join("");
  }

  async function pickFolder() {
    if (isElectron) {
      const dir = await api.pickFolder();
      if (!dir) return;
      folderLabel.textContent = `Dossier · ${shortPath(dir)}`;
      folderLabel.classList.add("ready");
      showStatus(`Dossier prêt · ${shortPath(dir)}`);
      return;
    }

    if (!window.showDirectoryPicker) {
      showStatus("Navigateur non supporté — les captures seront téléchargées");
      folderLabel.textContent = "Téléchargements du navigateur";
      return;
    }
    try {
      dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      folderLabel.textContent = `Dossier · ${dirHandle.name}`;
      folderLabel.classList.add("ready");
      showStatus(`Dossier prêt · ${dirHandle.name}`);
    } catch (err) {
      if (err?.name !== "AbortError") {
        showStatus("Impossible d’ouvrir le dossier");
      }
    }
  }

  folderBtn.addEventListener("click", pickFolder);
  openFolderBtn?.addEventListener("click", () => api?.openCaptureDir());

  async function saveToFolder(blob, filename) {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function saveCapture(blob, filename) {
    if (isElectron) {
      const buffer = await blob.arrayBuffer();
      const result = await api.saveCapture(buffer, filename);
      if (!result?.ok) throw new Error(result?.error || "Échec enregistrement");
      return "Mac";
    }

    if (dirHandle) {
      try {
        await saveToFolder(blob, filename);
        return "dossier";
      } catch {
        /* fall through */
      }
    }

    try {
      const form = new FormData();
      form.append("photo", blob, filename);
      const res = await fetch("/api/capture", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) return "serveur";
      }
    } catch {
      /* pas de serveur local */
    }

    downloadBlob(blob, filename);
    return "téléchargement";
  }

  async function capturePhoto() {
    if (capturing || captureBtn.disabled || !video.videoWidth) return;

    capturing = true;
    captureBtn.classList.add("flash");
    setTimeout(() => captureBtn.classList.remove("flash"), 120);

    const wasPlaying = !video.paused;
    if (wasPlaying) video.pause();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Capture impossible"))),
          "image/png"
        );
      });

      const filename = stampName();
      const where = await saveCapture(blob, filename);
      const url = URL.createObjectURL(blob);
      sessionCaptures.unshift({ filename, url });
      renderCaptures();
      showStatus(`Enregistré (${where}) · ${filename}`);
    } catch (err) {
      showStatus(err.message || "Échec de la capture");
    } finally {
      capturing = false;
      if (wasPlaying) video.play().catch(() => {});
    }
  }

  captureBtn.addEventListener("click", capturePhoto);

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, button")) return;
    if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      capturePhoto();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (video.src) closeVideo();
    }
    if (e.key === "<" || e.key === ",") {
      e.preventDefault();
      changeSpeed(-1);
    }
    if (e.key === ">" || e.key === ".") {
      e.preventDefault();
      changeSpeed(1);
    }
  });

  ["dragenter", "dragover"].forEach((type) => {
    playerWrap.addEventListener(type, (e) => {
      e.preventDefault();
      playerWrap.style.outline = "2px solid var(--accent)";
    });
  });

  ["dragleave", "drop"].forEach((type) => {
    playerWrap.addEventListener(type, (e) => {
      e.preventDefault();
      playerWrap.style.outline = "";
    });
  });

  playerWrap.addEventListener("drop", async (e) => {
    const file = [...(e.dataTransfer?.files || [])].find(
      (f) => f.type.startsWith("video/") || /\.(avi|mp4|mov|mkv|wmv|mpg|mpeg|webm)$/i.test(f.name)
    );
    if (!file) return;
    if (isElectron && file.path) {
      await openVideoElectron(file.path);
      return;
    }
    loadVideo(file);
  });

  if (isElectron) {
    hint.innerHTML =
      "Les photos sont enregistrées sur ton Mac dans <code>Documents/CAMPHOTOS/captures</code> (modifiable). Les AVI sont convertis automatiquement.";
    refreshElectronFolderLabel();
    api.onVideoStatus?.((msg) => showStatus(msg, 60000));
  } else if (!window.showDirectoryPicker) {
    folderBtn.disabled = true;
    folderLabel.textContent = "Téléchargements (Chrome/Edge recommandé)";
  }

  // Bannière / bouton installateur Mac (web uniquement)
  const installBanner = document.getElementById("installBanner");
  const installMacHeaderBtn = document.getElementById("installMacHeaderBtn");
  const dismissInstallBtn = document.getElementById("dismissInstallBtn");
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform) || navigator.userAgent.includes("Mac");

  if (!isElectron && isMac) {
    installMacHeaderBtn.hidden = false;
    if (!sessionStorage.getItem("camphotos-hide-install")) {
      installBanner.hidden = false;
    }
  }

  dismissInstallBtn?.addEventListener("click", () => {
    installBanner.hidden = true;
    sessionStorage.setItem("camphotos-hide-install", "1");
  });
})();
