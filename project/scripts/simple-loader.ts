/**
 * Simple SSC CGL Papers Loader
 * 
 * Add this to your app/_layout.tsx to auto-load all papers on app start:
 * 
 * import { loadAllPapers } from './scripts/simple-loader';
 * 
 * useEffect(() => {
 *   loadAllPapers();
 * }, []);
 */

import { SSCCGLService } from '../services/ssc-cgl-service';

// Import all paper files dynamically
export async function loadAllPapers() {
  const sscService = SSCCGLService.getInstance();
  
  console.log('📚 Loading all SSC CGL papers...');
  
  // List of all paper IDs with their file names
  const papers = [
    // You can add all paper IDs here
    // Format: { id: 'paper_id', name: 'Paper Name' }
  ];
  
  // For manual loading, use this simpler approach:
  // Just call loadPaper for each paper you want to load
  
  console.log('✅ Papers loading service ready!');
  console.log('💡 Use SSCCGLService.getInstance().loadPaper(id, data, answers) to load papers');
}

/**
 * Example: Load a single paper
 * 
 * Usage in your component:
 * 
 * import paper1 from '../../SSC_CGL/SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 1__6960f352756b52153608eea1.json';
 * import answers1 from '../../ai_generated_answers/SSC CGL 2020 Tier-I Official Paper _Held On _ 13 Aug 2021 Shift 1__6960f352756b52153608eea1.json';
 * 
 * const service = SSCCGLService.getInstance();
 * await service.loadPaper('6960f352756b52153608eea1', paper1, answers1);
 */
export function loadSinglePaper(
  paperId: string,
  paperData: any,
  answersData?: any
) {
  const service = SSCCGLService.getInstance();
  return service.loadPaper(paperId, paperData, answersData);
}
