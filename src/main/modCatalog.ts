import { join } from 'path'
import { app } from 'electron'
import type { ModCategory, ModManifest } from '../shared/types'
import { scanAllMods, findModFolder, ensureModsStructure, getModFolderName } from './modScanner'
import { fetchRemoteCatalog } from './remoteCatalog'

// مجلد المودات = مكان قابل للكتابة لكل مستخدم. المودات تُنزّل هنا من GitHub.
export function getModsDirectory(): string {
  return join(app.getPath('userData'), 'mods')
}

export function initModsDirectory(): void {
  ensureModsStructure(getModsDirectory())
}

// المسح المحلي فقط (المودات المحمّلة). يُستخدم عند التفعيل/الإزالة لأنه يحتاج
// قائمة الملفات الفعلية.
export function loadModCatalog(): ModManifest[] {
  const modsDir = getModsDirectory()
  initModsDirectory()
  return scanAllMods(modsDir)
}

const COLORS: Record<ModCategory, string> = {
  graphics: '#1e3a5f',
  audio: '#3e245b',
  bloodfx: '#7c2437',
  killfx: '#54317b'
}

function categoryTarget(category: ModCategory): ModManifest['target'] {
  return category === 'audio' ? 'gta' : category === 'graphics' ? 'fivem' : 'both'
}

// القائمة المعروضة = دمج القائمة المركزية (المتاح) مع المسح المحلي (المحمّل).
// المود الموجود محلياً => downloaded: true وجاهز للتفعيل.
// المود في القائمة فقط => downloaded: false ويظهر له زر تحميل.
export async function buildModCatalog(): Promise<ModManifest[]> {
  const modsDir = getModsDirectory()
  initModsDirectory()
  const local = scanAllMods(modsDir)
  const remote = await fetchRemoteCatalog()

  // أوفلاين (فشل الجلب): اعرض المودات المحمّلة محلياً فقط حتى يبقى البرنامج قابلاً للاستخدام
  if (remote === null) {
    return local.map((m) => ({ ...m, folderName: getModFolderName(m), downloaded: true }))
  }

  // القائمة المركزية هي المصدر الرسمي: أي مود يُحذف منها يختفي عند الجميع
  const byId = new Map<string, ModManifest>()

  for (const r of remote) {
    const localMod = local.find((m) => m.id === r.id)
    if (localMod) {
      byId.set(r.id, {
        ...localMod,
        nameAr: r.nameAr || localMod.nameAr,
        descriptionAr: r.descriptionAr || localMod.descriptionAr,
        preview: r.preview ?? localMod.preview,
        soundPreview: r.soundPreview ?? localMod.soundPreview,
        videoPreview: r.videoPreview ?? localMod.videoPreview,
        folderName: r.folderName,
        downloadUrl: r.downloadUrl,
        size: r.size,
        downloaded: true
      })
    } else {
      byId.set(r.id, {
        id: r.id,
        name: r.name || r.nameAr,
        nameAr: r.nameAr,
        description: r.descriptionAr || '',
        descriptionAr: r.descriptionAr || '',
        category: r.category,
        target: categoryTarget(r.category),
        files: [],
        color: COLORS[r.category],
        preview: r.preview,
        soundPreview: r.soundPreview,
        videoPreview: r.videoPreview,
        folderName: r.folderName,
        downloadUrl: r.downloadUrl,
        size: r.size,
        downloaded: false
      })
    }
  }

  return [...byId.values()]
}

export function getModSourceDir(modId: string, _category: string): string {
  const modsDir = getModsDirectory()
  const found = findModFolder(modsDir, modId)
  return found?.folderPath || ''
}
