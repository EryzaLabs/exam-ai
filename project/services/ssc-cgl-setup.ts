/**
 * Quick Setup Guide for SSC CGL Mock Tests
 * 
 * This file demonstrates how to quickly set up and load SSC CGL papers
 * Copy this code to your app's initialization file
 */

import SSCCGLService from './ssc-cgl-service';

/**
 * STEP 1: Load papers when app starts
 * Add this to your App.tsx or _layout.tsx
 */
export async function initializeMockTests() {
  console.log('🚀 Initializing SSC CGL Mock Tests...');
  
  try {
    // Example: Load first few papers for testing
    const samplePapers = [
      {
        paperId: '6960f352756b52153608eea1',
        title: 'SSC CGL 2020 Tier-I Official Paper (Held On: 13 Aug 2021 Shift 1)',
      },
      {
        paperId: '6960f352756b52153608ee9b',
        title: 'SSC CGL 2020 Tier-I Official Paper (Held On: 13 Aug 2021 Shift 2)',
      },
      {
        paperId: '6960f351330e3069183b6c83',
        title: 'SSC CGL 2020 Tier-I Official Paper (Held On: 13 Aug 2021 Shift 3)',
      },
    ];

    for (const paper of samplePapers) {
      try {
        // In React Native, you'd use require() for JSON files
        // Make sure the files are in your project
        const paperData = require(`../SSC_CGL/${paper.title}__${paper.paperId}.json`);
        const answersData = require(`../ai_generated_answers/${paper.title}__${paper.paperId}.json`);
        
        if (paperData.success && paperData.data) {
          await SSCCGLService.loadPaper(paperData.data, answersData);
          console.log(`✅ Loaded: ${paper.title}`);
        }
      } catch (error) {
        console.error(`❌ Failed to load ${paper.title}:`, error);
      }
    }

    const loadedCount = SSCCGLService.getAllPapers().length;
    console.log(`🎉 Successfully loaded ${loadedCount} papers`);
    
    return loadedCount;
  } catch (error) {
    console.error('❌ Failed to initialize mock tests:', error);
    return 0;
  }
}

/**
 * STEP 2: Add to your main app file
 * 
 * In App.tsx or app/_layout.tsx:
 */

/*
import { useEffect } from 'react';
import { initializeMockTests } from './services/ssc-cgl-setup';

export default function App() {
  useEffect(() => {
    initializeMockTests();
  }, []);

  return (
    // Your app components
  );
}
*/

/**
 * STEP 3: Quick Test
 * 
 * Verify papers are loaded:
 */
export function testPapersLoaded() {
  const papers = SSCCGLService.getAllPapers();
  console.log(`📚 Total papers loaded: ${papers.length}`);
  
  papers.forEach((paper, index) => {
    console.log(`${index + 1}. ${paper.title}`);
    console.log(`   - Questions: ${paper.totalQuestions}`);
    console.log(`   - Duration: ${paper.duration / 60} minutes`);
    console.log(`   - Total Marks: ${paper.totalMarks}`);
    console.log(`   - Sections: ${paper.sections.length}`);
  });
  
  return papers.length > 0;
}

/**
 * ALTERNATIVE: Load ALL papers from directories
 * 
 * For production, you'd want to:
 * 1. List all files in SSC_CGL directory
 * 2. Match with corresponding answer files
 * 3. Load them dynamically
 */
export async function loadAllPapersFromDirectory() {
  // This would require using expo-file-system or similar
  // For now, manually list the papers you want to load
  
  const paperFileNames = [
    'SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 1__6960f352756b52153608eea1',
    'SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 2__6960f352756b52153608ee9b',
    'SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 3__6960f351330e3069183b6c83',
    // Add all 50+ papers here...
  ];

  let loaded = 0;
  for (const fileName of paperFileNames) {
    try {
      const paperData = require(`../SSC_CGL/${fileName}.json`);
      const answersData = require(`../ai_generated_answers/${fileName}.json`);
      
      if (paperData.success && paperData.data) {
        await SSCCGLService.loadPaper(paperData.data, answersData);
        loaded++;
      }
    } catch (error) {
      console.error(`Failed to load ${fileName}:`, error);
    }
  }

  return loaded;
}

/**
 * HELPER: Get papers by year
 */
export function getPapersByYear(year: number) {
  return SSCCGLService.getAllPapers().filter(
    paper => paper.metadata.year === year
  );
}

/**
 * HELPER: Get papers by exam type
 */
export function getPapersByExamType(examType: string) {
  return SSCCGLService.getAllPapers().filter(
    paper => paper.examType === examType
  );
}

/**
 * USAGE EXAMPLES:
 */

// Initialize on app start
// await initializeMockTests();

// Check what's loaded
// testPapersLoaded();

// Get specific papers
// const papers2021 = getPapersByYear(2021);
// const sscPapers = getPapersByExamType('SSC');

// Start a test
// const papers = SSCCGLService.getAllPapers();
// router.push({ pathname: '/mock-test', params: { testId: papers[0].id } });
