/**
 * SSC CGL Data Loader
 * Loads SSC CGL test papers and AI-generated answers into the service
 */

import SSCCGLService, { SSCCGLPaper, SSCCGLPaperWithAnswers } from './ssc-cgl-service';

// Import all SSC CGL papers
// Note: In a production app, you'd dynamically import these from files or an API
const SSC_CGL_PAPERS = require('../../SSC_CGL');
const AI_ANSWERS = require('../../ai_generated_answers');

export async function loadAllSSCCGLPapers(): Promise<void> {
  try {
    console.log('Loading SSC CGL papers...');

    // List of paper files (you'd get this dynamically in a real app)
    const paperFiles = [
      'SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 1__6960f352756b52153608eea1',
      'SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 2__6960f352756b52153608ee9b',
      'SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 3__6960f351330e3069183b6c83',
      // Add more paper file names here
    ];

    for (const paperFileName of paperFiles) {
      try {
        // Load paper data
        const paperData: { success: boolean; data: SSCCGLPaper } = SSC_CGL_PAPERS[paperFileName];
        
        if (!paperData.success || !paperData.data) {
          console.warn(`Skipping ${paperFileName}: Invalid data`);
          continue;
        }

        // Try to load corresponding AI answers
        let answersData: SSCCGLPaperWithAnswers | undefined;
        try {
          answersData = AI_ANSWERS[paperFileName];
        } catch (e) {
          console.warn(`No AI answers found for ${paperFileName}`);
        }

        // Load into service
        await SSCCGLService.loadPaper(paperData.data, answersData);
        console.log(`Loaded: ${paperData.data.title}`);
      } catch (error) {
        console.error(`Error loading ${paperFileName}:`, error);
      }
    }

    console.log(`Successfully loaded ${SSCCGLService.getAllPapers().length} papers`);
  } catch (error) {
    console.error('Error loading SSC CGL papers:', error);
    throw error;
  }
}

/**
 * Load papers from JSON files (for React Native)
 * This version works with Expo's asset loading system
 */
export async function loadPapersFromAssets(): Promise<void> {
  // For demonstration, we'll manually load a few papers
  // In production, you'd have a proper asset loading mechanism
  
  const samplePapers = [
    {
      paper: require('../../SSC_CGL/SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 1__6960f352756b52153608eea1.json'),
      answers: require('../../ai_generated_answers/SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 1__6960f352756b52153608eea1.json'),
    },
    // Add more papers as needed
  ];

  for (const { paper, answers } of samplePapers) {
    if (paper.success && paper.data) {
      await SSCCGLService.loadPaper(paper.data, answers);
    }
  }
}

/**
 * Get statistics about loaded papers
 */
export function getLoadedPapersStats() {
  const papers = SSCCGLService.getAllPapers();
  
  const stats = {
    totalPapers: papers.length,
    totalQuestions: papers.reduce((sum, p) => sum + p.totalQuestions, 0),
    byYear: {} as Record<number, number>,
    byExamType: {} as Record<string, number>,
  };

  papers.forEach((paper) => {
    // Count by year
    if (paper.metadata.year) {
      stats.byYear[paper.metadata.year] = (stats.byYear[paper.metadata.year] || 0) + 1;
    }

    // Count by exam type
    stats.byExamType[paper.examType] = (stats.byExamType[paper.examType] || 0) + 1;
  });

  return stats;
}

export default {
  loadAllSSCCGLPapers,
  loadPapersFromAssets,
  getLoadedPapersStats,
};
