import { catalogUrl } from './remoteConfig'
import type { RemoteMod } from '../shared/types'

// يجلب قائمة المودات المركزية من GitHub.
// - يُرجع مصفوفة (قد تكون فارغة) عند النجاح = المصدر الرسمي لما هو متاح.
// - يُرجع null عند فشل الاتصال (أوفلاين) حتى يتمكّن البرنامج من العرض المحلي بدلاً.
export async function fetchRemoteCatalog(): Promise<RemoteMod[] | null> {
  try {
    const res = await fetch(catalogUrl(), { headers: { 'Cache-Control': 'no-cache' } })
    if (res.status === 404) return [] // لا توجد قائمة بعد = لا مودات (ليس فشلاً)
    if (!res.ok) {
      console.warn('[Catalog] تعذّر جلب القائمة، الحالة:', res.status)
      return null
    }
    const data = (await res.json()) as { mods?: RemoteMod[] }
    if (!data || !Array.isArray(data.mods)) return []
    return data.mods.filter((m) => m && m.id && m.category && m.folderName && m.downloadUrl)
  } catch (err) {
    console.warn('[Catalog] خطأ في جلب القائمة (أوفلاين؟):', (err as Error)?.message)
    return null
  }
}
