#!/usr/bin/env node
"use strict";
/**
 * CLI Tool: Process Folder of PDFs
 * Usage: npm run process-folder -- ./pdfs
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables
dotenv_1.default.config();
const pdf_processor_1 = require("../services/pdf-processor");
const database_1 = require("../services/database");
async function main() {
    const folderPath = process.argv[2];
    if (!folderPath) {
        console.error('❌ Please provide a folder path');
        console.log('Usage: npm run process-folder -- ./path/to/pdfs');
        process.exit(1);
    }
    const fullPath = path_1.default.resolve(folderPath);
    if (!fs_1.default.existsSync(fullPath)) {
        console.error('❌ Folder not found:', fullPath);
        process.exit(1);
    }
    // Find all PDF files
    const files = fs_1.default.readdirSync(fullPath)
        .filter(f => f.toLowerCase().endsWith('.pdf'))
        .map(f => path_1.default.join(fullPath, f));
    if (files.length === 0) {
        console.error('❌ No PDF files found in folder');
        process.exit(1);
    }
    console.log(`📁 Found ${files.length} PDF files`);
    console.log('⏳ Processing...\n');
    const processor = new pdf_processor_1.PDFProcessor();
    const db = new database_1.QuestionDatabase();
    let successCount = 0;
    let failCount = 0;
    let totalQuestions = 0;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = path_1.default.basename(file);
        console.log(`[${i + 1}/${files.length}] Processing: ${fileName}`);
        try {
            const result = await processor.processPDF(file);
            if (result.status === 'completed' && result.results) {
                await db.importQuestions(result.results);
                const questionCount = result.results.extractedQuestions.length;
                totalQuestions += questionCount;
                successCount++;
                console.log(`  ✅ Success - ${questionCount} questions extracted`);
            }
            else {
                failCount++;
                console.log(`  ❌ Failed`);
            }
        }
        catch (error) {
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
//# sourceMappingURL=process-folder.js.map