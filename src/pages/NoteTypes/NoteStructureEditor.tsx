import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { GripVerticalIcon, TrashIcon, ChevronDownIcon } from '../../components/icons';
import {
  NoteField, NoteSection, NotePage,
  FieldType, FIELD_TYPES, HAS_OPTIONS,
  newField, newSection, newPage,
} from './noteTypeTypes';

// ─── FieldList ────────────────────────────────────────────────────────────────

export function FieldList({ fields, onChange }: { fields: NoteField[]; onChange: (f: NoteField[]) => void }) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ idx: number; position: 'before' | 'after' } | null>(null);
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
      if (patch.type && patch.type !== 'Dropdown') u.multiSelect = undefined;
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

  const getDropPosition = (e: React.DragEvent, el: HTMLElement): 'before' | 'after' => {
    const rect = el.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  };

  const drop = (e: React.DragEvent, el: HTMLElement, toIdx: number) => {
    if (dragIdx === null) { setDropTarget(null); return; }
    const position = getDropPosition(e, el);
    let insertAt = position === 'before' ? toIdx : toIdx + 1;
    if (dragIdx < insertAt) insertAt--;
    if (dragIdx === insertAt) { setDragIdx(null); setDropTarget(null); return; }
    const next = [...fields];
    const [m] = next.splice(dragIdx, 1);
    next.splice(insertAt, 0, m);
    onChange(next);
    setDragIdx(null); setDropTarget(null);
  };

  const dropAt = (insertAt: number) => {
    if (dragIdx === null) return;
    let idx = insertAt;
    if (dragIdx < idx) idx--;
    if (dragIdx === idx) { setDragIdx(null); setDropTarget(null); return; }
    const next = [...fields];
    const [m] = next.splice(dragIdx, 1);
    next.splice(idx, 0, m);
    onChange(next);
    setDragIdx(null); setDropTarget(null);
  };

  const sentinelProps = (insertAt: number, position: 'before' | 'after') => ({
    className: `nt-drop-sentinel${dropTarget?.idx === (insertAt === 0 ? -1 : fields.length) && dropTarget.position === position ? ' nt-drop-sentinel--active' : ''}`,
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDropTarget({ idx: insertAt === 0 ? -1 : fields.length, position }); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); dropAt(insertAt); },
    onDragLeave: () => setDropTarget(null),
  });

  return (
    <div className="nt-modal__fields-list">
      {dragIdx !== null && <div {...sentinelProps(0, 'before')} />}
      {fields.map((f, idx) => (
        <div
          key={f.id}
          className={[
            'nt-field-row-wrap',
            dragIdx === idx ? 'nt-field-row-wrap--dragging' : '',
            dropTarget?.idx === idx && dropTarget.position === 'before' ? 'nt-field-row-wrap--drop-before' : '',
            dropTarget?.idx === idx && dropTarget.position === 'after' ? 'nt-field-row-wrap--drop-after' : '',
          ].filter(Boolean).join(' ')}
          draggable
          onDragStart={() => setDragIdx(idx)}
          onDragOver={e => { e.preventDefault(); setDropTarget({ idx, position: getDropPosition(e, e.currentTarget) }); }}
          onDrop={e => { e.preventDefault(); drop(e, e.currentTarget, idx); }}
          onDragEnd={() => { setDragIdx(null); setDropTarget(null); }}
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
          {f.type === 'Dropdown' && (
            <div className="nt-field-select-type">
              <label className="nt-field-select-type__option">
                <input
                  type="radio"
                  name={`select-type-${f.id}`}
                  checked={!f.multiSelect}
                  onChange={() => update(f.id, { multiSelect: false })}
                />
                <span>Single select</span>
              </label>
              <label className="nt-field-select-type__option">
                <input
                  type="radio"
                  name={`select-type-${f.id}`}
                  checked={!!f.multiSelect}
                  onChange={() => update(f.id, { multiSelect: true })}
                />
                <span>Multi-select</span>
              </label>
            </div>
          )}
          <div className="nt-field-context">
            <input
              className="nt-field-context__input"
              value={f.context ?? ''}
              onChange={e => update(f.id, { context: e.target.value || undefined })}
              placeholder="Context (optional)"
            />
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
      {dragIdx !== null && <div {...sentinelProps(fields.length, 'after')} />}
    </div>
  );
}

// ─── SectionEditor ────────────────────────────────────────────────────────────

export function SectionEditor({ section, onUpdate, onDelete, dragHandleProps, focusTitle }: {
  section: NoteSection;
  onUpdate: (s: NoteSection) => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  focusTitle?: boolean;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (focusTitle) titleRef.current?.focus(); }, [focusTitle]);

  return (
    <div className="nt-section-card">
      <div className="nt-section-card__header">
        <span className="nt-section-card__grip" {...dragHandleProps}>
          <GripVerticalIcon size={14} color="var(--color-text-disabled)" />
        </span>
        <span className="nt-section-card__label">SECTION</span>
        <input
          ref={titleRef}
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

function PageBody({ page, onUpdate, extraAction, borderless }: {
  page: NotePage;
  onUpdate: (p: NotePage) => void;
  extraAction?: React.ReactNode;
  borderless?: boolean;
}) {
  const [dragSecIdx, setDragSecIdx] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ idx: number; position: 'before' | 'after' } | null>(null);
  const [newSecId, setNewSecId] = useState<string | null>(null);
  const dragSecIdxRef = useRef<number | null>(null);
  const pageRef = useRef(page);
  pageRef.current = page;

  // FLIP animation
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevSecRectsRef = useRef<Record<string, DOMRect>>({});

  useLayoutEffect(() => {
    const refs = sectionRefs.current;
    const prevRects = prevSecRectsRef.current;
    const newRects: Record<string, DOMRect> = {};
    Object.keys(refs).forEach(id => { if (refs[id]) newRects[id] = refs[id]!.getBoundingClientRect(); });
    Object.keys(refs).forEach(id => {
      const el = refs[id];
      if (!el || !prevRects[id] || !newRects[id]) return;
      const deltaY = prevRects[id].top - newRects[id].top;
      if (Math.abs(deltaY) < 1) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${deltaY}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        el.style.transform = '';
      }));
    });
    prevSecRectsRef.current = newRects;
  }, [page.sections]);

  const getDropPosition = (e: React.DragEvent, el: HTMLElement): 'before' | 'after' => {
    const rect = el.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
  };

  function dropSection(e: React.DragEvent, el: HTMLElement, toIdx: number) {
    const fromIdx = dragSecIdxRef.current;
    dragSecIdxRef.current = null;
    setDragSecIdx(null);
    setDropTarget(null);
    if (fromIdx === null) return;
    const position = getDropPosition(e, el);
    let insertAt = position === 'before' ? toIdx : toIdx + 1;
    if (fromIdx < insertAt) insertAt--;
    if (fromIdx === insertAt) return;
    const next = [...pageRef.current.sections];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(insertAt, 0, moved);
    onUpdate({ ...pageRef.current, sections: next });
  }

  function dropAtSentinel(insertAt: number) {
    const fromIdx = dragSecIdxRef.current;
    dragSecIdxRef.current = null;
    setDragSecIdx(null);
    setDropTarget(null);
    if (fromIdx === null) return;
    let idx = insertAt;
    if (fromIdx < idx) idx--;
    if (fromIdx === idx) return;
    const next = [...pageRef.current.sections];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(idx, 0, moved);
    onUpdate({ ...pageRef.current, sections: next });
  }

  const sentinelProps = (insertAt: number) => ({
    className: `nt-drop-sentinel${dragSecIdx !== null ? ' nt-drop-sentinel--visible' : ''}${dropTarget?.idx === (insertAt === 0 ? -1 : page.sections.length) ? ' nt-drop-sentinel--active' : ''}`,
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDropTarget({ idx: insertAt === 0 ? -1 : page.sections.length, position: 'before' }); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); dropAtSentinel(insertAt); },
    onDragLeave: () => setDropTarget(null),
  });

  return (
    <div className={`nt-page-body${borderless ? ' nt-page-body--borderless' : ''}`}>
      <div {...sentinelProps(0)} />
      {page.sections.map((section, idx) => (
        <div
          key={section.id}
          ref={el => { sectionRefs.current[section.id] = el; }}
          className={[
            'nt-section-drag-wrap',
            dragSecIdx === idx ? 'nt-section-drag-wrap--dragging' : '',
            dropTarget?.idx === idx && dropTarget.position === 'before' ? 'nt-section-drag-wrap--drop-before' : '',
            dropTarget?.idx === idx && dropTarget.position === 'after' ? 'nt-section-drag-wrap--drop-after' : '',
          ].filter(Boolean).join(' ')}
          onDragOver={e => {
            e.preventDefault();
            if (dragSecIdxRef.current === null) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const threshold = Math.min(40, rect.height * 0.25);
            const relY = e.clientY - rect.top;
            if (relY < threshold) setDropTarget({ idx, position: 'before' });
            else if (relY > rect.height - threshold) setDropTarget({ idx, position: 'after' });
            else setDropTarget(null);
          }}
          onDrop={e => { e.preventDefault(); dropSection(e, e.currentTarget, idx); }}
          onDragEnd={() => { dragSecIdxRef.current = null; setDragSecIdx(null); setDropTarget(null); }}
        >
          <SectionEditor
            section={section}
            onUpdate={updated => onUpdate({ ...page, sections: page.sections.map(s => s.id === section.id ? updated : s) })}
            onDelete={() => onUpdate({ ...page, sections: page.sections.filter(s => s.id !== section.id) })}
            dragHandleProps={{
              draggable: true,
              onDragStart: e => { e.stopPropagation(); dragSecIdxRef.current = idx; setDragSecIdx(idx); },
            }}
            focusTitle={newSecId === section.id}
          />
        </div>
      ))}
      <div {...sentinelProps(page.sections.length)} />
      <FieldList fields={page.fields} onChange={fields => onUpdate({ ...page, fields })} />
      <div className="nt-page-body__actions">
        <div className="nt-page-body__actions-left">
          <button
            className="nt-modal__add-field"
            onClick={() => {
              if (page.fields.length > 0) {
                const sec = { id: crypto.randomUUID(), title: '', fields: [...page.fields] };
                setNewSecId(sec.id);
                onUpdate({ ...page, sections: [...page.sections, sec], fields: [] });
              } else {
                const sec = newSection();
                setNewSecId(sec.id);
                onUpdate({ ...page, sections: [...page.sections, sec] });
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
        {extraAction && <div className="nt-page-body__actions-right">{extraAction}</div>}
      </div>
    </div>
  );
}

// ─── NoteStructureSection ─────────────────────────────────────────────────────

export function NoteStructureSection({ fields, sections = [], pages, onFieldsChange, onSectionsChange, onPagesChange, labelClass = 'nt-modal__label', hintClass = 'nt-modal__fields-hint' }: {
  fields: NoteField[];
  sections?: NoteSection[];
  pages: NotePage[];
  onFieldsChange: (f: NoteField[]) => void;
  onSectionsChange?: (s: NoteSection[]) => void;
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
      const first = { ...newPage(), fields: [...fields], sections: [...sections] };
      const second = newPage();
      onPagesChange([first, second]);
      onFieldsChange([]);
      onSectionsChange?.([]);
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
          <PageBody
            page={{ id: '__virtual__', title: '', sections, fields }}
            onUpdate={p => { onSectionsChange?.(p.sections); onFieldsChange(p.fields); }}
            borderless
            extraAction={
              <button className="nt-add-page-btn" onClick={addPage}>+ Add Page</button>
            }
          />
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
