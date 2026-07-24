const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let captureDir = path.join(app.getPath("documents"), "CAMPHOTOS", "captures");

function ensureCaptureDir() {
  fs.mkdirSync(captureDir, { recursive: true });
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
