#!/usr/bin/env node
/**
 * CLI Tool: Process Folder of PDFs
 * Usage: npm run process-folder -- ./pdfs
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

import { PDFProcessor } from '../services/pdf-processor';
import { QuestionDatabase } from '../services/database';

async function main() {
  const folderPath = process.argv[2];

  if (!folderPath) {
    console.error('❌ Please provide a folder path');
    console.log('Usage: npm run process-folder -- ./path/to/pdfs');
    process.exit(1);
  }

  const fullPath = path.resolve(folderPath);

  if (!fs.existsSync(fullPath)) {
    console.error('❌ Folder not found:', fullPath);
    process.exit(1);
  }

  // Find all PDF files
  const files = fs.readdirSync(fullPath)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(fullPath, f));

  if (files.length === 0) {
    console.error('❌ No PDF files found in folder');
    process.exit(1);
  }

  console.log(`📁 Found ${files.length} PDF files`);
  console.log('⏳ Processing...\n');

  const processor = new PDFProcessor();
  const db = new QuestionDatabase();

  let successCount = 0;
  let failCount = 0;
  let totalQuestions = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = path.basename(file);
    
    console.log(`[${i + 1}/${files.length}] Processing: ${fileName}`);

    try {
      const result = await processor.processPDF(file);

      if (result.status === 'completed' && result.results) {
        await db.importQuestions(result.results);
        
        const questionCount = result.results.extractedQuestions.length;
        totalQuestions += questionCount;
        successCount++;

        console.log(`  ✅ Success - ${questionCount} questions extracted`);
      } else {
        failCount++;
        console.log(`  ❌ Failed`);
      }
    } catch (error) {
      failCount++;
      console.log(`  ❌ Error: ${error}`);
    }

    console.log('');
  }

  console.log('📊 Summary:');
  console.log(`  - Total PDFs: ${files.length}`);
  console.log(`  - Successful: ${successCount}`);
  console.log(`  - Failed: ${failCount}`);
  console.log(`  - Total Questions: ${totalQuestions}`);

  db.close();
}

main();
