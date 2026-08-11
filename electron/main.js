const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { pathToFileURL } = require("url");

let mainWindow = null;
let captureDir = path.join(app.getPath("documents"), "CAMPHOTOS", "captures");
const convertedFiles = new Set();

function ensureCaptureDir() {
  fs.mkdirSync(captureDir, { recursive: true });
}

function getFfmpegPath() {
  let ffmpegPath = require("ffmpeg-static");
  if (ffmpegPath.includes("app.asar")) {
    ffmpegPath = ffmpegPath.replace("app.asar", "app.asar.unpacked");
  }
  return ffmpegPath;
}

function needsConversion(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return [".avi", ".wmv", ".mpg", ".mpeg", ".flv", ".mkv", ".ts", ".m2ts", ".3gp"].includes(ext);
}

function runFfmpeg(inputPath, outputPath) {
  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    return Promise.reject(new Error("ffmpeg introuvable"));
  }

  const attempts = [
    ["-y", "-i", inputPath, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", outputPath],
    ["-y", "-i", inputPath, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", outputPath],
  ];

  function tryOnce(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0 && fs.existsSync(outputPath)) resolve(outputPath);
        else reject(new Error(stderr.slice(-400) || `ffmpeg code ${code}`));
      });
    });
  }

  return tryOnce(attempts[0]).catch(() => tryOnce(attempts[1]));
}

async function preparePlayablePath(inputPath) {
  if (!inputPath || !fs.existsSync(inputPath)) {
    throw new Error("Fichier introuvable");
  }

  if (!needsConversion(inputPath)) {
    return { path: inputPath, converted: false };
  }

  const outDir = path.join(app.getPath("temp"), "camphotos-convert");
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.basename(inputPath, path.extname(inputPath)).replace(/[^\w.-]+/g, "_");
  const outputPath = path.join(outDir, `${base}_${Date.now()}.mp4`);

  await runFfmpeg(inputPath, outputPath);
  convertedFiles.add(outputPath);
  return { path: outputPath, converted: true };
}

function createWindow() {
  ensureCaptureDir();

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "CAMPHOTOS",
    backgroundColor: "#12151a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "public", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  for (const file of convertedFiles) {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("get-capture-dir", () => captureDir);

ipcMain.handle("pick-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choisir le dossier des captures",
    properties: ["openDirectory", "createDirectory"],
    defaultPath: captureDir,
  });
  if (result.canceled || !result.filePaths[0]) return null;
  captureDir = result.filePaths[0];
  ensureCaptureDir();
  return captureDir;
});

ipcMain.handle("open-capture-dir", async () => {
  ensureCaptureDir();
  return shell.openPath(captureDir);
});

ipcMain.handle("pick-video", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Ouvrir une vidéo d’inspection",
    properties: ["openFile"],
    filters: [
      {
        name: "Vidéos",
        extensions: ["avi", "mp4", "mov", "m4v", "mkv", "webm", "wmv", "mpg", "mpeg", "flv", "ts"],
      },
      { name: "AVI (caméra)", extensions: ["avi"] },
      { name: "Tous les fichiers", extensions: ["*"] },
    ],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
  return prepareVideoResult(result.filePaths[0]);
});

ipcMain.handle("open-video-path", async (_event, filePath) => {
  try {
    return await prepareVideoResult(filePath);
  } catch (err) {
    return { ok: false, error: err.message || "Impossible d’ouvrir la vidéo" };
  }
});

async function prepareVideoResult(filePath) {
  try {
    if (mainWindow) {
      mainWindow.webContents.send("video-status", "Conversion en cours…");
    }
    const prepared = await preparePlayablePath(filePath);
    return {
      ok: true,
      url: pathToFileURL(prepared.path).href,
      name: path.basename(filePath),
      converted: prepared.converted,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err.message?.includes("ffmpeg") || err.message?.includes("Conversion")
          ? "Conversion AVI impossible. Vérifie le fichier."
          : err.message || "Impossible d’ouvrir la vidéo",
    };
  }
}

ipcMain.handle("save-capture", async (_event, payload) => {
  try {
    ensureCaptureDir();
    const filename = payload?.filename || `capture_${Date.now()}.png`;
    const filePath = path.join(captureDir, filename);
    const buffer = Buffer.from(payload.buffer);
    fs.writeFileSync(filePath, buffer);
    return { ok: true, filename, path: filePath, dir: captureDir };
  } catch (err) {
    return { ok: false, error: err.message || "Échec enregistrement" };
  }
});
