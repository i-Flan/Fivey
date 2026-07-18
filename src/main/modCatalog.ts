import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { ModManifest } from '../shared/types'
import { scanAllMods, findModFolder, ensureModsStructure } from './modScanner'

export function getModsDirectory(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'mods')
  }
  return join(app.getAppPath(), 'mods')
}

export function initModsDirectory(): void {
  ensureModsStructure(getModsDirectory())
}

export function loadModCatalog(): ModManifest[] {
  const modsDir = getModsDirectory()
  initModsDirectory()
  return scanAllMods(modsDir)
}

export function getModSourceDir(modId: string, _category: string): string {
  const modsDir = getModsDirectory()
  const found = findModFolder(modsDir, modId)
  return found?.folderPath || ''
}
