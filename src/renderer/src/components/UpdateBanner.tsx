import { useState } from 'react'
import { useI18n } from '../i18n'
import './UpdateBanner.css'

interface Props {
  version: string
  onDismiss: () => void
}

export default function UpdateBanner({ version, onDismiss }: Props): React.JSX.Element {
  const { t } = useI18n()
  const [installing, setInstalling] = useState(false)
  const [closing, setClosing] = useState(false)

  const later = (): void => {
    setClosing(true)
    setTimeout(onDismiss, 260)
  }

  const now = async (): Promise<void> => {
    setInstalling(true)
    await window.api.installUpdateNow()
  }

  return (
    <div className={`update-toast ${closing ? 'out' : ''}`}>
      <div className="update-glow" />
      <div className="update-icon">⬆</div>
      <div className="update-text">
        <div className="update-title">
          {t('updateTitle')} <span className="update-ver">v{version}</span>
        </div>
        <div className="update-body">{t('updateBody')}</div>
      </div>
      <div className="update-actions">
        <button className="update-btn primary" onClick={now} disabled={installing}>
          {installing ? '…' : t('updateNow')}
        </button>
        <button className="update-btn ghost" onClick={later} disabled={installing} title={t('updateLaterHint')}>
          {t('updateLater')}
        </button>
      </div>
    </div>
  )
}
