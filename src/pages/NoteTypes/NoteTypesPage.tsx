import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { Modal } from '../../components/Modal/Modal';
import { SearchIcon, PlusIcon, ChevronDownIcon } from '../../components/icons';
import { EditNoteTypePanel } from '../../components/EditNoteTypePanel/EditNoteTypePanel';
import { NotePreviewPanel } from '../../components/NotePreviewPanel/NotePreviewPanel';
import { NoteStructureSection } from './NoteStructureEditor';
import {
  NoteType, NoteFormat, NoteField, NotePage,
  FORMAT_OPTIONS, FORMAT_DESCRIPTIONS, PROFESSION_OPTIONS, SITE_OPTIONS,
  countFields, newField,
} from './noteTypeTypes';
import './NoteTypesPage.css';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_NOTES: NoteType[] = [
  {
    id: '1', name: 'Psychiatry', format: 'Individual', profession: ['Psychiatrist'],
    sites: ['Main Office'],
    lastModified: '1/15/2024', sections: [], pages: [],
    fields: [
      { id: 'p1', title: 'Chief Complaint', type: 'Text', options: [] },
      { id: 'p2', title: 'Mental Status Exam', type: 'Text', options: [] },
      { id: 'p3', title: 'Diagnosis', type: 'Text', options: [] },
      { id: 'p4', title: 'Medications', type: 'Text', options: [] },
      { id: 'p5', title: 'Plan', type: 'Text', options: [] },
    ],
  },
  {
    id: '2', name: 'Case Management', format: 'Individual', profession: ['Case Manager'],
    sites: ['Main Office'],
    lastModified: '2/10/2024', sections: [], pages: [],
    fields: [
      { id: 'cm1', title: 'Goals Reviewed', type: 'Checkbox', options: ['Housing', 'Employment', 'Benefits', 'Transportation', 'Medical'] },
      { id: 'cm2', title: 'Barriers Identified', type: 'Text', options: [] },
      { id: 'cm3', title: 'Action Steps', type: 'Text', options: [] },
      { id: 'cm4', title: 'Follow-up Date', type: 'Text', options: [] },
    ],
  },
  {
    id: '3', name: 'Peer Support', format: 'Individual', profession: ['Peer Support Specialist'],
    sites: ['Main Office'],
    lastModified: '2/1/2024', sections: [], pages: [],
    fields: [
      { id: 'ps1', title: 'Session Focus', type: 'Radio', options: ['Recovery planning', 'Skill building', 'Crisis support', 'Community connection'] },
      { id: 'ps2', title: 'Topics Discussed', type: 'Text', options: [] },
      { id: 'ps3', title: 'Client Strengths Noted', type: 'Text', options: [] },
      { id: 'ps4', title: 'Next Steps', type: 'Text', options: [] },
    ],
  },
  {
    id: '4', name: 'Family Therapy', format: 'Group', profession: ['Therapist'],
    sites: ['Main Office'],
    lastModified: '3/12/2024', sections: [], pages: [],
    fields: [
      { id: 'ft1', title: 'Participants Present', type: 'Text', options: [] },
      { id: 'ft2', title: 'Presenting Issue', type: 'Text', options: [] },
      { id: 'ft3', title: 'Interventions Used', type: 'Text', options: [] },
      { id: 'ft4', title: 'Family Response', type: 'Text', options: [] },
      { id: 'ft5', title: 'Plan', type: 'Text', options: [] },
    ],
  },
  {
    id: '5', name: 'Play Therapy', format: 'Individual', profession: ['Counselor'],
    sites: ['Main Office'],
    lastModified: '2/10/2024', sections: [], pages: [],
    fields: [
      { id: 'pt1', title: 'Play Materials Used', type: 'Text', options: [] },
      { id: 'pt2', title: 'Themes Observed', type: 'Text', options: [] },
      { id: 'pt3', title: 'Emotional Expression', type: 'Radio', options: ['Minimal', 'Moderate', 'Full'] },
      { id: 'pt4', title: 'Clinician Observations', type: 'Text', options: [] },
    ],
  },
  {
    id: '6', name: 'Group Therapy', format: 'Group', profession: ['Therapist'],
    sites: ['Main Office'],
    lastModified: '3/20/2024', sections: [], pages: [],
    fields: [
      { id: 'gt1', title: 'Group Topic', type: 'Text', options: [] },
      { id: 'gt2', title: 'Attendance', type: 'Text', options: [] },
      { id: 'gt3', title: 'Group Dynamics', type: 'Text', options: [] },
      { id: 'gt4', title: 'Individual Participation Notes', type: 'Text', options: [] },
      { id: 'gt5', title: 'Plan', type: 'Text', options: [] },
    ],
  },
  {
    id: '7', name: 'Psychotherapy', format: 'Individual', profession: ['Therapist'],
    sites: ['Main Office'],
    lastModified: '3/1/2024',
    fields: [], sections: [],
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
    id: '8', name: 'Crisis Intervention', format: 'Individual', profession: ['Counselor'],
    sites: ['Main Office'],
    lastModified: '10/15/2024', sections: [], pages: [],
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

type ImportStatus = 'idle' | 'staged' | 'loading' | 'done' | 'error';

const DEMO_IMPORT_NAME = 'Outpatient Progress Note';
const DEMO_IMPORT_FIELDS = [
  { id: '', title: 'Delivery of Service', type: 'Checkbox' as const, options: ['Face-to-Face', 'Phone', 'Telehealth/Video'] },
  { id: '', title: 'Location of Provider', type: 'Dropdown' as const, options: [] },
  { id: '', title: 'Location of Client', type: 'Dropdown' as const, options: [] },
  { id: '', title: 'Mode of Transmission of Telehealth Service', type: 'Dropdown' as const, options: ['ITV'] },
  { id: '', title: 'Basis for determining telehealth is an appropriate and effective means of delivering services', type: 'Checkbox' as const, options: ['Best option available for service delivery', 'Other (comment below)'] },
  { id: '', title: 'Update/Assessment', type: 'Text' as const, options: [] },
  { id: '', title: 'Type of Focused Intervention (If Applicable)', type: 'Checkbox' as const, options: ['AAT', 'ABC', 'ART', 'Bounce Back', 'CBITS', 'CBT', 'CPP', 'DBT', 'EFT', 'EMDR', 'IFS', 'MAI', 'MI', 'Narrative Therapy', 'PCIT', 'Solution Focused', 'TFCBT'] },
  { id: '', title: 'Intervention', type: 'Text' as const, options: [] },
  { id: '', title: 'Plan', type: 'Text' as const, options: [] },
].map(f => ({ ...f, id: crypto.randomUUID() }));

function AddNoteTypeModal({ open, onClose, onSave, existingNames }: {
  open: boolean;
  onClose: () => void;
  onSave: (note: NoteType) => void;
  existingNames: string[];
}) {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<NoteFormat>('Individual');
  const [profession, setProfession] = useState<string[]>([]);
  const [sites, setSites] = useState<string[]>([]);
  const [fields, setFields] = useState(DEFAULT_FIELDS.map(f => ({ ...f, id: crypto.randomUUID() })));
  const [sections, setSections] = useState<NoteType['sections']>([]);
  const [pages, setPages] = useState<NoteType['pages']>([]);
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importFileName, setImportFileName] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [importError, setImportError] = useState('');
  const [dropOver, setDropOver] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [pasteJson, setPasteJson] = useState('');
  const [pasteError, setPasteError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName(''); setFormat('Individual'); setProfession([]); setSites([]);
    setFields(DEFAULT_FIELDS.map(f => ({ ...f, id: crypto.randomUUID() })));
    setSections([]);
    setPages([]);
    setImportStatus('idle'); setImportFileName(''); setImportError(''); setStagedFiles([]);
    setImportMode('file'); setPasteJson(''); setPasteError('');
  }

  function handleClose() { resetForm(); onClose(); }

  function handleSave() {
    if (!isValid) return;
    onSave({
      id: crypto.randomUUID(),
      name: name.trim(), format, profession, sites,
      fields: pages.length > 0 ? [] : fields,
      sections: pages.length > 0 ? [] : sections,
      pages,
      lastModified: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
    });
    resetForm(); onClose();
  }

  function toggleProfession(opt: string) {
    setProfession(prev => prev.includes(opt) ? prev.filter(p => p !== opt) : [...prev, opt]);
  }

  function applyImport(data: Partial<{ name: string; format: NoteFormat; fields: NoteType['fields']; pages: NoteType['pages'] }>) {
    if (data.name) setName(data.name);
    if (data.format) setFormat(data.format);
    if (data.pages && data.pages.length > 0) { setPages(data.pages); setFields([]); }
    else if (data.fields && data.fields.length > 0) setFields(data.fields);
  }

  function handleFiles(files: File[]) {
    if (files.length === 0) return;
    setImportError('');
    setImportStatus('loading');
    const label = files.length === 1 ? files[0].name : `${files[0].name} +${files.length - 1} more`;
    setImportFileName(label);

    const promises = files.map(file => new Promise<NoteType['fields']>(resolve => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'json' || file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const parsed = JSON.parse(e.target?.result as string);
            resolve((parsed.fields ?? []).map((f: NoteType['fields'][number]) => ({ ...f, id: crypto.randomUUID() })));
          } catch {
            resolve([]);
          }
        };
        reader.readAsText(file);
      } else {
        setTimeout(() => {
          setName(DEMO_IMPORT_NAME);
          resolve(DEMO_IMPORT_FIELDS.map(f => ({ ...f, id: crypto.randomUUID() })));
        }, 1200);
      }
    }));

    Promise.all(promises).then(allFields => {
      const seen = new Set<string>();
      const merged = allFields.flat().filter(f => {
        if (seen.has(f.title)) return false;
        seen.add(f.title);
        return true;
      });
      if (merged.length > 0) {
        setFields(merged);
        setPages([]);
      }
      setImportStatus('done');
    });
  }

  function stageFiles(files: File[]) {
    if (!files.length) return;
    const label = files.length === 1 ? files[0].name : `${files[0].name} +${files.length - 1} more`;
    setStagedFiles(files);
    setImportFileName(label);
    setImportStatus('staged');
    setImportError('');
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) stageFiles(files);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) stageFiles(files);
  }

  function handleAnalyze() {
    handleFiles(stagedFiles);
    setStagedFiles([]);
  }

  function handlePasteApply() {
    setPasteError('');
    try {
      const parsed = JSON.parse(pasteJson);
      applyImport(parsed);
      setImportStatus('done');
      setImportFileName('pasted JSON');
    } catch {
      setPasteError('Invalid JSON — check your syntax and try again.');
    }
  }

  const nameTaken = existingNames.some(n => n.toLowerCase() === name.trim().toLowerCase());
  const isValid = name.trim().length > 0 && !nameTaken && profession.length > 0 && sites.length > 0 && countFields(pages, fields, sections) > 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Note Type"
      width={1040}
      footer={
        <>
          <Button variant="outlined" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={!isValid}>Create Note Type</Button>
        </>
      }
    >
      <div className="nt-modal__split">
      <div className="nt-modal__split-left">
      <div className="nt-modal__field">
        <label className="nt-modal__label">Note Type Name <span className="nt-modal__required">*</span></label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Psychiatry, Case Management" />
        {nameTaken && <p className="nt-field-error" role="alert">A note type with this name already exists</p>}
      </div>

      <div className="nt-modal__field">
        <label className="nt-modal__label">Service Type <span className="nt-modal__required">*</span></label>
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
        <div className="nt-profession-checkboxes">
          {PROFESSION_OPTIONS.map(opt => (
            <label key={opt} className="nt-profession-checkbox">
              <input
                type="checkbox"
                checked={profession.includes(opt)}
                onChange={() => toggleProfession(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>

      </div>

      <div className="nt-modal__field">
        <label className="nt-modal__label">Site <span className="nt-modal__required">*</span></label>
        <div className="nt-profession-checkboxes">
          {SITE_OPTIONS.map(opt => (
            <label key={opt} className="nt-profession-checkbox">
              <input
                type="checkbox"
                checked={sites.includes(opt)}
                onChange={() => setSites(prev => prev.includes(opt) ? prev.filter(s => s !== opt) : [...prev, opt])}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="nt-modal__divider" />

      {/* Import zone — above Note Structure */}
      <div className="nt-import-wrap">
        <div className="nt-import-tabs">
          <button
            className={`nt-import-tab${importMode === 'file' ? ' nt-import-tab--active' : ''}`}
            onClick={() => setImportMode('file')}
          >
            Upload file
          </button>
          <button
            className={`nt-import-tab${importMode === 'paste' ? ' nt-import-tab--active' : ''}`}
            onClick={() => setImportMode('paste')}
          >
            Paste JSON
          </button>
        </div>

        {importMode === 'file' ? (
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
              multiple
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
                  <span>Drop files to import </span>
                  <button className="nt-import-zone__browse" onClick={() => fileInputRef.current?.click()}>or browse</button>
                </div>
                <div className="nt-import-zone__hint">JSON, PDF, or screenshot — select multiple</div>
              </>
            )}
            {importStatus === 'staged' && (
              <>
                <div className="nt-import-zone__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div className="nt-import-zone__text"><strong>{importFileName}</strong> ready to analyze</div>
                <div className="nt-import-zone__staged-actions">
                  <button className="nt-import-zone__analyze-btn" onClick={handleAnalyze}>
                    Analyze file{stagedFiles.length > 1 ? 's' : ''}
                  </button>
                  <button className="nt-import-zone__clear" onClick={() => { setImportStatus('idle'); setStagedFiles([]); setImportFileName(''); }}>Remove</button>
                </div>
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
        ) : (
          <div className="nt-import-paste">
            <textarea
              className="nt-import-paste__textarea"
              value={pasteJson}
              onChange={e => { setPasteJson(e.target.value); setPasteError(''); }}
              placeholder={'{\n  "name": "...",\n  "fields": [\n    { "title": "...", "type": "Text", "options": [] }\n  ]\n}'}
              rows={6}
              spellCheck={false}
            />
            {pasteError && <div className="nt-import-paste__error">{pasteError}</div>}
            {importStatus === 'done' && importMode === 'paste' && (
              <div className="nt-import-paste__success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Applied — review and adjust the structure below
              </div>
            )}
            <button
              className="nt-import-paste__apply"
              onClick={handlePasteApply}
              disabled={!pasteJson.trim()}
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="nt-import-divider"><span>or build manually</span></div>

      <NoteStructureSection
        fields={fields}
        sections={sections}
        pages={pages}
        onFieldsChange={setFields}
        onSectionsChange={setSections}
        onPagesChange={setPages}
      />
      </div>{/* split-left */}
      <div className="nt-modal__split-right">
        <NotePreviewPanel pages={pages} sections={sections} fields={fields} />
      </div>
      </div>{/* split */}
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export function NoteTypesPage() {
  const [notes, setNotes] = useState<NoteType[]>(MOCK_NOTES);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteType | null>(null);
  const [editingIsDuplicate, setEditingIsDuplicate] = useState(false);
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  }

  const filtered = notes.filter(n =>
    n.name.toLowerCase().includes(search.toLowerCase()) ||
    n.sites.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const sorted = sortCol ? [...filtered].sort((a, b) => {
    let av = '', bv = '';
    if (sortCol === 'name') { av = a.name; bv = b.name; }
    else if (sortCol === 'format') { av = a.format; bv = b.format; }
    else if (sortCol === 'profession') { av = a.profession.join(', '); bv = b.profession.join(', '); }
    else if (sortCol === 'sites') { av = a.sites.join(', '); bv = b.sites.join(', '); }
    else if (sortCol === 'lastModified') { av = a.lastModified; bv = b.lastModified; }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  }) : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearch(val: string) { setSearch(val); setPage(1); }
  function handleSave(note: NoteType) { setNotes(prev => [note, ...prev]); setPage(1); }
  function handleEdit(updated: NoteType) {
    setNotes(prev =>
      prev.some(n => n.id === updated.id)
        ? prev.map(n => n.id === updated.id ? updated : n)
        : [updated, ...prev]
    );
  }
  function handleDelete(id: string) { setNotes(prev => prev.filter(n => n.id !== id)); }
  function handleDuplicate(note: NoteType) {
    const existingNames = notes.map(n => n.name.toLowerCase());
    let candidateName = `${note.name} (copy)`;
    let counter = 2;
    while (existingNames.includes(candidateName.toLowerCase())) {
      candidateName = `${note.name} (copy ${counter++})`;
    }
    const duplicate: NoteType = {
      ...JSON.parse(JSON.stringify(note)),
      id: crypto.randomUUID(),
      name: candidateName,
      lastModified: new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
    };
    setEditingNote(duplicate);
    setEditingIsDuplicate(true);
  }

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
              aria-label="Search note types"
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
                {([
                  ['name', 'Name', 'nt-table__th--name'],
                  ['format', 'Service Type', ''],
                  ['profession', 'Profession', ''],
                  ['sites', 'Site', 'nt-table__th--desc'],
                  ['lastModified', 'Last Modified', 'nt-table__th--date'],
                ] as [string, string, string][]).map(([col, label, extra]) => (
                  <th
                    key={col}
                    className={`nt-table__th ${extra}`.trim()}
                    aria-sort={sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      className={`nt-table__sort-btn${sortCol === col ? ' nt-table__sort-btn--active' : ''}`}
                      onClick={() => toggleSort(col)}
                      aria-label={`Sort by ${label}${sortCol === col ? `, ${sortDir === 'asc' ? 'ascending' : 'descending'}` : ''}`}
                    >
                      {label}
                      <span className="nt-table__sort-icon" aria-hidden="true">
                        <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                          <path d="M4 0L8 5H0L4 0Z" fill={sortCol === col && sortDir === 'asc' ? 'var(--color-primary-main)' : 'currentColor'} />
                        </svg>
                        <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                          <path d="M4 5L0 0H8L4 5Z" fill={sortCol === col && sortDir === 'desc' ? 'var(--color-primary-main)' : 'currentColor'} />
                        </svg>
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(note => (
                <tr
                  key={note.id}
                  className="nt-table__row"
                  onClick={() => { setEditingNote(note); setEditingIsDuplicate(false); }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingNote(note); setEditingIsDuplicate(false); } }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Edit ${note.name}`}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="nt-table__name">{note.name}</td>
                  <td><span className="nt-format-badge">{note.format}</span></td>
                  <td>{note.profession.join(', ')}</td>
                  <td className="nt-table__desc">{note.sites.join(', ')}</td>
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

      <AddNoteTypeModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSave} existingNames={notes.map(n => n.name)} />
      <EditNoteTypePanel
        noteType={editingNote}
        onClose={() => { setEditingNote(null); setEditingIsDuplicate(false); }}
        onSave={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        focusName={editingIsDuplicate}
        existingNames={notes.filter(n => n.id !== editingNote?.id).map(n => n.name)}
      />
    </div>
  );
}
