import { join } from 'path'
import { app } from 'electron'
import type { ModCategory, ModManifest } from '../shared/types'
import { scanAllMods, findModFolder, ensureModsStructure, getModFolderName } from './modScanner'
import { fetchRemoteCatalog } from './remoteCatalog'
import { listPersonalMods } from './personalMods'

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

  // أوفلاين (فشل الجلب): اعرض المودات المحمّلة محلياً فقط حتى يبقى البرنامج قابلاً للاستخدام.
  // نعلّم المودات الخاصة بالبوستر هنا أيضاً، وإلا ظهرت في العرض العادي واختفت من وضع البوستر.
  if (remote === null) {
    const personal = new Map(listPersonalMods().map((p) => [p.id, p]))
    return local.map((m) => {
      const p = personal.get(m.id)
      return {
        ...m,
        nameAr: p?.nameAr || m.nameAr,
        preview: p?.image ?? m.preview,
        folderName: p?.folderName || getModFolderName(m),
        downloaded: true,
        personal: !!p
      }
    })
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

  addPersonalMods(byId, local)
  return [...byId.values()]
}

// المودات الخاصة بالبوستر: موجودة محلياً فقط ومو ضمن القائمة المركزية،
// فنضيفها يدوياً حتى لا تُحذف عند بناء القائمة.
function addPersonalMods(byId: Map<string, ModManifest>, local: ModManifest[]): void {
  try {
    for (const p of listPersonalMods()) {
      const scanned = local.find((m) => m.id === p.id)
      if (!scanned) continue
      byId.set(p.id, {
        ...scanned,
        nameAr: p.nameAr || scanned.nameAr,
        name: p.nameAr || scanned.name,
        preview: p.image ?? scanned.preview,
        folderName: p.folderName,
        downloaded: true,
        personal: true
      })
    }
  } catch {
    // لو صار خطأ نكمّل بالقائمة العادية
  }
}

export function getModSourceDir(modId: string, _category: string): string {
  const modsDir = getModsDirectory()
  const found = findModFolder(modsDir, modId)
  return found?.folderPath || ''
}
