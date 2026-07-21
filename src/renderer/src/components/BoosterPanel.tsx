import { useEffect, useState } from 'react'
import type { ModCategory } from '../../../../shared/types'
import './BoosterPanel.css'

const CATS: { key: ModCategory; name: string }[] = [
  { key: 'graphics', name: 'Graphics' },
  { key: 'audio', name: 'Sound' },
  { key: 'bloodfx', name: 'BloodFX' },
  { key: 'killfx', name: 'KillFX' }
]

interface PersonalMod {
  id: string
  category: string
  folderName: string
  nameAr: string
  image?: string
}

interface Props {
  isBooster: boolean
  onClose: () => void
  onVerified: (user?: string) => void
  onReload: () => void
}

export default function BoosterPanel({ isBooster, onClose, onVerified, onReload }: Props): React.JSX.Element {
  // ask = سؤال "هل دعمت السيرفر؟" | list = مودات البوستر | add = إضافة
  const [mode, setMode] = useState<'ask' | 'list' | 'add'>(isBooster ? 'list' : 'ask')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState('')
  const [list, setList] = useState<PersonalMod[]>([])

  const [src, setSrc] = useState('')
  const [cat, setCat] = useState<ModCategory>('audio')
  const [name, setName] = useState('')
  const [img, setImg] = useState('')

  const reload = async (): Promise<void> => {
    setList((await window.api.boosterListMods()) as PersonalMod[])
    onReload()
  }

  useEffect(() => {
    if (isBooster) void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBooster])

  const verify = async (): Promise<void> => {
    setBusy(true)
    setMsg('')
    const r = await window.api.boosterVerify()
    setBusy(false)
    if (!r.success) return setMsg(r.error || 'فشل التحقق')
    if (!r.isBooster) return setMsg('ما لقينا رتبة البوستر في حسابك — ادعم السيرفر بالبوست وحاول ثاني')
    setOk(`أهلاً ${r.user || ''} — تم تفعيل مزايا البوستر 💎`)
    onVerified(r.user)
    setMode('list')
    await reload()
  }

  const noBoost = async (): Promise<void> => {
    await window.api.boosterOpenBoostPage()
    onClose()
  }

  const submitAdd = async (): Promise<void> => {
    if (!src || !name.trim()) return setMsg('اختر الملف واكتب الاسم')
    setBusy(true)
    setMsg('جارٍ الإضافة...')
    const r = await window.api.boosterAddMod({ sourcePath: src, category: cat, nameAr: name.trim(), imagePath: img || undefined })
    setBusy(false)
    if (r.success) {
      setSrc('')
      setName('')
      setImg('')
      setMsg('')
      setMode('list')
      await reload()
    } else setMsg(r.error || 'فشل الإضافة')
  }

  const del = async (m: PersonalMod): Promise<void> => {
    if (!window.confirm(`حذف "${m.nameAr}" من مودّاتك الخاصة؟`)) return
    setBusy(true)
    const r = await window.api.boosterDeleteMod(m.id)
    setBusy(false)
    if (r.success) await reload()
    else setMsg(r.error || 'فشل الحذف')
  }

  return (
    <div className="booster-overlay" dir="rtl" onClick={onClose}>
      <div className="booster-panel" onClick={(e) => e.stopPropagation()}>
        <div className="booster-header">
          <h2><span className="gem">💎</span> Booster</h2>
          <button className="booster-close" onClick={onClose}>×</button>
        </div>

        {busy && <div className="booster-busy"><span className="booster-spin" />{msg || 'جارٍ...'}</div>}

        {mode === 'ask' ? (
          <div className="booster-body booster-ask">
            <div className="booster-gem-big">💎</div>
            <h3>هل قد دعمت السيرفر بوست ؟</h3>
            <p className="booster-hint">
              بيفتح <b>متصفحك</b> على ديسكورد وأنت مسجّل فيه أصلاً — بس تضغط <b>Authorize</b>.
              <br />
              🔒 ما نطلب إيميل ولا كلمة سر، والبرنامج ما يشوف بيانات دخولك إطلاقاً.
            </p>
            {msg && <p className="booster-msg">{msg}</p>}
            <div className="booster-ask-actions">
              <button className="booster-btn primary" disabled={busy} onClick={verify}>نعم</button>
              <button className="booster-btn ghost" disabled={busy} onClick={noBoost}>لا</button>
            </div>
          </div>
        ) : mode === 'add' ? (
          <div className="booster-body">
            <label className="booster-label">ملف المود (مجلد أو ZIP)</label>
            <div className="booster-row">
              <input className="booster-input" value={src} readOnly dir="ltr" placeholder="اختر مجلد أو ملف" />
              <button className="booster-btn small" onClick={async () => { const p = await window.api.boosterPickSource('folder'); if (p) setSrc(p) }}>📁 مجلد</button>
              <button className="booster-btn small" onClick={async () => { const p = await window.api.boosterPickSource('file'); if (p) setSrc(p) }}>📄 ملف</button>
            </div>

            <label className="booster-label">التصنيف</label>
            <select className="booster-input" value={cat} onChange={(e) => setCat(e.target.value as ModCategory)}>
              {CATS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>

            <label className="booster-label">اسم المود</label>
            <input className="booster-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: صوت خاص" />

            <label className="booster-label">صورة المود (اختياري)</label>
            <div className="booster-row">
              <input className="booster-input" value={img} readOnly dir="ltr" placeholder="اختر صورة" />
              <button className="booster-btn small" onClick={async () => { const p = await window.api.boosterPickImage(); if (p) setImg(p) }}>🖼️ اختر</button>
            </div>

            {msg && <p className="booster-msg">{msg}</p>}
            <div className="booster-row booster-actions">
              <button className="booster-btn ghost" onClick={() => { setMode('list'); setMsg('') }}>رجوع</button>
              <button className="booster-btn primary" disabled={busy} onClick={submitAdd}>إضافة المود</button>
            </div>
          </div>
        ) : (
          <div className="booster-body">
            {ok && <p className="booster-ok">{ok}</p>}
            <div className="booster-toolbar">
              <p className="booster-hint">مودّاتك الخاصة — تظهر لك أنت فقط ولا تنرفع لأي مكان 🔒</p>
              <button className="booster-btn primary" onClick={() => { setMode('add'); setMsg('') }}>+ إضافة</button>
            </div>
            {msg && <p className="booster-msg">{msg}</p>}
            <div className="booster-list">
              {list.length ? list.map((m) => (
                <div className="booster-item" key={m.id}>
                  {m.image ? <img className="booster-thumb" src={m.image} alt="" /> : <div className="booster-thumb empty">💎</div>}
                  <div className="booster-item-info">
                    <span className="booster-item-name">{m.nameAr}</span>
                    <span className="booster-item-cat">{CATS.find((c) => c.key === m.category)?.name || m.category}</span>
                  </div>
                  <button className="booster-btn small danger" onClick={() => del(m)}>🗑️ حذف</button>
                </div>
              )) : <p className="booster-empty">ما عندك مودات خاصة — اضغط «إضافة»</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
