import { analyze } from '../lib/parser';
import { NextAdapter } from '../lib/adapters/next-adapter';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  const root = process.argv[2] || '.';
  const outputFile = process.argv[3];

  console.log(`Analyzing repository at: ${path.resolve(root)}`);
  const result = await analyze(root, NextAdapter);

  console.log('\nStats:');
  console.log(`  Total files:   ${result.stats.totalFiles}`);
  console.log(`  Parsed files:  ${result.stats.parsedFiles}`);
  console.log(`  Skipped files: ${result.stats.skippedFiles}`);

  if (result.skipped.length > 0) {
    console.log('\nSkipped files (first 10):');
    result.skipped.slice(0, 10).forEach(s => {
      console.log(`  ${s.path}: ${s.reason}`);
    });
    if (result.skipped.length > 10) console.log(`  ... and ${result.skipped.length - 10} more`);
  }

  if (result.unresolved.length > 0) {
    console.log('\nUnresolved imports (first 10):');
    result.unresolved.slice(0, 10).forEach(u => {
      console.log(`  ${u.file} -> ${u.specifier} (${u.reason})`);
    });
    if (result.unresolved.length > 10) console.log(`  ... and ${result.unresolved.length - 10} more`);
  }

  const distinctFolders = new Set(result.nodes.map(n => n.folder));
  console.log(`\nDistinct folders: ${distinctFolders.size}`);

  if (outputFile) {
    await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
    console.log(`\nResult written to ${outputFile}`);
  }
}

main().catch(console.error);
