const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("camphotos", {
  isElectron: true,
  getCaptureDir: () => ipcRenderer.invoke("get-capture-dir"),
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  openCaptureDir: () => ipcRenderer.invoke("open-capture-dir"),
  saveCapture: (buffer, filename) =>
    ipcRenderer.invoke("save-capture", { buffer, filename }),
});
