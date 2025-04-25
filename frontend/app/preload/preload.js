const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  doRun: (script, args) => ipcRenderer.invoke("run-python", script, args),
  //loadExample: (example) => ipcRenderer.invoke("load-example", example),
  getPrevResults: () => ipcRenderer.invoke("get-prev-results"),
  loadConfig: (path) => ipcRenderer.invoke("load-config", path),
  loadPreviousConfig: (dir) => ipcRenderer.invoke("load-previous-config", dir),
  loadPreviousResults: (dir) =>
    ipcRenderer.invoke("load-previous-results", dir),
  saveResults: (results) => ipcRenderer.invoke("save-results", results),

  getRecentResults: (results) =>
    ipcRenderer.invoke("get-recent-results", results),
  getRecentConfig: (config) => ipcRenderer.invoke("get-recent-config", config),
  getDownloadPath: (path, defaultPath) =>
    ipcRenderer.invoke("get-download-path", path, defaultPath),
  getUploadPath: () => ipcRenderer.invoke("get-upload-path"),
  downloadFile: (filePath, csvData) =>
    ipcRenderer.invoke("download-file", filePath, csvData),
});
