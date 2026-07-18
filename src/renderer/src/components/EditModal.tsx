import { useState } from 'react'
import type { ModManifest } from '../../../../shared/types'
import './EditModal.css'

interface EditModalProps {
  mod: ModManifest
  onClose: () => void
  onSave: (updatedMod: ModManifest) => void
}

export default function EditModal({ mod, onClose, onSave }: EditModalProps) {
  const [nameAr, setNameAr] = useState(mod.nameAr)
  const [descriptionAr, setDescriptionAr] = useState(mod.descriptionAr)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...mod,
      nameAr,
      descriptionAr
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>تعديل المود</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>الاسم (عربي)</label>
            <input
              type="text"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>الوصف (عربي)</label>
            <textarea
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn-save">حفظ</button>
          </div>
        </form>
      </div>
    </div>
  )
}
