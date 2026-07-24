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
  const folderLabel = document.getElementById("folderLabel");

  let objectUrl = null;
  let capturing = false;
  let dirHandle = null;
  const sessionCaptures = [];

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

  function showStatus(message) {
    statusEl.textContent = message;
    statusEl.classList.add("show");
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => statusEl.classList.remove("show"), 2200);
  }

  function loadVideo(file) {
    if (!file) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.controls = true;
    playerWrap.classList.add("has-video");
    emptyState.hidden = true;
    hud.hidden = false;
    captureBtn.disabled = false;
    video.play().catch(() => {});
    showStatus(file.name);
  }

  function onFileChange(event) {
    const file = event.target.files?.[0];
    loadVideo(file);
    event.target.value = "";
  }

  videoInput.addEventListener("change", onFileChange);
  videoInputEmpty.addEventListener("change", onFileChange);
  video.addEventListener("timeupdate", updateTimecode);
  video.addEventListener("loadedmetadata", updateTimecode);

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
    if (dirHandle) {
      try {
        await saveToFolder(blob, filename);
        return "dossier";
      } catch {
        // permission may have expired — fall through
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

  playerWrap.addEventListener("drop", (e) => {
    const file = [...(e.dataTransfer?.files || [])].find((f) =>
      f.type.startsWith("video/")
    );
    if (file) loadVideo(file);
  });

  if (!window.showDirectoryPicker) {
    folderBtn.disabled = true;
    folderLabel.textContent = "Téléchargements (Chrome/Edge recommandé)";
  }
})();
