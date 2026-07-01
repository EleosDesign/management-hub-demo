import React, { useState, useRef } from 'react';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { Modal } from '../../components/Modal/Modal';
import { Switch } from '../../components/Switch/Switch';
import { SearchIcon, PlusIcon, ChevronDownIcon } from '../../components/icons';
import { EditNoteTypePanel } from '../../components/EditNoteTypePanel/EditNoteTypePanel';
import { NoteStructureSection } from './NoteStructureEditor';
import {
  NoteType, NoteFormat,
  FORMAT_OPTIONS, FORMAT_DESCRIPTIONS, PROFESSION_OPTIONS,
  countFields, newField,
} from './noteTypeTypes';
import './NoteTypesPage.css';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_NOTES: NoteType[] = [
  {
    id: '1', name: 'Psychiatry', format: 'Individual',
    description: 'Psychiatric evaluation and medication management sessions',
    active: true, lastModified: '1/15/2024', pages: [],
    fields: [
      { id: 'p1', title: 'Chief Complaint', type: 'Text', options: [] },
      { id: 'p2', title: 'Mental Status Exam', type: 'Text', options: [] },
      { id: 'p3', title: 'Diagnosis', type: 'Text', options: [] },
      { id: 'p4', title: 'Medications', type: 'Text', options: [] },
      { id: 'p5', title: 'Plan', type: 'Text', options: [] },
    ],
  },
  {
    id: '2', name: 'Case Management', format: 'Individual',
    description: 'Case management and care coordination notes',
    active: true, lastModified: '2/10/2024', pages: [],
    fields: [
      { id: 'cm1', title: 'Goals Reviewed', type: 'Checkbox', options: ['Housing', 'Employment', 'Benefits', 'Transportation', 'Medical'] },
      { id: 'cm2', title: 'Barriers Identified', type: 'Text', options: [] },
      { id: 'cm3', title: 'Action Steps', type: 'Text', options: [] },
      { id: 'cm4', title: 'Follow-up Date', type: 'Text', options: [] },
    ],
  },
  {
    id: '3', name: 'Peer Support', format: 'Individual',
    description: 'Peer support specialist sessions',
    active: true, lastModified: '2/1/2024', pages: [],
    fields: [
      { id: 'ps1', title: 'Session Focus', type: 'Radio', options: ['Recovery planning', 'Skill building', 'Crisis support', 'Community connection'] },
      { id: 'ps2', title: 'Topics Discussed', type: 'Text', options: [] },
      { id: 'ps3', title: 'Client Strengths Noted', type: 'Text', options: [] },
      { id: 'ps4', title: 'Next Steps', type: 'Text', options: [] },
    ],
  },
  {
    id: '4', name: 'Family Therapy', format: 'Group',
    description: 'Family therapy sessions with multiple participants',
    active: true, lastModified: '3/12/2024', pages: [],
    fields: [
      { id: 'ft1', title: 'Participants Present', type: 'Text', options: [] },
      { id: 'ft2', title: 'Presenting Issue', type: 'Text', options: [] },
      { id: 'ft3', title: 'Interventions Used', type: 'Text', options: [] },
      { id: 'ft4', title: 'Family Response', type: 'Text', options: [] },
      { id: 'ft5', title: 'Plan', type: 'Text', options: [] },
    ],
  },
  {
    id: '5', name: 'Play Therapy', format: 'Individual',
    description: 'Play therapy for children and adolescents',
    active: true, lastModified: '2/10/2024', pages: [],
    fields: [
      { id: 'pt1', title: 'Play Materials Used', type: 'Text', options: [] },
      { id: 'pt2', title: 'Themes Observed', type: 'Text', options: [] },
      { id: 'pt3', title: 'Emotional Expression', type: 'Radio', options: ['Minimal', 'Moderate', 'Full'] },
      { id: 'pt4', title: 'Clinician Observations', type: 'Text', options: [] },
    ],
  },
  {
    id: '6', name: 'Group Therapy', format: 'Group',
    description: 'Group therapy sessions for multiple clients',
    active: true, lastModified: '3/20/2024', pages: [],
    fields: [
      { id: 'gt1', title: 'Group Topic', type: 'Text', options: [] },
      { id: 'gt2', title: 'Attendance', type: 'Text', options: [] },
      { id: 'gt3', title: 'Group Dynamics', type: 'Text', options: [] },
      { id: 'gt4', title: 'Individual Participation Notes', type: 'Text', options: [] },
      { id: 'gt5', title: 'Plan', type: 'Text', options: [] },
    ],
  },
  {
    id: '7', name: 'Psychotherapy', format: 'Individual',
    description: 'Individual psychotherapy sessions',
    active: true, lastModified: '3/1/2024',
    fields: [],
    pages: [
      {
        id: 'pg1', title: 'Assessment', fields: [
          { id: 'py0', title: 'Chief Complaint', type: 'Text', options: [] },
        ],
        sections: [
          {
            id: 'sec1', title: 'Mental Status',
            fields: [
              { id: 'py1', title: 'Appearance & Behavior', type: 'Text', options: [] },
              { id: 'py2', title: 'Mood & Affect', type: 'Text', options: [] },
              { id: 'py3', title: 'Thought Process', type: 'Text', options: [] },
            ],
          },
          {
            id: 'sec2', title: 'Risk Assessment',
            fields: [
              { id: 'py7', title: 'Suicidal Ideation', type: 'Radio', options: ['None', 'Passive', 'Active'] },
              { id: 'py8', title: 'Safety Plan Reviewed', type: 'Radio', options: ['Yes', 'No'] },
            ],
          },
        ],
      },
      {
        id: 'pg2', title: 'Treatment', sections: [],
        fields: [
          { id: 'py4', title: 'Interventions Used', type: 'Text', options: [] },
          { id: 'py5', title: 'Client Response', type: 'Text', options: [] },
          { id: 'py6', title: 'Plan', type: 'Text', options: [] },
        ],
      },
    ],
  },
  {
    id: '8', name: 'Crisis Intervention', format: 'Individual',
    description: 'Emergency crisis intervention services',
    active: false, lastModified: '10/15/2024', pages: [],
    fields: [
      { id: 'ci1', title: 'Crisis Description', type: 'Text', options: [] },
      { id: 'ci2', title: 'Risk Level', type: 'Radio', options: ['Low', 'Moderate', 'High', 'Imminent'] },
      { id: 'ci3', title: 'Safety Plan Reviewed', type: 'Radio', options: ['Yes', 'No', 'N/A'] },
      { id: 'ci4', title: 'Disposition', type: 'Dropdown', options: ['Discharged to home', 'Referred to higher level of care', 'Hospitalized', 'Follow-up scheduled'] },
      { id: 'ci5', title: 'Follow-up Plan', type: 'Text', options: [] },
    ],
  },
];

const DEFAULT_FIELDS = [
  { id: 'f1', title: 'Data', type: 'Text' as const, options: [] },
  { id: 'f2', title: 'Assessment', type: 'Text' as const, options: [] },
  { id: 'f3', title: 'Plan', type: 'Text' as const, options: [] },
];

// ─── Add Note Type Modal ──────────────────────────────────────────────────────

type ImportStatus = 'idle' | 'loading' | 'done' | 'error';

const DEMO_IMPORT_FIELDS = [
  { id: '', title: 'Presenting Problem', type: 'Text' as const, options: [] },
  { id: '', title: 'Session Focus', type: 'Radio' as const, options: ['Individual goals', 'Crisis support', 'Skill building', 'Psychoeducation'] },
  { id: '', title: 'Interventions Used', type: 'Text' as const, options: [] },
  { id: '', title: 'Client Response', type: 'Radio' as const, options: ['Engaged', 'Resistant', 'Neutral', 'Distressed'] },
  { id: '', title: 'Progress Toward Goals', type: 'Radio' as const, options: ['Improving', 'Stable', 'Declining'] },
  { id: '', title: 'Plan', type: 'Text' as const, options: [] },
].map(f => ({ ...f, id: crypto.randomUUID() }));

function AddNoteTypeModal({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: (note: NoteType) => void;
}) {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<NoteFormat>('Individual');
  const [profession, setProfession] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [fields, setFields] = useState(DEFAULT_FIELDS.map(f => ({ ...f, id: crypto.randomUUID() })));
  const [pages, setPages] = useState<NoteType['pages']>([]);
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [dropOver, setDropOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName(''); setFormat('Individual'); setProfession(''); setDescription(''); setActive(true);
    setFields(DEFAULT_FIELDS.map(f => ({ ...f, id: crypto.randomUUID() })));
    setPages([]);
    setImportStatus('idle'); setImportFileName(''); setImportError('');
  }

  function handleClose() { resetForm(); onClose(); }

  function handleSave() {
    if (!isValid) return;
    onSave({
      id: crypto.randomUUID(),
      name: name.trim(), format, description, active,
      fields: pages.length > 0 ? [] : fields,
      pages,
      lastModified: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
    });
    resetForm(); onClose();
  }

  function applyImport(data: Partial<{ name: string; format: NoteFormat; description: string; fields: NoteType['fields']; pages: NoteType['pages'] }>) {
    if (data.name) setName(data.name);
    if (data.format) setFormat(data.format);
    if (data.description) setDescription(data.description);
    if (data.pages && data.pages.length > 0) { setPages(data.pages); setFields([]); }
    else if (data.fields && data.fields.length > 0) setFields(data.fields);
  }

  function handleFile(file: File) {
    setImportFileName(file.name);
    setImportError('');
    setImportStatus('loading');

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json' || file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          applyImport(parsed);
          setImportStatus('done');
        } catch {
          setImportError('Invalid JSON — could not parse the file.');
          setImportStatus('error');
        }
      };
      reader.readAsText(file);
    } else {
      // PDF or image: simulate extraction (demo)
      setTimeout(() => {
        applyImport({ fields: DEMO_IMPORT_FIELDS.map(f => ({ ...f, id: crypto.randomUUID() })) });
        setImportStatus('done');
      }, 1800);
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const isValid = name.trim().length > 0 && profession.length > 0 && countFields(pages, fields) > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Note Type"
      width={720}
      footer={
        <>
          <Button variant="outlined" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={!isValid}>Create Note Type</Button>
        </>
      }
    >
      {/* Import zone */}
      <div
        className={`nt-import-zone${dropOver ? ' nt-import-zone--over' : ''}${importStatus === 'done' ? ' nt-import-zone--done' : ''}${importStatus === 'error' ? ' nt-import-zone--error' : ''}`}
        onDragOver={e => { e.preventDefault(); setDropOver(true); }}
        onDragLeave={() => setDropOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json,.pdf,application/pdf,image/*"
          style={{ display: 'none' }}
          onChange={onFileInput}
        />
        {importStatus === 'idle' && (
          <>
            <div className="nt-import-zone__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div className="nt-import-zone__text">
              <span>Drop a file to import </span>
              <button className="nt-import-zone__browse" onClick={() => fileInputRef.current?.click()}>or browse</button>
            </div>
            <div className="nt-import-zone__hint">Supports JSON, PDF, or screenshots</div>
          </>
        )}
        {importStatus === 'loading' && (
          <>
            <div className="nt-import-zone__spinner" />
            <div className="nt-import-zone__text">Analyzing <strong>{importFileName}</strong>…</div>
          </>
        )}
        {importStatus === 'done' && (
          <>
            <div className="nt-import-zone__check">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="nt-import-zone__text"><strong>{importFileName}</strong> imported — review and adjust below</div>
            <button className="nt-import-zone__clear" onClick={() => { setImportStatus('idle'); setImportFileName(''); }}>Clear</button>
          </>
        )}
        {importStatus === 'error' && (
          <>
            <div className="nt-import-zone__text nt-import-zone__text--error">{importError}</div>
            <button className="nt-import-zone__clear" onClick={() => { setImportStatus('idle'); setImportFileName(''); setImportError(''); }}>Try again</button>
          </>
        )}
      </div>

      <div className="nt-import-divider"><span>or fill in manually</span></div>

      <div className="nt-modal__field">
        <label className="nt-modal__label">Note Type Name <span className="nt-modal__required">*</span></label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Psychiatry, Case Management" />
      </div>

      <div className="nt-modal__field">
        <label className="nt-modal__label">Note Format <span className="nt-modal__required">*</span></label>
        <div className="nt-modal__select-wrap">
          <select className="nt-modal__select" value={format} onChange={e => setFormat(e.target.value as NoteFormat)}>
            {FORMAT_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
          </select>
          <ChevronDownIcon size={16} color="var(--color-text-secondary)" />
        </div>
        <p className="nt-modal__hint">{FORMAT_DESCRIPTIONS[format]}</p>
      </div>

      <div className="nt-modal__field">
        <label className="nt-modal__label">Profession <span className="nt-modal__required">*</span></label>
        <div className="nt-modal__select-wrap">
          <select className="nt-modal__select" value={profession} onChange={e => setProfession(e.target.value)}>
            <option value="">Select profession...</option>
            {PROFESSION_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
          </select>
          <ChevronDownIcon size={16} color="var(--color-text-secondary)" />
        </div>
      </div>

      <div className="nt-modal__field">
        <label className="nt-modal__label">Description</label>
        <textarea
          className="nt-modal__textarea"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe what this note type is used for..."
          rows={3}
        />
      </div>

      <div className="nt-modal__divider" />

      <div className="nt-modal__active-row">
        <Switch checked={active} onChange={setActive} />
        <div>
          <div className="nt-modal__active-label">Active</div>
          <div className="nt-modal__active-hint">Inactive note types cannot be used for new documentation</div>
        </div>
      </div>

      <div className="nt-modal__divider" />

      <NoteStructureSection
        fields={fields}
        pages={pages}
        onFieldsChange={setFields}
        onPagesChange={setPages}
      />
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

export function NoteTypesPage() {
  const [notes, setNotes] = useState<NoteType[]>(MOCK_NOTES);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteType | null>(null);
  const [page, setPage] = useState(1);

  const filtered = notes.filter(n =>
    n.name.toLowerCase().includes(search.toLowerCase()) ||
    n.description.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearch(val: string) { setSearch(val); setPage(1); }
  function handleSave(note: NoteType) { setNotes(prev => [note, ...prev]); setPage(1); }
  function handleEdit(updated: NoteType) { setNotes(prev => prev.map(n => n.id === updated.id ? updated : n)); }
  function handleDelete(id: string) { setNotes(prev => prev.filter(n => n.id !== id)); }

  return (
    <div className="nt-page">
      <div className="nt-page__header">
        <h1 className="nt-page__title">Note Types</h1>
        <p className="nt-page__subtitle">Define custom note structures for behavioral health documentation based on your EHR</p>
      </div>

      <div className="users-table-card">
        <div className="table-action-bar">
          <div className="table-action-bar__search">
            <Input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search note types..."
              startIcon={<SearchIcon size={18} color="var(--color-text-secondary)" />}
            />
          </div>
          <Button variant="primary" icon={<PlusIcon size={16} color="white" />} onClick={() => setAddOpen(true)}>
            Add Note Type
          </Button>
        </div>

        <div className="nt-table-wrap">
          <table className="data-table nt-table">
            <thead>
              <tr>
                <th className="nt-table__th nt-table__th--name">Name</th>
                <th className="nt-table__th">Format</th>
                <th className="nt-table__th nt-table__th--desc">Description</th>
                <th className="nt-table__th">Status</th>
                <th className="nt-table__th nt-table__th--date">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(note => (
                <tr key={note.id} className="nt-table__row" onClick={() => setEditingNote(note)} style={{ cursor: 'pointer' }}>
                  <td className="nt-table__name">{note.name}</td>
                  <td><span className="nt-format-badge">{note.format}</span></td>
                  <td className="nt-table__desc">{note.description}</td>
                  <td>
                    <span className={`nt-status-badge nt-status-badge--${note.active ? 'active' : 'inactive'}`}>
                      {note.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="nt-table__date">{note.lastModified}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="nt-table__empty">No note types found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="nt-pagination">
            <span className="nt-pagination__info">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="nt-pagination__controls">
              <button
                className="nt-pagination__btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`nt-pagination__btn nt-pagination__btn--page${currentPage === p ? ' nt-pagination__btn--active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="nt-pagination__btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <AddNoteTypeModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSave} />
      <EditNoteTypePanel
        noteType={editingNote}
        onClose={() => setEditingNote(null)}
        onSave={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
