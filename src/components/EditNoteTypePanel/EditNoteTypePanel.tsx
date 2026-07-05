import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../Modal/Modal';
import { XIcon, ChevronDownIcon } from '../icons';
import { NoteStructureSection } from '../../pages/NoteTypes/NoteStructureEditor';
import { NotePreviewPanel } from '../NotePreviewPanel/NotePreviewPanel';
import {
  NoteType, NoteFormat, NoteSection,
  FORMAT_OPTIONS, PROFESSION_OPTIONS, SITE_OPTIONS,
  countFields,
} from '../../pages/NoteTypes/noteTypeTypes';
import './EditNoteTypePanel.css';

interface EditNoteTypePanelProps {
  noteType: NoteType | null;
  onClose: () => void;
  onSave: (updated: NoteType) => void;
  onDelete: (id: string) => void;
  onDuplicate: (note: NoteType) => void;
  existingNames: string[];
  focusName?: boolean;
}

interface FormState {
  name: string;
  format: NoteFormat;
  profession: string[];
  sites: string[];
  fields: NoteType['fields'];
  sections: NoteSection[];
  pages: NoteType['pages'];
}

function formFromNote(n: NoteType): FormState {
  return {
    name: n.name,
    format: n.format,
    profession: n.profession,
    sites: JSON.parse(JSON.stringify(n.sites ?? [])),
    fields: JSON.parse(JSON.stringify(n.fields)),
    sections: JSON.parse(JSON.stringify(n.sections ?? [])),
    pages: JSON.parse(JSON.stringify(n.pages)),
  };
}

function isDirty(original: NoteType, form: FormState): boolean {
  return (
    form.name !== original.name ||
    form.format !== original.format ||
    JSON.stringify([...form.sites].sort()) !== JSON.stringify([...(original.sites ?? [])].sort()) ||
    JSON.stringify([...form.profession].sort()) !== JSON.stringify([...original.profession].sort()) ||
    JSON.stringify(form.fields) !== JSON.stringify(original.fields) ||
    JSON.stringify(form.sections) !== JSON.stringify(original.sections ?? []) ||
    JSON.stringify(form.pages) !== JSON.stringify(original.pages)
  );
}

export function EditNoteTypePanel({ noteType, onClose, onSave, onDelete, onDuplicate, existingNames, focusName }: EditNoteTypePanelProps) {
  const [form, setForm] = useState<FormState>(() =>
    noteType ? formFromNote(noteType) : { name: '', format: 'Individual', profession: [], sites: [], fields: [], sections: [], pages: [] }
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (noteType) {
      setForm(formFromNote(noteType));
      if (focusName) setTimeout(() => nameInputRef.current?.select(), 0);
    }
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (menuOpen) setMenuOpen(false);
        else onClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, onClose]);

  if (!noteType) return null;

  const totalFields = countFields(form.pages, form.fields, form.sections);
  const nameTaken = existingNames.some(n => n.toLowerCase() === form.name.trim().toLowerCase());
  const canSave = form.name.trim() !== '' && !nameTaken && form.profession.length > 0 && form.sites.length > 0 && totalFields > 0 && isDirty(noteType, form);

  function handleSave() {
    if (!canSave) return;
    onSave({
      ...noteType!,
      name: form.name.trim(),
      format: form.format,
      profession: form.profession,
      sites: form.sites,
      fields: form.pages.length > 0 ? [] : form.fields,
      sections: form.pages.length > 0 ? [] : form.sections,
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

  function handleDuplicate() {
    setMenuOpen(false);
    onDuplicate(noteType!);
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
              {focusName ? (
                <input
                  ref={nameInputRef}
                  id="enp-name"
                  className="edit-panel__name edit-panel__name--input"
                  value={form.name}
                  onChange={e => patch({ name: e.target.value })}
                  aria-label="Note type name"
                  aria-describedby={nameTaken ? 'enp-name-error' : undefined}
                />
              ) : (
                <>
                  <span id="enp-name" className="edit-panel__name">{form.name}</span>
                  <span className="edit-panel__badge"><span className="edit-panel__badge-text">{noteType.format}</span></span>
                </>
              )}
              <div className="edit-panel__menu-wrapper" ref={menuRef}>
              <button
                className="edit-panel__more-btn"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="16" r="1.5" fill="currentColor" />
                </svg>
              </button>
              {menuOpen && (
                <div className="edit-panel__menu" role="menu">
                  <button className="edit-panel__menu-item" role="menuitem" onClick={handleDuplicate}>
                    Duplicate note type
                  </button>
                  <button className="edit-panel__menu-item edit-panel__menu-item--danger" role="menuitem" onClick={() => { setMenuOpen(false); setConfirmDeleteOpen(true); }}>
                    Delete note type
                  </button>
                </div>
              )}
              </div>
            </div>
            {focusName && <span className="edit-panel__badge"><span className="edit-panel__badge-text">{noteType.format}</span></span>}
            {nameTaken && <p id="enp-name-error" className="nt-field-error" role="alert">A note type with this name already exists</p>}
          </div>

          <p className="edit-panel__email enp-format-hint">Last modified {noteType.lastModified}</p>
          <div className="edit-panel__separator" />
        </div>

        {/* Scrollable body — split: form left, preview right */}
        <div className="edit-panel__body enp-body-split">
          <div className="enp-split-preview">
            <NotePreviewPanel pages={form.pages} sections={form.sections} fields={form.fields} />
          </div>
          <div className="enp-split-form">
            <div className="enp-field">
              <label className="enp-label">Service Type <span className="enp-required" aria-hidden="true">*</span></label>
              <div className="enp-select-wrap">
                <select className="enp-select" value={form.format} onChange={e => patch({ format: e.target.value as NoteFormat })}>
                  {FORMAT_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                </select>
                <ChevronDownIcon size={16} color="var(--color-text-secondary)" />
              </div>
            </div>

            <div className="enp-field">
              <label className="enp-label">Profession <span className="enp-required" aria-hidden="true">*</span></label>
              <div className="enp-profession-checkboxes">
                <label className="enp-profession-checkbox enp-profession-checkbox--all">
                  <input
                    type="checkbox"
                    checked={form.profession.length === PROFESSION_OPTIONS.length}
                    ref={el => { if (el) el.indeterminate = form.profession.length > 0 && form.profession.length < PROFESSION_OPTIONS.length; }}
                    onChange={() => patch({ profession: form.profession.length === PROFESSION_OPTIONS.length ? [] : [...PROFESSION_OPTIONS] })}
                  />
                  <span>Select all</span>
                </label>
                {PROFESSION_OPTIONS.map(opt => (
                  <label key={opt} className="enp-profession-checkbox">
                    <input
                      type="checkbox"
                      checked={form.profession.includes(opt)}
                      onChange={() => patch({ profession: form.profession.includes(opt) ? form.profession.filter(p => p !== opt) : [...form.profession, opt] })}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>

            </div>

            <div className="enp-field">
              <label className="enp-label">Site <span className="enp-required" aria-hidden="true">*</span></label>
              <div className="enp-profession-checkboxes">
                <label className="enp-profession-checkbox enp-profession-checkbox--all">
                  <input
                    type="checkbox"
                    checked={form.sites.length === SITE_OPTIONS.length}
                    ref={el => { if (el) el.indeterminate = form.sites.length > 0 && form.sites.length < SITE_OPTIONS.length; }}
                    onChange={() => patch({ sites: form.sites.length === SITE_OPTIONS.length ? [] : [...SITE_OPTIONS] })}
                  />
                  <span>Select all</span>
                </label>
                {SITE_OPTIONS.map(opt => (
                  <label key={opt} className="enp-profession-checkbox">
                    <input
                      type="checkbox"
                      checked={form.sites.includes(opt)}
                      onChange={() => patch({ sites: form.sites.includes(opt) ? form.sites.filter(s => s !== opt) : [...form.sites, opt] })}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="enp-divider" />

            <NoteStructureSection
              fields={form.fields}
              sections={form.sections}
              pages={form.pages}
              onFieldsChange={f => patch({ fields: f })}
              onSectionsChange={s => patch({ sections: s })}
              onPagesChange={p => patch({ pages: p })}
              labelClass="enp-label"
              hintClass="enp-fields-hint"
            />
          </div>

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
