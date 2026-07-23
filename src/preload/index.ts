import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getMods: () => ipcRenderer.invoke('get-mods'),
  getState: () => ipcRenderer.invoke('get-state'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),
  activateMod: (modId: string) => ipcRenderer.invoke('activate-mod', modId),
  deactivateMod: (modId: string) => ipcRenderer.invoke('deactivate-mod', modId),
  browseFolder: (type: 'gta' | 'fivem') => ipcRenderer.invoke('browse-folder', type),
  getModsDir: () => ipcRenderer.invoke('get-mods-dir'),
  openModsFolder: () => ipcRenderer.invoke('open-mods-folder'),
  refreshMods: () => ipcRenderer.invoke('refresh-mods'),
  saveCustomMod: (modId: string, customData: { nameAr?: string; descriptionAr?: string }) => ipcRenderer.invoke('save-custom-mod', modId, customData),
  downloadMod: (modId: string) => ipcRenderer.invoke('download-mod', modId),
  onDownloadProgress: (callback: (data: { modId: string; progress: number }) => void) => {
    const listener = (_event: unknown, data: { modId: string; progress: number }): void => callback(data)
    ipcRenderer.on('download-progress', listener)
    return () => ipcRenderer.removeListener('download-progress', listener)
  },
  // لوحة المدير
  adminStatus: () => ipcRenderer.invoke('admin-status'),
  adminSetToken: (token: string) => ipcRenderer.invoke('admin-set-token', token),
  adminPickFolder: () => ipcRenderer.invoke('admin-pick-folder'),
  adminAddMod: (input: unknown) => ipcRenderer.invoke('admin-add-mod', input),
  adminEditMod: (id: string, fields: unknown) => ipcRenderer.invoke('admin-edit-mod', id, fields),
  adminDeleteMod: (id: string) => ipcRenderer.invoke('admin-delete-mod', id),
  adminSetBooster: (id: string, value: boolean) => ipcRenderer.invoke('admin-set-booster', id, value),
  adminPublishMod: (mod: unknown) => ipcRenderer.invoke('admin-publish-mod', mod),
  adminPickAudio: () => ipcRenderer.invoke('admin-pick-audio'),
  adminUploadSound: (id: string, filePath: string) => ipcRenderer.invoke('admin-upload-sound', id, filePath),
  adminPickMedia: () => ipcRenderer.invoke('admin-pick-media'),
  adminUploadMedia: (id: string, filePath: string) => ipcRenderer.invoke('admin-upload-media', id, filePath),
  adminGetWebhooks: () => ipcRenderer.invoke('admin-get-webhooks'),
  adminSetWebhooks: (hooks: unknown) => ipcRenderer.invoke('admin-set-webhooks', hooks),
  // التحديث داخل البرنامج
  onUpdateReady: (callback: (data: { version: string }) => void) => {
    const listener = (_event: unknown, data: { version: string }): void => callback(data)
    ipcRenderer.on('update-ready', listener)
    return () => ipcRenderer.removeListener('update-ready', listener)
  },
  installUpdateNow: () => ipcRenderer.invoke('install-update-now'),
  // البوستر
  boosterStatus: () => ipcRenderer.invoke('booster-status'),
  boosterVerify: () => ipcRenderer.invoke('booster-verify'),
  boosterOpenBoostPage: () => ipcRenderer.invoke('booster-open-boost-page'),
  boosterPickSource: (kind: 'folder' | 'file') => ipcRenderer.invoke('booster-pick-source', kind),
  boosterPickImage: () => ipcRenderer.invoke('booster-pick-image'),
  boosterListMods: () => ipcRenderer.invoke('booster-list-mods'),
  boosterAddMod: (input: unknown) => ipcRenderer.invoke('booster-add-mod', input),
  boosterUpdateMod: (id: string, fields: unknown) => ipcRenderer.invoke('booster-update-mod', id, fields),
  boosterDeleteMod: (id: string) => ipcRenderer.invoke('booster-delete-mod', id),
  // أزرار التحكم بالنافذة
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  onWindowMaximized: (callback: (maximized: boolean) => void) => {
    const listener = (_event: unknown, maximized: boolean): void => callback(maximized)
    ipcRenderer.on('window-maximized', listener)
    return () => ipcRenderer.removeListener('window-maximized', listener)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error fallback
  window.electron = electronAPI
  // @ts-expect-error fallback
  window.api = api
}
