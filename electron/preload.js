const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("camphotos", {
  isElectron: true,
  getCaptureDir: () => ipcRenderer.invoke("get-capture-dir"),
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  openCaptureDir: () => ipcRenderer.invoke("open-capture-dir"),
  pickVideo: () => ipcRenderer.invoke("pick-video"),
  openVideoPath: (filePath) => ipcRenderer.invoke("open-video-path", filePath),
  saveCapture: (buffer, filename) =>
    ipcRenderer.invoke("save-capture", { buffer, filename }),
  onVideoStatus: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on("video-status", listener);
    return () => ipcRenderer.removeListener("video-status", listener);
  },
});
