import { useEffect, useState } from 'react'
import './TitleBar.css'

export default function TitleBar(): React.JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => window.api.onWindowMaximized(setMaximized), [])

  const toggleMax = async (): Promise<void> => {
    setMaximized(await window.api.windowMaximize())
  }

  return (
    <div className="titlebar">
      <span className="titlebar-title">Tik @le_o | Dis.gg/k71</span>
      <div className="titlebar-controls">
        <button className="tb-btn" onClick={() => window.api.windowMinimize()} title="تصغير" aria-label="Minimize">
          <svg width="11" height="11" viewBox="0 0 11 11"><rect x="1" y="5" width="9" height="1" fill="currentColor" /></svg>
        </button>
        <button className="tb-btn" onClick={toggleMax} title={maximized ? 'استعادة' : 'تكبير'} aria-label="Maximize">
          {maximized ? (
            <svg width="11" height="11" viewBox="0 0 11 11">
              <rect x="1" y="3" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M3 3V1h7v7H8" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11">
              <rect x="1" y="1" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
        </button>
        <button className="tb-btn close" onClick={() => window.api.windowClose()} title="إغلاق" aria-label="Close">
          <svg width="11" height="11" viewBox="0 0 11 11">
            <path d="M1 1l9 9M10 1l-9 9" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
