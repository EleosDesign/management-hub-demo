export type NoteFormat = 'Individual' | 'Group';
export type FieldType = 'Text' | 'Radio' | 'Checkbox' | 'Dropdown';

export interface NoteField {
  id: string;
  title: string;
  type: FieldType;
  options: string[];
}

export interface NoteSection {
  id: string;
  title: string;
  fields: NoteField[];
}

export interface NotePage {
  id: string;
  title: string;
  sections: NoteSection[];
  fields: NoteField[];
}

export const SITE_OPTIONS = [
  'Main Office', 'North Campus', 'South Clinic', 'East Branch',
];

export interface NoteType {
  id: string;
  name: string;
  format: NoteFormat;
  profession: string[];
  sites: string[];
  active: boolean;
  pages: NotePage[];
  sections: NoteSection[];
  fields: NoteField[];
  lastModified: string;
}

export const FIELD_TYPES: FieldType[] = ['Text', 'Radio', 'Checkbox', 'Dropdown'];
export const FORMAT_OPTIONS: NoteFormat[] = ['Individual', 'Group'];
export const HAS_OPTIONS: FieldType[] = ['Radio', 'Checkbox', 'Dropdown'];
export const PROFESSION_OPTIONS = [
  'Therapist', 'Psychiatrist', 'Counselor', 'Case Manager',
  'Social Worker', 'Peer Support Specialist', 'Nurse',
];
export const FORMAT_DESCRIPTIONS: Record<NoteFormat, string> = {
  Individual: 'Individual notes are for one-on-one sessions',
  Group: 'Group notes are for sessions with multiple participants',
};

export function newField(): NoteField {
  return { id: crypto.randomUUID(), title: '', type: 'Text', options: [] };
}
export function newSection(): NoteSection {
  return { id: crypto.randomUUID(), title: '', fields: [newField()] };
}
export function newPage(): NotePage {
  return { id: crypto.randomUUID(), title: '', sections: [], fields: [] };
}

export function countFields(pages: NotePage[], fields: NoteField[], sections: NoteSection[] = []): number {
  if (pages.length > 0) {
    return pages.reduce(
      (sum, p) => sum + p.fields.length + p.sections.reduce((ss, s) => ss + s.fields.length, 0),
      0,
    );
  }
  return fields.length + sections.reduce((sum, s) => sum + s.fields.length, 0);
}
