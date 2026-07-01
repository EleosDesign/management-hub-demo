import React, { useState, useEffect, useRef } from 'react';
import { Switch } from '../Switch/Switch';
import { Modal } from '../Modal/Modal';
import { XIcon, ChevronDownIcon } from '../icons';
import { NoteStructureSection } from '../../pages/NoteTypes/NoteStructureEditor';
import {
  NoteType, NoteFormat,
  FORMAT_OPTIONS, PROFESSION_OPTIONS,
  countFields,
} from '../../pages/NoteTypes/noteTypeTypes';
import './EditNoteTypePanel.css';

interface EditNoteTypePanelProps {
  noteType: NoteType | null;
  onClose: () => void;
  onSave: (updated: NoteType) => void;
  onDelete: (id: string) => void;
}

interface FormState {
  name: string;
  format: NoteFormat;
  profession: string;
  description: string;
  active: boolean;
  fields: NoteType['fields'];
  pages: NoteType['pages'];
}

function formFromNote(n: NoteType): FormState {
  return {
    name: n.name,
    format: n.format,
    profession: '',
    description: n.description,
    active: n.active,
    fields: JSON.parse(JSON.stringify(n.fields)),
    pages: JSON.parse(JSON.stringify(n.pages)),
  };
}

function isDirty(original: NoteType, form: FormState): boolean {
  return (
    form.name !== original.name ||
    form.format !== original.format ||
    form.description !== original.description ||
    form.active !== original.active ||
    JSON.stringify(form.fields) !== JSON.stringify(original.fields) ||
    JSON.stringify(form.pages) !== JSON.stringify(original.pages)
  );
}

export function EditNoteTypePanel({ noteType, onClose, onSave, onDelete }: EditNoteTypePanelProps) {
  const [form, setForm] = useState<FormState>(() =>
    noteType ? formFromNote(noteType) : { name: '', format: 'Individual', profession: '', description: '', active: true, fields: [], pages: [] }
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (noteType) setForm(formFromNote(noteType));
  }, [noteType]);

  useEffect(() => {
    if (!noteType) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [noteType]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!noteType) return null;

  const totalFields = countFields(form.pages, form.fields);
  const canSave = form.name.trim() !== '' && form.profession !== '' && totalFields > 0 && isDirty(noteType, form);

  function handleSave() {
    if (!canSave) return;
    onSave({
      ...noteType!,
      name: form.name.trim(),
      format: form.format,
      description: form.description,
      active: form.active,
      fields: form.pages.length > 0 ? [] : form.fields,
      pages: form.pages,
      lastModified: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
    });
    onClose();
  }

  function handleDelete() {
    onDelete(noteType!.id);
    setConfirmDeleteOpen(false);
    onClose();
  }

  function toggleActive() {
    onSave({
      ...noteType!,
      active: !noteType!.active,
      lastModified: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
    });
    setMenuOpen(false);
    onClose();
  }

  function patch(updates: Partial<FormState>) {
    setForm(f => ({ ...f, ...updates }));
  }

  return (
    <>
      <div className="edit-panel-overlay" onClick={onClose} />
      <div className="edit-panel enp-panel" role="dialog" aria-modal="true" aria-labelledby="enp-name">

        {/* Header */}
        <div className="edit-panel__header">
          <div className="edit-panel__close-row">
            <button className="edit-panel__close" onClick={onClose} aria-label="Close">
              <XIcon size={20} color="currentColor" />
            </button>
          </div>

          <div className="edit-panel__identity">
            <div className="edit-panel__name-row">
              <span id="enp-name" className="edit-panel__name">{noteType.name}</span>
              <span className="edit-panel__badge"><span className="edit-panel__badge-text">{noteType.format}</span></span>
            </div>
            <div className="edit-panel__menu-wrapper" ref={menuRef}>
              <button className="edit-panel__more-btn" onClick={() => setMenuOpen(o => !o)} aria-label="More options">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="16" r="1.5" fill="currentColor" />
                </svg>
              </button>
              {menuOpen && (
                <div className="edit-panel__menu">
                  <button className="edit-panel__menu-item" onClick={toggleActive}>
                    {noteType.active ? 'Deactivate note type' : 'Activate note type'}
                  </button>
                  <button className="edit-panel__menu-item edit-panel__menu-item--danger" onClick={() => { setMenuOpen(false); setConfirmDeleteOpen(true); }}>
                    Delete note type
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="edit-panel__email enp-format-hint">{noteType.active ? 'Active' : 'Inactive'} · Last modified {noteType.lastModified}</p>
          <div className="edit-panel__separator" />
        </div>

        {/* Scrollable body */}
        <div className="edit-panel__body">
          <div className="enp-field">
            <label className="enp-label">Note Type Name <span className="enp-required">*</span></label>
            <input className="enp-input" value={form.name} onChange={e => patch({ name: e.target.value })} placeholder="e.g., Psychiatry, Case Management" />
          </div>

          <div className="enp-field">
            <label className="enp-label">Note Format <span className="enp-required">*</span></label>
            <div className="enp-select-wrap">
              <select className="enp-select" value={form.format} onChange={e => patch({ format: e.target.value as NoteFormat })}>
                {FORMAT_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
              </select>
              <ChevronDownIcon size={16} color="var(--color-text-secondary)" />
            </div>
          </div>

          <div className="enp-field">
            <label className="enp-label">Profession <span className="enp-required">*</span></label>
            <div className="enp-select-wrap">
              <select className="enp-select" value={form.profession} onChange={e => patch({ profession: e.target.value })}>
                <option value="">Select profession...</option>
                {PROFESSION_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
              </select>
              <ChevronDownIcon size={16} color="var(--color-text-secondary)" />
            </div>
          </div>

          <div className="enp-field">
            <label className="enp-label">Description</label>
            <textarea className="enp-textarea" value={form.description} onChange={e => patch({ description: e.target.value })} placeholder="Describe what this note type is used for..." rows={3} />
          </div>

          <div className="enp-active-row">
            <Switch checked={form.active} onChange={val => patch({ active: val })} />
            <div>
              <div className="enp-active-label">Active</div>
              <div className="enp-active-hint">Inactive note types cannot be used for new documentation</div>
            </div>
          </div>

          <div className="enp-divider" />

          <NoteStructureSection
            fields={form.fields}
            pages={form.pages}
            onFieldsChange={f => patch({ fields: f })}
            onPagesChange={p => patch({ pages: p })}
            labelClass="enp-label"
            hintClass="enp-fields-hint"
          />
        </div>

        {/* Footer */}
        <div className="edit-panel__footer">
          <button className="edit-panel__btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className={`edit-panel__btn-save${canSave ? ' edit-panel__btn-save--enabled' : ''}`}
            onClick={handleSave}
            disabled={!canSave}
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Delete note type?"
        width={440}
        footer={
          <>
            <button className="edit-panel__btn-cancel" onClick={() => setConfirmDeleteOpen(false)}>Keep {noteType.name}</button>
            <button className="enp-btn-delete" onClick={handleDelete}>Delete</button>
          </>
        }
      >
        <p className="enp-confirm-body">
          You're about to permanently delete <strong>{noteType.name}</strong>. This cannot be undone and will remove the note type from all associated configurations.
        </p>
      </Modal>
    </>
  );
}
