import React, { useState, useRef, useLayoutEffect } from 'react';
import { NoteField, NoteSection, NotePage, HAS_OPTIONS } from '../../pages/NoteTypes/noteTypeTypes';

function FieldPreviewCard({ field }: { field: NoteField }) {
  const hasOpts = HAS_OPTIONS.includes(field.type) && field.options.length > 0;
  return (
    <div className="nt-preview__field-card nt-preview__field-card--options">
      <div className="nt-preview__field-name">{field.title || <em>Untitled field</em>}</div>
      {field.type === 'Text' && (
        <div className="nt-preview__field-input">Text field</div>
      )}
      {field.type === 'Dropdown' && (
        <select className="nt-preview__field-select" defaultValue="">
          <option value="" disabled>Select…</option>
          {(hasOpts ? field.options : []).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      )}
      {field.type === 'Radio' && (
        <div className="nt-preview__field-options">
          {(hasOpts ? field.options : ['Option']).map((opt, i) => (
            <label key={i} className="nt-preview__field-option">
              <input type="radio" name={field.id} disabled readOnly />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
      {field.type === 'Checkbox' && (
        <div className="nt-preview__field-options">
          {(hasOpts ? field.options : ['Option']).map((opt, i) => (
            <label key={i} className="nt-preview__field-option">
              <input type="checkbox" disabled readOnly />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function NotePreviewPanel({ pages, sections = [], fields }: { pages: NotePage[]; sections?: NoteSection[]; fields: NoteField[] }) {
  const [previewIdx, setPreviewIdx] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevRectsRef = useRef<Record<string, DOMRect>>({});

  useLayoutEffect(() => {
    const cards = cardRefs.current;
    const prevRects = prevRectsRef.current;
    const newRects: Record<string, DOMRect> = {};
    Object.keys(cards).forEach(id => {
      if (cards[id]) newRects[id] = cards[id]!.getBoundingClientRect();
    });
    Object.keys(cards).forEach(id => {
      const el = cards[id];
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
    prevRectsRef.current = newRects;
  }, [fields]);

  const clampedIdx = Math.min(previewIdx, Math.max(0, pages.length - 1));
  const activePage = pages[clampedIdx];
  const flatFields = pages.length === 0 ? fields : (activePage?.fields ?? []);
  const activeSections = pages.length === 0 ? sections : (activePage?.sections ?? []);
  const isEmpty = pages.length === 0 && fields.length === 0 && sections.length === 0;

  function toggleSection(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="nt-preview">
      <div className="nt-preview__header-label">Preview</div>

      {pages.length > 0 && (
        <div className="nt-preview__nav">
          <span className="nt-preview__nav-info">
            <span className="nt-preview__nav-num">{clampedIdx + 1} of {pages.length}:</span>
            {' '}<strong>{activePage?.title || `Page ${clampedIdx + 1}`}</strong>
          </span>
          <div className="nt-preview__nav-btns">
            <button className="nt-preview__nav-btn" onClick={() => setPreviewIdx(p => Math.max(0, p - 1))} disabled={clampedIdx === 0}>
              ‹ Prev
            </button>
            <button className="nt-preview__nav-btn" onClick={() => setPreviewIdx(p => Math.min(pages.length - 1, p + 1))} disabled={clampedIdx === pages.length - 1}>
              Next ›
            </button>
          </div>
        </div>
      )}

      <div className="nt-preview__body">
        {isEmpty && (
          <div className="nt-preview__empty">Add fields to see a preview</div>
        )}
        {activeSections.map(section => (
          <div key={section.id} className="nt-preview__section">
            <button className="nt-preview__section-header" onClick={() => toggleSection(section.id)}>
              <span>{section.title || 'Untitled section'}</span>
              <svg
                className={`nt-preview__section-chevron${collapsed.has(section.id) ? ' nt-preview__section-chevron--collapsed' : ''}`}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            {!collapsed.has(section.id) && (
              <div className="nt-preview__section-fields">
                {section.fields.map(f => <FieldPreviewCard key={f.id} field={f} />)}
                {section.fields.length === 0 && <div className="nt-preview__section-empty">No fields yet</div>}
              </div>
            )}
          </div>
        ))}
        {flatFields.map(f => (
          <div key={f.id} ref={el => { cardRefs.current[f.id] = el; }}>
            <FieldPreviewCard field={f} />
          </div>
        ))}
      </div>
    </div>
  );
}
