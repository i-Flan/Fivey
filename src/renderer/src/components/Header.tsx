import './Header.css'

interface HeaderProps {
  gtaValid: boolean
  fivemValid: boolean
  onOpenSettings: () => void
  onRefresh: () => void
  refreshing: boolean
}

export default function Header({ fivemValid, onOpenSettings, onRefresh, refreshing }: HeaderProps) {
  return (
    <header className="header">
      <div className="logo"><div className="logo-icon">F</div><div><h1>Fivey</h1><span>Mod Manager</span></div></div>
      <div className="header-right">
        <div className={`path-badge ${fivemValid ? 'valid' : 'invalid'}`}><span className="path-dot" />مسار FiveM</div>
        <button className="action-btn" onClick={onRefresh} title="تحديث القائمة" disabled={refreshing}>{refreshing ? '⌛' : '↻'}</button>
        <button className="settings-btn" onClick={onOpenSettings} title="الإعدادات">⚙</button>
      </div>
    </header>
  )
}
