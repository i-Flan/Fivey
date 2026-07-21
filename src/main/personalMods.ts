import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, statSync, readdirSync } from 'fs'
import { join, extname } from 'path'
import { app, nativeImage } from 'electron'
import extract from 'extract-zip'
import type { ModCategory } from '../shared/types'

// نحسب مجلد المودات محلياً (بدل استيراده من modCatalog) لتفادي الاعتماد الدائري
function getModsDirectory(): string {
  return join(app.getPath('userData'), 'mods')
}

// مودات خاصة بالبوستر — محلية على جهازه فقط، ما تنرفع ولا يشوفها غيره
export interface PersonalMod {
  id: string
  category: ModCategory
  folderName: string
  nameAr: string
  image?: string // صورة مصغّرة مخزّنة كـ data URL
}

function registryFile(): string {
  return join(app.getPath('userData'), 'personal-mods.json')
}

export function listPersonalMods(): PersonalMod[] {
  try {
    const f = registryFile()
    if (existsSync(f)) {
      const data = JSON.parse(readFileSync(f, 'utf8'))
      return Array.isArray(data) ? (data as PersonalMod[]) : []
    }
  } catch {
    // ignore
  }
  return []
}

function saveRegistry(list: PersonalMod[]): void {
  writeFileSync(registryFile(), JSON.stringify(list, null, 2), 'utf8')
}

// نصغّر الصورة ونخزّنها data URL حتى تشتغل في التطوير والنسخة المثبّتة بدون مسارات
function imageToDataUrl(path: string): string | undefined {
  try {
    if (!path || !existsSync(path)) return undefined
    let img = nativeImage.createFromPath(path)
    if (img.isEmpty()) return undefined
    const { width } = img.getSize()
    if (width > 640) img = img.resize({ width: 640, quality: 'good' })
    return img.toDataURL()
  } catch {
    return undefined
  }
}

// يتحقق أن المجلد فيه ملف واحد على الأقل (بحث داخل المجلدات الفرعية)
function hasAnyFile(dir: string): boolean {
  try {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      if (item.name.startsWith('.')) continue
      if (item.isFile()) return true
      if (item.isDirectory() && hasAnyFile(join(dir, item.name))) return true
    }
  } catch {
    // ignore
  }
  return false
}

export interface AddPersonalInput {
  sourcePath: string // مجلد أو ملف .zip
  category: ModCategory
  nameAr: string
  imagePath?: string
}

export async function addPersonalMod(
  input: AddPersonalInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const name = (input.nameAr || '').trim()
    if (!name) return { success: false, error: 'اكتب اسم المود' }
    if (!input.sourcePath || !existsSync(input.sourcePath)) {
      return { success: false, error: 'الملف أو المجلد غير موجود' }
    }

    const folderName = `my-${Date.now().toString(36)}`
    const id = `${input.category}-${folderName}`
    const dest = join(getModsDirectory(), input.category, folderName)
    mkdirSync(dest, { recursive: true })

    const isZip = statSync(input.sourcePath).isFile() && extname(input.sourcePath).toLowerCase() === '.zip'
    if (isZip) {
      await extract(input.sourcePath, { dir: dest })
    } else if (statSync(input.sourcePath).isDirectory()) {
      cpSync(input.sourcePath, dest, { recursive: true })
    } else {
      // ملف مفرد (مثل ملف صوت أو rpf) — ننسخه كما هو داخل المجلد
      cpSync(input.sourcePath, join(dest, input.sourcePath.split(/[\\/]/).pop() || 'file'))
    }

    // نتأكد إن الملفات وصلت فعلاً — بدون ملفات ما راح يظهر المود في القائمة
    if (!hasAnyFile(dest)) {
      try {
        rmSync(dest, { recursive: true, force: true })
      } catch {
        // ignore
      }
      return { success: false, error: 'المجلد فاضي أو ما نقدر نقرأ محتواه — اختر مجلد فيه ملفات المود' }
    }

    const entry: PersonalMod = {
      id,
      category: input.category,
      folderName,
      nameAr: name,
      image: input.imagePath ? imageToDataUrl(input.imagePath) : undefined
    }
    saveRegistry([...listPersonalMods(), entry])
    return { success: true, id }
  } catch (err) {
    return { success: false, error: (err as Error)?.message || 'فشل إضافة المود' }
  }
}

export function updatePersonalMod(
  id: string,
  fields: { nameAr?: string; imagePath?: string }
): { success: boolean; error?: string } {
  try {
    const list = listPersonalMods()
    const m = list.find((x) => x.id === id)
    if (!m) return { success: false, error: 'المود غير موجود' }
    if (fields.nameAr !== undefined) m.nameAr = fields.nameAr
    if (fields.imagePath) m.image = imageToDataUrl(fields.imagePath)
    saveRegistry(list)
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error)?.message || 'فشل التعديل' }
  }
}

export function deletePersonalMod(id: string): { success: boolean; error?: string } {
  try {
    const list = listPersonalMods()
    const m = list.find((x) => x.id === id)
    if (m) {
      try {
        rmSync(join(getModsDirectory(), m.category, m.folderName), { recursive: true, force: true })
      } catch {
        // نكمّل حتى لو فشل حذف الملفات
      }
    }
    saveRegistry(list.filter((x) => x.id !== id))
    return { success: true }
  } catch (err) {
    return { success: false, error: (err as Error)?.message || 'فشل الحذف' }
  }
}
