import { useState } from 'react'
import type { AppSettings } from '../../../../shared/types'
import './SettingsPanel.css'

interface SettingsPanelProps { settings: AppSettings; onSave: (settings: AppSettings) => void; onClose: () => void }

export default function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [fivemPath, setFivemPath] = useState(settings.fivemPath)
  const [backupEnabled, setBackupEnabled] = useState(settings.backupEnabled)
  const handleBrowse = async () => { const path = await window.api.browseFolder('fivem'); if (path) setFivemPath(path) }
  const handleSave = () => { onSave({ ...settings, fivemPath, backupEnabled }); onClose() }
  return <div className="settings-overlay" onClick={onClose} dir="rtl"><div className="settings-panel" onClick={(e) => e.stopPropagation()}>
    <div className="settings-header"><h2>⚙ الإعدادات</h2><button className="close-btn" onClick={onClose}>×</button></div>
    <div className="settings-body"><div className="setting-group"><label>مسار FiveM</label><div className="path-input-row"><input className="path-input" value={fivemPath} onChange={(e) => setFivemPath(e.target.value)} placeholder="C:\\Users\\...\\FiveM\\FiveM.app" dir="ltr" /><button className="browse-btn" onClick={handleBrowse}>استعراض</button></div></div>
      <div className="setting-group"><div className="toggle-row"><label>إنشاء نسخة احتياطية قبل التبديل</label><button className={`toggle ${backupEnabled ? 'on' : ''}`} onClick={() => setBackupEnabled(!backupEnabled)} /></div></div>
      <button className="save-btn" onClick={handleSave}>حفظ الإعدادات</button>
    </div></div></div>
}
