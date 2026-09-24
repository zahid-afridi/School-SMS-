const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("schoolsms", {
  invoke(cmd, args) {
    return ipcRenderer.invoke(cmd, args ?? undefined);
  },
});
