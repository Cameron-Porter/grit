import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const createPageContent = readFileSync(resolve(process.cwd(), 'app/(app)/programs/create/page.tsx'), 'utf8');
const guidedBuilderContent = readFileSync(resolve(process.cwd(), 'components/guided-program-builder.tsx'), 'utf8');
const templateEditorCss = readFileSync(resolve(process.cwd(), 'app/template-editor.css'), 'utf8');

describe('Create Program page layout conventions and spacing', () => {
  it('uses the standard native gradient shell and header conventions', () => {
    expect(createPageContent).toContain('className="content native-page native-gradient-background native-create-page"');
    expect(createPageContent).toContain('className="page-header native-page-header"');
    expect(createPageContent).toContain('href="/programs">← Programs</Link>');
  });

  it('uses spacious layout containers for program details and exercise prescription fields', () => {
    expect(guidedBuilderContent).toContain('className="guided-program-basics"');
    expect(guidedBuilderContent).toContain('className="program-name-field"');
    expect(guidedBuilderContent).toContain('className="program-structure-fields"');
    expect(guidedBuilderContent).toContain('className="add-exercise-header"');
    expect(guidedBuilderContent).toContain('className="builder-target-grid"');
  });

  it('defines max-width expansion, flex bottom alignment, text truncation, and clean responsive breakpoints', () => {
    expect(templateEditorCss).toContain('.native-create-page {');
    expect(templateEditorCss).toContain('max-width: 760px;');
    expect(templateEditorCss).toContain('.builder-target-grid {');
    expect(templateEditorCss).toContain('grid-template-columns: repeat(5, minmax(0, 1fr));');
    expect(templateEditorCss).toContain('justify-content: flex-end;');
    expect(templateEditorCss).toContain('text-overflow: ellipsis;');
  });
});
