/**
 * Mock Data for SSC CGL Service
 * This file loads sample SSC CGL papers for development/testing
 * In production, papers would be loaded dynamically from assets or API
 */

import SSCCGLService from './ssc-cgl-service';

// Sample paper data structure - you would load this from actual files
const SAMPLE_PAPERS = [
  {
    paperId: '6960f352756b52153608eea1',
    fileName: 'SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 1__6960f352756b52153608eea1.json',
  },
  {
    paperId: '6960f352756b52153608ee9b',
    fileName: 'SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 2__6960f352756b52153608ee9b.json',
  },
  {
    paperId: '6960f351330e3069183b6c83',
    fileName: 'SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 3__6960f351330e3069183b6c83.json',
  },
  // Add more papers here
];

/**
 * Initialize SSC CGL service with mock data
 * Call this when the app starts
 */
export async function initializeSSCCGLService() {
  console.log('📚 Initializing SSC CGL Mock Test Service...');
  
  try {
    // In a real app, you would:
    // 1. Read the list of available papers from a manifest file
    // 2. Load each paper's JSON data
    // 3. Load corresponding AI answers
    // 4. Pass to SSCCGLService.loadPaper()
    
    // For now, we'll just log that initialization is complete
    // The actual paper loading should happen when you need to display them
    
    console.log('✅ SSC CGL Service initialized');
    console.log(`📊 ${SSCCGLService.getAllPapers().length} papers loaded`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize SSC CGL Service:', error);
    return false;
  }
}

/**
 * Load a single paper from the SSC_CGL folder
 * This is a helper function that would be used in production
 */
export async function loadSinglePaper(paperId: string) {
  try {
    // In React Native, you'd use something like:
    // const paperData = await FileSystem.readAsStringAsync(`${SSC_CGL_DIR}/${paperId}.json`);
    // const answersData = await FileSystem.readAsStringAsync(`${AI_ANSWERS_DIR}/${paperId}.json`);
    
    // For now, we'll return a placeholder
    console.log(`Loading paper: ${paperId}`);
    return null;
  } catch (error) {
    console.error(`Failed to load paper ${paperId}:`, error);
    return null;
  }
}

/**
 * Get list of all available SSC CGL papers
 * In production, this would read from the SSC_CGL folder
 */
export function getAvailablePapers() {
  return SAMPLE_PAPERS;
}

/**
 * Quick setup: Load all available papers
 * This is what you'd call on app startup
 */
export async function loadAllPapers() {
  console.log('📥 Loading all SSC CGL papers...');
  
  const papers = getAvailablePapers();
  let loadedCount = 0;
  
  for (const paper of papers) {
    const result = await loadSinglePaper(paper.paperId);
    if (result) {
      loadedCount++;
    }
  }
  
  console.log(`✅ Loaded ${loadedCount}/${papers.length} papers`);
  return loadedCount;
}

export default {
  initializeSSCCGLService,
  loadSinglePaper,
  getAvailablePapers,
  loadAllPapers,
};
