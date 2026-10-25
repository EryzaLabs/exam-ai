#!/usr/bin/env node

/**
 * Migration Script: Local Filesystem to AWS S3
 * 
 * This script migrates test papers, generated answers, and user reports from
 * local filesystem to AWS S3 buckets.
 */

import { S3Service } from '../src/services/s3-service';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration
const LOCAL_DIRS = {
  testpapers: path.resolve(__dirname, '../../testseries'),
  answers: path.resolve(__dirname, '../../ai_generated_answers'),
  reports: path.resolve(__dirname, '../../user_reports'),
  uploads: path.resolve(__dirname, '../../uploads'),
};

class MigrationService {
  private stats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  async migrateDirectory(
    localDir: string,
    s3Bucket: 'testpapers' | 'answers' | 'reports' | 'uploads',
    prefix: string = ''
  ): Promise<void> {
    console.log(`\n📁 Migrating ${localDir} to S3 bucket: ${s3Bucket}`);
    
    if (!fs.existsSync(localDir)) {
      console.log(`⚠️  Directory not found: ${localDir}`);
      return;
    }

    const files = this.getAllFiles(localDir);
    console.log(`Found ${files.length} files to migrate`);

    for (const filePath of files) {
      try {
        const relativePath = path.relative(localDir, filePath);
        const s3Key = prefix ? `${prefix}/${relativePath}` : relativePath;
        
        this.stats.total++;
        
        // Check if file already exists in S3
        const exists = await S3Service.fileExists(s3Bucket, s3Key);
        if (exists) {
          console.log(`⏭️  Skipped (already exists): ${s3Key}`);
          this.stats.skipped++;
          continue;
        }

        // Read file
        const fileBuffer = fs.readFileSync(filePath);
        
        // Determine content type
        const ext = path.extname(filePath).toLowerCase();
        const contentType = this.getContentType(ext);

        // Upload to S3
        await S3Service.uploadFile(s3Bucket, s3Key, fileBuffer, contentType);
        
        console.log(`✅ Uploaded: ${s3Key} (${(fileBuffer.length / 1024).toFixed(2)} KB)`);
        this.stats.success++;
        
      } catch (error) {
        console.error(`❌ Failed: ${filePath}`, error);
        this.stats.failed++;
      }
    }
  }

  private getAllFiles(dir: string): string[] {
    const files: string[] = [];
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      '.json': 'application/json',
      '.gz': 'application/gzip',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.txt': 'text/plain',
      '.html': 'text/html',
    };
    
    return types[ext] || 'application/octet-stream';
  }

  printStats(): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Statistics');
    console.log('='.repeat(50));
    console.log(`Total files:     ${this.stats.total}`);
    console.log(`✅ Successful:   ${this.stats.success}`);
    console.log(`⏭️  Skipped:      ${this.stats.skipped}`);
    console.log(`❌ Failed:       ${this.stats.failed}`);
    console.log('='.repeat(50));
  }
}

async function main() {
  console.log('🚀 Starting migration to AWS S3...\n');
  
  const migration = new MigrationService();

  try {
    // Migrate test papers
    await migration.migrateDirectory(
      LOCAL_DIRS.testpapers,
      'testpapers',
      'testseries'
    );

    // Migrate generated answers
    await migration.migrateDirectory(
      LOCAL_DIRS.answers,
      'answers',
      ''
    );

    // Migrate reports
    if (fs.existsSync(LOCAL_DIRS.reports)) {
      await migration.migrateDirectory(
        LOCAL_DIRS.reports,
        'reports',
        ''
      );
    }

    // Migrate uploads (optional - might want to skip temp files)
    if (fs.existsSync(LOCAL_DIRS.uploads)) {
      await migration.migrateDirectory(
        LOCAL_DIRS.uploads,
        'uploads',
        ''
      );
    }

    migration.printStats();
    
    console.log('\n✨ Migration completed!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();
