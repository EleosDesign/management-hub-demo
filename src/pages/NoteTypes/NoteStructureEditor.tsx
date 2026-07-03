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
  const focusOptRef = useRef<{ fid: string; oi: number } | null>(null);
  const optInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  React.useEffect(() => {
    if (!focusOptRef.current) return;
    const { fid, oi } = focusOptRef.current;
    const key = `${fid}-${oi}`;
    optInputRefs.current[key]?.focus();
    focusOptRef.current = null;
  });

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

  const addOpt = (fid: string, afterIdx?: number) => {
    const insertAt = afterIdx !== undefined ? afterIdx + 1 : undefined;
    onChange(fields.map(f => {
      if (f.id !== fid) return f;
      const opts = [...f.options];
      if (insertAt !== undefined) opts.splice(insertAt, 0, '');
      else opts.push('');
      return { ...f, options: opts };
    }));
    focusOptRef.current = { fid, oi: insertAt ?? (fields.find(f => f.id === fid)?.options.length ?? 0) };
  };

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
                <React.Fragment key={oi}>
                  <div className="nt-field-option-row">
                    <span className="nt-field-option-row__num">{oi + 1}.</span>
                    <input
                      ref={el => { optInputRefs.current[`${f.id}-${oi}`] = el; }}
                      className="nt-field-option-row__input"
                      value={opt}
                      onChange={e => updateOpt(f.id, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); addOpt(f.id, oi); }
                      }}
                    />
                    <button className="nt-field-row__delete" onClick={() => removeOpt(f.id, oi)} aria-label="Remove option">
                      <TrashIcon size={14} color="var(--color-text-secondary)" />
                    </button>
                  </div>
                  {/other/i.test(opt) && (
                    <div className="nt-field-option-other">
                      <input
                        className="nt-field-option-row__input nt-field-option-other__input"
                        placeholder="Please specify…"
                        disabled
                        aria-label="Other — free text input (shown when 'Other' is selected)"
                      />
                    </div>
                  )}
                </React.Fragment>
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

// ─── PageBody ─────────────────────────────────────────────────────────────────

function PageBody({ page, onUpdate }: {
  page: NotePage;
  onUpdate: (p: NotePage) => void;
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
    <div className="nt-page-body">
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
      <div className="nt-page-body__actions">
        <button
          className="nt-modal__add-field"
          onClick={() => {
            if (page.fields.length > 0) {
              // Move free fields into the new section
              const sec = { id: crypto.randomUUID(), title: '', fields: [...page.fields] };
              onUpdate({ ...page, sections: [...page.sections, sec], fields: [] });
            } else {
              onUpdate({ ...page, sections: [...page.sections, newSection()] });
            }
          }}
        >
          + Add Section
        </button>
        {page.sections.length === 0 && (
          <button
            className="nt-modal__add-field"
            onClick={() => onUpdate({ ...page, fields: [...page.fields, newField()] })}
          >
            + Add Field
          </button>
        )}
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
  const [activeIdx, setActiveIdx] = useState(0);
  const [dragTabIdx, setDragTabIdx] = useState<number | null>(null);
  const [overTabIdx, setOverTabIdx] = useState<number | null>(null);
  const dragTabIdxRef = useRef<number | null>(null);

  function addPage() {
    if (pages.length === 0) {
      const first = { ...newPage(), fields: [...fields] };
      const second = newPage();
      onPagesChange([first, second]);
      onFieldsChange([]);
      setActiveIdx(0);
    } else {
      onPagesChange([...pages, newPage()]);
      setActiveIdx(pages.length);
    }
  }

  function updatePage(updated: NotePage) {
    onPagesChange(pages.map(p => p.id === updated.id ? updated : p));
  }

  function dropTab(toIdx: number) {
    const fromIdx = dragTabIdxRef.current;
    dragTabIdxRef.current = null;
    setDragTabIdx(null);
    setOverTabIdx(null);
    if (fromIdx === null || fromIdx === toIdx) return;
    const activePageId = pages[clampedIdx]?.id;
    const next = [...pages];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onPagesChange(next);
    const newActiveIdx = next.findIndex(p => p.id === activePageId);
    if (newActiveIdx !== -1) setActiveIdx(newActiveIdx);
  }

  function deletePage(id: string) {
    const deletedIdx = pages.findIndex(p => p.id === id);
    const next = pages.filter(p => p.id !== id);
    if (next.length === 0) onFieldsChange([]);
    onPagesChange(next);
    setActiveIdx(Math.max(0, Math.min(activeIdx, next.length - 1)));
    // If deleted tab was before active, shift index down
    if (deletedIdx < activeIdx) setActiveIdx(activeIdx - 1);
  }

  const clampedIdx = Math.min(activeIdx, pages.length - 1);
  const activePage = pages[clampedIdx];

  return (
    <div className="nt-modal__fields-section">
      <div className="nt-modal__fields-header">
        <div className={labelClass}>Note Structure</div>
        <div className={hintClass}>
          {pages.length > 0
            ? 'Organize fields into pages and sections. Drag to reorder.'
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
          <div className="nt-page-tabs">
            {pages.map((page, idx) => (
              <div
                key={page.id}
                className={`nt-page-tab${clampedIdx === idx ? ' nt-page-tab--active' : ''}${dragTabIdx === idx ? ' nt-page-tab--dragging' : ''}${overTabIdx === idx && dragTabIdx !== idx ? ' nt-page-tab--over' : ''}`}
                onClick={() => setActiveIdx(idx)}
                draggable
                onDragStart={() => { dragTabIdxRef.current = idx; setDragTabIdx(idx); }}
                onDragOver={e => { e.preventDefault(); setOverTabIdx(idx); }}
                onDrop={e => { e.preventDefault(); dropTab(idx); }}
                onDragEnd={() => { dragTabIdxRef.current = null; setDragTabIdx(null); setOverTabIdx(null); }}
              >
                <input
                  className="nt-page-tab__input"
                  value={page.title}
                  onChange={e => updatePage({ ...page, title: e.target.value })}
                  placeholder={`Page ${idx + 1}`}
                />
                {pages.length > 1 && (
                  <button
                    className="nt-page-tab__close"
                    onClick={e => { e.stopPropagation(); deletePage(page.id); }}
                    aria-label="Delete page"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button className="nt-page-tab-add" onClick={addPage}>+ Page</button>
          </div>

          {activePage && (
            <PageBody page={activePage} onUpdate={updatePage} />
          )}
        </>
      )}
    </div>
  );
}
