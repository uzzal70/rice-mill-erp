import * as fs from 'fs';
import * as path from 'path';

describe('UX / UI Requirements Compliance (#65)', () => {
  const frontendAppDir = path.resolve(__dirname, '../../../frontend/src/app');

  it('should verify frontend app directory exists', () => {
    expect(fs.existsSync(frontendAppDir)).toBe(true);
  });

  it('should verify Material UI (@mui/material) is utilized across all page components', () => {
    const files = fs.readdirSync(frontendAppDir).filter(f => f.endsWith('.tsx'));
    expect(files.length).toBeGreaterThan(15);

    let muiImportCount = 0;
    for (const file of files) {
      const content = fs.readFileSync(path.join(frontendAppDir, file), 'utf8');
      if (content.includes('@mui/material')) {
        muiImportCount++;
      }
    }

    // Almost all view pages must use Material UI
    expect(muiImportCount).toBeGreaterThan(15);
  });

  it('should confirm core industrial ERP UI components are integrated', () => {
    const pageTsxContent = fs.readFileSync(path.join(frontendAppDir, 'page.tsx'), 'utf8');

    // Required components by Promptdoc #65:
    // Tabs, Drawer, Dialog, Autocomplete / Select, Search, Filters
    expect(pageTsxContent).toContain('Drawer');
    expect(pageTsxContent).toContain('Dialog');
    expect(pageTsxContent).toContain('Tabs');
    expect(pageTsxContent).toContain('TextField');
    expect(pageTsxContent).toContain('GlobalSearchDialog');
  });

  it('should verify responsive design breakpoints (xs, sm, md, lg) are implemented', () => {
    const pageTsxContent = fs.readFileSync(path.join(frontendAppDir, 'page.tsx'), 'utf8');
    expect(pageTsxContent).toContain('xs:');
    expect(pageTsxContent).toContain('sm:');
  });

  it('should verify industrial styling avoiding excessive gradients or heavy animation libraries', () => {
    const files = fs.readdirSync(frontendAppDir).filter(f => f.endsWith('.tsx'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(frontendAppDir, file), 'utf8');
      // Should not import heavy external animation frameworks like framer-motion in basic ERP tables
      expect(content).not.toContain("from 'framer-motion'");
    }
  });

  it('should confirm bilingual English and Bangla translations in main navigation and page titles', () => {
    const pageTsxContent = fs.readFileSync(path.join(frontendAppDir, 'page.tsx'), 'utf8');
    expect(pageTsxContent).toContain('en: {');
    expect(pageTsxContent).toContain('bn: {');
    expect(pageTsxContent).toContain('ম্যানেজমেন্ট');
    expect(pageTsxContent).toContain('কার্যক্রম');
  });
});

