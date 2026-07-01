import React, { useState, useRef } from 'react';
import { GripVerticalIcon, TrashIcon, ChevronDownIcon } from '../../components/icons';
import {
  NoteField, NoteSection, NotePage,
  FieldType, FIELD_TYPES, HAS_OPTIONS,
  newField, newSection, newPage,
} from './noteTypeTypes';

// ─── FieldList ────────────────────────────────────────────────────────────────

export function FieldList({ fields, onChange }: { fields: NoteField[]; onChange: (f: NoteField[]) => void }) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  if (fields.length === 0) return null;

  const update = (id: string, patch: Partial<NoteField>) =>
    onChange(fields.map(f => {
      if (f.id !== id) return f;
      const u = { ...f, ...patch };
      if (patch.type && !HAS_OPTIONS.includes(patch.type as FieldType)) u.options = [];
      return u;
    }));

  const remove = (id: string) => onChange(fields.filter(f => f.id !== id));

  const updateOpt = (fid: string, oi: number, val: string) =>
    onChange(fields.map(f => {
      if (f.id !== fid) return f;
      const opts = [...f.options]; opts[oi] = val;
      return { ...f, options: opts };
    }));

  const removeOpt = (fid: string, oi: number) =>
    onChange(fields.map(f => f.id !== fid ? f : { ...f, options: f.options.filter((_, i) => i !== oi) }));

  const addOpt = (fid: string) =>
    onChange(fields.map(f => f.id === fid ? { ...f, options: [...f.options, ''] } : f));

  const drop = (toIdx: number) => {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setOverIdx(null); return; }
    const next = [...fields];
    const [m] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, m);
    onChange(next);
    setDragIdx(null); setOverIdx(null);
  };

  return (
    <div className="nt-modal__fields-list">
      {fields.map((f, idx) => (
        <div
          key={f.id}
          className={`nt-field-row-wrap${overIdx === idx ? ' nt-field-row-wrap--over' : ''}${dragIdx === idx ? ' nt-field-row-wrap--dragging' : ''}`}
          draggable
          onDragStart={() => setDragIdx(idx)}
          onDragOver={e => { e.preventDefault(); setOverIdx(idx); }}
          onDrop={() => drop(idx)}
          onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
        >
          <div className="nt-field-row">
            <span className="nt-field-row__grip"><GripVerticalIcon size={16} color="var(--color-text-disabled)" /></span>
            <input
              className="nt-field-row__name"
              value={f.title}
              onChange={e => update(f.id, { title: e.target.value })}
              placeholder="Field name"
            />
            <div className="nt-field-row__type-wrap">
              <select className="nt-field-row__type" value={f.type} onChange={e => update(f.id, { type: e.target.value as FieldType })}>
                {FIELD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDownIcon size={14} color="var(--color-text-secondary)" />
            </div>
            <button className="nt-field-row__delete" onClick={() => remove(f.id)} aria-label="Delete field">
              <TrashIcon size={16} color="var(--color-text-secondary)" />
            </button>
          </div>
          {HAS_OPTIONS.includes(f.type) && (
            <div className="nt-field-options">
              <div className="nt-field-options__label">Options</div>
              {f.options.map((opt, oi) => (
                <div key={oi} className="nt-field-option-row">
                  <input
                    className="nt-field-option-row__input"
                    value={opt}
                    onChange={e => updateOpt(f.id, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                  />
                  <button className="nt-field-row__delete" onClick={() => removeOpt(f.id, oi)} aria-label="Remove option">
                    <TrashIcon size={14} color="var(--color-text-secondary)" />
                  </button>
                </div>
              ))}
              <button className="nt-field-options__add" onClick={() => addOpt(f.id)}>+ Add option</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── SectionEditor ────────────────────────────────────────────────────────────

export function SectionEditor({ section, onUpdate, onDelete, dragHandleProps }: {
  section: NoteSection;
  onUpdate: (s: NoteSection) => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}) {
  return (
    <div className="nt-section-card">
      <div className="nt-section-card__header">
        <span className="nt-section-card__grip" {...dragHandleProps}>
          <GripVerticalIcon size={14} color="var(--color-text-disabled)" />
        </span>
        <span className="nt-section-card__label">SECTION</span>
        <input
          className="nt-section-card__title"
          value={section.title}
          onChange={e => onUpdate({ ...section, title: e.target.value })}
          placeholder="Section title (optional)"
        />
        <button className="nt-field-row__delete" onClick={onDelete} aria-label="Delete section">
          <TrashIcon size={14} color="var(--color-text-secondary)" />
        </button>
      </div>
      <div className="nt-section-card__body">
        <FieldList fields={section.fields} onChange={fields => onUpdate({ ...section, fields })} />
        <button
          className="nt-modal__add-field"
          onClick={() => onUpdate({ ...section, fields: [...section.fields, newField()] })}
        >
          + Add Field
        </button>
      </div>
    </div>
  );
}

// ─── PageEditor ───────────────────────────────────────────────────────────────

export function PageEditor({ page, onUpdate, onDelete }: {
  page: NotePage;
  onUpdate: (p: NotePage) => void;
  onDelete: () => void;
}) {
  const [dragSecIdx, setDragSecIdx] = useState<number | null>(null);
  const [overSecIdx, setOverSecIdx] = useState<number | null>(null);
  const dragSecIdxRef = useRef<number | null>(null);
  const pageRef = useRef(page);
  pageRef.current = page;

  function startSecDrag(idx: number) {
    dragSecIdxRef.current = idx;
    setDragSecIdx(idx);
  }

  function dropSection(toIdx: number) {
    const fromIdx = dragSecIdxRef.current;
    dragSecIdxRef.current = null;
    setDragSecIdx(null);
    setOverSecIdx(null);
    if (fromIdx === null || fromIdx === toIdx) return;
    const next = [...pageRef.current.sections];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onUpdate({ ...pageRef.current, sections: next });
  }

  return (
    <div className="nt-page-card">
      <div className="nt-page-card__header">
        <GripVerticalIcon size={16} color="var(--color-text-disabled)" />
        <span className="nt-page-card__label">PAGE</span>
        <input
          className="nt-page-card__title"
          value={page.title}
          onChange={e => onUpdate({ ...page, title: e.target.value })}
          placeholder="Page title (optional)"
        />
        <button className="nt-field-row__delete" onClick={onDelete} aria-label="Delete page">
          <TrashIcon size={16} color="var(--color-text-secondary)" />
        </button>
      </div>
      <div className="nt-page-card__body">
        {page.sections.map((section, idx) => (
          <div
            key={section.id}
            className={`nt-section-drag-wrap${overSecIdx === idx ? ' nt-section-drag-wrap--over' : ''}${dragSecIdx === idx ? ' nt-section-drag-wrap--dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); if (dragSecIdxRef.current !== null) setOverSecIdx(idx); }}
            onDrop={e => { e.preventDefault(); dropSection(idx); }}
            onDragEnd={() => { dragSecIdxRef.current = null; setDragSecIdx(null); setOverSecIdx(null); }}
          >
            <SectionEditor
              section={section}
              onUpdate={updated => onUpdate({ ...page, sections: page.sections.map(s => s.id === section.id ? updated : s) })}
              onDelete={() => onUpdate({ ...page, sections: page.sections.filter(s => s.id !== section.id) })}
              dragHandleProps={{
                draggable: true,
                onDragStart: e => { e.stopPropagation(); startSecDrag(idx); },
              }}
            />
          </div>
        ))}
        <FieldList fields={page.fields} onChange={fields => onUpdate({ ...page, fields })} />
        <div className="nt-page-card__actions">
          <button
            className="nt-modal__add-field"
            onClick={() => onUpdate({ ...page, sections: [...page.sections, newSection()] })}
          >
            + Add Section
          </button>
          <button
            className="nt-modal__add-field"
            onClick={() => onUpdate({ ...page, fields: [...page.fields, newField()] })}
          >
            + Add Field
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NoteStructureSection ─────────────────────────────────────────────────────

export function NoteStructureSection({ fields, pages, onFieldsChange, onPagesChange, labelClass = 'nt-modal__label', hintClass = 'nt-modal__fields-hint' }: {
  fields: NoteField[];
  pages: NotePage[];
  onFieldsChange: (f: NoteField[]) => void;
  onPagesChange: (p: NotePage[]) => void;
  labelClass?: string;
  hintClass?: string;
}) {
  function addPage() {
    if (pages.length === 0) {
      // Convert flat fields → first page, then add a second empty page
      onPagesChange([{ ...newPage(), fields: [...fields] }, newPage()]);
      onFieldsChange([]);
    } else {
      onPagesChange([...pages, newPage()]);
    }
  }

  function updatePage(updated: NotePage) {
    onPagesChange(pages.map(p => p.id === updated.id ? updated : p));
  }

  function deletePage(id: string) {
    const next = pages.filter(p => p.id !== id);
    if (next.length === 0) onFieldsChange([]);
    onPagesChange(next);
  }

  return (
    <div className="nt-modal__fields-section">
      <div className="nt-modal__fields-header">
        <div className={labelClass}>Note Structure</div>
        <div className={hintClass}>
          {pages.length > 0
            ? 'Organize fields into pages and sections. Drag to reorder fields.'
            : 'Define the fields in this note type. Optionally organize with pages and sections.'}
        </div>
      </div>

      {pages.length === 0 ? (
        <>
          <FieldList fields={fields} onChange={onFieldsChange} />
          <div className="nt-structure-actions">
            <button className="nt-modal__add-field" onClick={() => onFieldsChange([...fields, newField()])}>
              + Add Field
            </button>
            <button className="nt-add-page-btn" onClick={addPage}>
              + Add Page
            </button>
          </div>
        </>
      ) : (
        <>
          {pages.map(page => (
            <PageEditor
              key={page.id}
              page={page}
              onUpdate={updatePage}
              onDelete={() => deletePage(page.id)}
            />
          ))}
          <button className="nt-modal__add-field" onClick={addPage}>
            + Add Page
          </button>
        </>
      )}
    </div>
  );
}
