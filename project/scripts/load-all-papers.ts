/**
 * SSC CGL Papers Auto-Loader
 * 
 * This script automatically loads all SSC CGL papers from the data folders
 * Run this in your app/_layout.tsx or during app initialization
 */

import { SSCCGLService } from '../services/ssc-cgl-service';

// Paper IDs extracted from filenames (without _FAILED suffix)
const PAPER_IDS = [
  // 2020 Papers
  '6960f352756b52153608eea1',
  '6960f352756b52153608ee9b',
  '6960f351330e3069183b6c83',
  '6960f350a2b095f4b8326d52',
  '6960f34f16730ea62ed1b15b',
  '6960f34fca1d43a2b8dc5a41',
  '6960f34e13ff2df683d4c371',
  '6960f34d756b52153608ee72',
  '6960f34c330e3069183b6bd2',
  '6960f34c2ba086d1322be5f5',
  '6960f34b30978bef2a66f425',
  '6960f34a2ba086d1322be5f0',
  '6960f3492734da131b8362d5',
  '6960f3492734da131b8362d1',
  '6960f348756b52153608edfb',
  '6960f347bfe00d79a521ba66',
  '6960f346022736c1419a6305',
  '6960f346330e3069183b6b54',
  '6960f345f15c7bb461e3ad1e',
  '6960f34437c964b3b1654984',
  '6960f343ff6bb82bbdbcdc3f',
  
  // 2021 Papers
  '6960f343146cbe43f8ba19a7',
  '6960f3422ba086d1322be594',
  '6960f341b415b1c6cb5358ee',
  '6960f341caec61077b02aa74',
  '6960f340a2b095f4b8326c41',
  '6960f33fdc7cc529425d50b7',
  '6960f33e30978bef2a66f247',
  '6960f33eca1d43a2b8dc5894',
  '6960f33db415b1c6cb53581a',
  '6960f33cc4c5da65bb52ce62',
  '6960f33b022736c1419a6263',
  '6960f33b0300ada7a28fef05',
  '6960f33916730ea62ed1b0be',
  '6960f33aca1d43a2b8dc577b',
  '6960f3390300ada7a28feee3',
  '6960f3382d2e7bac4962aed7',
  '6960f33737c964b3b16548e9',
  '6960f3362734da131b8361dc',
  '6960f3363cce58628df19d3d',
  '6960f335146cbe43f8ba1873',
  '6960f3342734da131b8361d4',
  
  // 2022 Papers
  '6960f333330e3069183b6a2f',
  '6960f333b415b1c6cb5357c3',
  '6960f33213ff2df683d4c1c4',
  '6960f331500e773723144fb4',
  '6960f3310844b48b0aa1da29',
  '6960f32f9b3da2c77732e002',
  '6960f32e2ba086d1322be4c0',
  '6960f32e40f5995b99ce209b',
  '6960f32d146cbe43f8ba1810',
  '6960f32c022736c1419a616a',
  '6960f32b0300ada7a28fee02',
  '6960f32a0844b48b0aa1d971',
  '6960f3290300ada7a28fedec',
  '6960f329bfe00d79a521b805',
  '6960f328ff6bb82bbdbcdb10',
  '6960f327756b52153608eb1f',
  '6960f330756b52153608eb56',
  '6960f326ed11a81e6e8cc2ee',
  '6960f326ed11a81e6e8cc1ce',
  '6960f325ed11a81e6e8cc1c8',
  '6960f3242ba086d1322be3c0',
  '6960f323146cbe43f8ba17b2',
  '6960f3223cce58628df19bbc',
  '6960f3213cce58628df19bb9',
  '6960f323caec61077b02a793',
  '6960f3202ba086d1322be35b',
  '6960f320dc7cc529425d4d7f',
  '6960f31f3cce58628df19bb2',
  '6960f31edc7cc529425d4d75',
  '6960f31dbfe00d79a521b71b',
  '6960f31d2ba086d1322be347',
  '6960f31c2734da131b835ffa',
  '6960f31b756b52153608ea01',
  '6960f31a500e773723144e12',
  '6960f31a3cce58628df19b87',
  '6960f319146cbe43f8ba1739',
  '6960f318ff6bb82bbdbcdab0',
  '6960f31716730ea62ed1ad60',
  '6960f3162734da131b835f6f',
  '6960f3160844b48b0aa1d855',
  
  // 2023 Papers
  '6960f31113ff2df683d4bf58',
  '6960f310a2b095f4b8326735',
  '6960f30f13ff2df683d4bf51',
  '6960f30e30978bef2a66ef5a',
  '6960f30ef15c7bb461e3a6e0',
  '6960f315b415b1c6cb5355f2',
  '6960f314b415b1c6cb5355eb',
  '6960f31413ff2df683d4bfde',
  '6960f313a2b095f4b83267e4',
  '6960f312caec61077b02a728',
  '6960f311ff6bb82bbdbcda89',
  '6960f30d16730ea62ed1aad8',
  '6960f30cff6bb82bbdbcd993',
  '6960f30b146cbe43f8ba1687',
  '6960f30a2734da131b835f0a',
  '6960f309dc7cc529425d4cdb',
  '6960f3092d2e7bac4962ac00',
  '6960f308330e3069183b654b',
  '6960f30716730ea62ed1aab4',
  '6960f307ed11a81e6e8cbfb1',
  '6960f306500e773723144ceb',
  '6960f305863ad5304ecfc34e',
  '6960f30437c964b3b1654509',
  '6960f304dc7cc529425d4c11',
  '6960f30330978bef2a66ee3a',
  '6960f302dc7cc529425d4be1',
  '6960f302a2b095f4b8326684',
  '6960f30130978bef2a66ee32',
  '6960f300ed11a81e6e8cbf96',
  '6960f2ff043fa846cd4a9dbb',
  '6960f2ff3cce58628df19a5c',
  '6960f2fecaec61077b02a5e4',
  '6960f2fd13ff2df683d4be1e',
  '6960f2fd40f5995b99ce1b8a',
  '6960f2fc578eac6b8d167d14',
  '6960f2fb3cce58628df199f7',
  '6960f2faa2b095f4b832666b',
  '6960f2fa330e3069183b63ba',
  '6960f2f9756b52153608e7fa',
  
  // 2024 Papers
  '6960f2d9ed11a81e6e8cbca1',
  '6960f2da330e3069183b620d',
  '6960f2dbdc7cc529425d48c9',
  '6960f2dc0d0592839f8e2035',
  '6960f2dc9b3da2c77732d961',
  '6960f2ddf774904dbcf8f500',
  '6960f2de0300ada7a28fe7c0',
  '6960f2dfae95d2994ed4f612',
  '6960f2df9e72f7522607ae55',
  '6960f2e0c4c5da65bb52c7f8',
  '6960f2e17a40477a6af0044e',
  '6960f2e2ed11a81e6e8cbd83',
  '6960f2e3caec61077b02a450',
  '6960f2e32734da131b835ba4',
  '6960f2e40d0592839f8e2132',
  '6960f2e52734da131b835bb4',
  '6960f2e6022736c1419a5cd2',
  '6960f2e61f62250e6570fc6a',
  '6960f2e7ae95d2994ed4f638',
  '6960f2ec756b52153608e64d',
  '6960f2ed2ba086d1322bddc9',
  '6960f2eeff6bb82bbdbcd7b6',
  '6960f2ee756b52153608e658',
  '6960f2efb415b1c6cb535310',
  '6960f2f02d2e7bac4962aa6b',
  '6960f2f1280f495d34b0ac97',
  '6960f2f1b4975a8fe957e9d0',
  '6960f2f2ed11a81e6e8cbeae',
  '6960f2f32734da131b835d82',
  '6960f2f430978bef2a66ec86',
  '6960f2f4500e773723144c29',
  '6960f2f5330e3069183b6389',
  '6960f2f60844b48b0aa1d4da',
  '6960f2f72ba086d1322bdf07',
  '6960f2f713ff2df683d4bd52',
  '6960f2f80300ada7a28fe9d6',
  
  // Previous Papers (2017, 2019, 2020)
  '6960f3773cce58628df1a26c',
  '6960f3782d2e7bac4962b2ad',
  '6960f379330e3069183b6fc5',
  '6960f369756b52153608efeb',
  '6960f368b415b1c6cb535acd',
  '6960f368bfe00d79a521bc4c',
  '6960f37937c964b3b1654cad',
  '6960f37b500e773723145488',
  '6960f37a0844b48b0aa1de9a',
  '6960f367f15c7bb461e3af2c',
  '6960f366bfe00d79a521bc47',
  '6960f36537c964b3b1654bbc',
  '6960f37ccaec61077b02ae24',
  '6960f38730978bef2a66fa2e',
  '6960f37c2ba086d1322be9c7',
  '6960f3653cce58628df1a147',
  '6960f364500e773723145336',
  '6960f363ca1d43a2b8dc5b46',
  '6960f362b415b1c6cb535a17',
  '6960f362756b52153608efba',
  '6960f3610844b48b0aa1dd48',
  '6960f3883cce58628df1a3fd',
  '6960f37d2734da131b8366d5',
  '6960f37e2734da131b8366d8',
  '6960f37ff15c7bb461e3b085',
  '6960f37fff6bb82bbdbce0ca',
  '6960f38037c964b3b1654d2b',
  '6960f381330e3069183b6fe3',
  '6960f3822734da131b8367d5',
  '6960f382ed11a81e6e8cc92e',
  '6960f383330e3069183b6fee',
  '6960f384caec61077b02af46',
  '6960f385ff6bb82bbdbce0e5',
  '6960f3602ba086d1322be75f',
  '6960f385bfe00d79a521be6d',
  '6960f386ff6bb82bbdbce104',
  '6960f387ff6bb82bbdbce10a',
  '6960f389f15c7bb461e3b109',
  '6960f38a2d2e7bac4962b46d',
  '6960f38a13ff2df683d4c9a8',
  '6960f38bf15c7bb461e3b113',
  '6960f38c3cce58628df1a422',
  '6960f38ced11a81e6e8cca48',
  '6960f38dbfe00d79a521bf9a',
  '6960f38ef15c7bb461e3b12a',
  '6960f38fcaec61077b02af74',
  '6960f35fa2b095f4b8326ddd',
  '6960f35f13ff2df683d4c4cf',
  '6960f35ef15c7bb461e3aebc',
  '6960f370b415b1c6cb535af1',
  '6960f36f022736c1419a667b',
  '6960f36e2d2e7bac4962b111',
  '6960f35d0844b48b0aa1dd22',
  '6960f35d2d2e7bac4962b070',
  '6960f35c146cbe43f8ba1b11',
  '6960f371022736c1419a6680',
  '6960f371bfe00d79a521bd8e',
  '6960f35bf15c7bb461e3aeaf',
  '6960f35a756b52153608ef99',
  '6960f35a756b52153608ef80',
  '6960f3722d2e7bac4962b138',
  '6960f36e4f73ac3269c214e7',
  '6960f36d2d2e7bac4962b0ff',
  '6960f36ced11a81e6e8cc74d',
  '6960f357ca1d43a2b8dc5a6b',
  '6960f359a2b095f4b8326dc0',
  '6960f3580300ada7a28ff0f5',
  '6960f36b13ff2df683d4c5a4',
  '6960f36b146cbe43f8ba1cbc',
  '6960f36a500e7737231453ca',
  '6960f357330e3069183b6ca8',
  '6960f356330e3069183b6ca6',
  '6960f355146cbe43f8ba1a6f',
  '6960f3736f87e6a4bc4a6ea5',
  '6960f373146cbe43f8ba1dca',
  '6960f374ff6bb82bbdbce003',
  '6960f375500e773723145465',
  '6960f3762d2e7bac4962b239',
  '6960f37730978bef2a66f8f2',
  '6960f355756b52153608ef42',
  '6960f3542734da131b8363d2',
  '6960f3532ba086d1322be69d',
];

/**
 * Load all SSC CGL papers into the service
 * Call this function during app initialization
 */
export async function loadAllSSCCGLPapers(): Promise<{
  loaded: number;
  failed: number;
  failedIds: string[];
}> {
  const sscService = SSCCGLService.getInstance();
  let loaded = 0;
  let failed = 0;
  const failedIds: string[] = [];

  console.log(`🚀 Starting to load ${PAPER_IDS.length} SSC CGL papers...`);

  for (const paperId of PAPER_IDS) {
    try {
      // Try to load the paper
      const paperData = require(`../../SSC_CGL/SSC CGL ${getPaperFilename(paperId)}.json`);
      
      // Try to load corresponding AI answers
      let answersData = null;
      try {
        answersData = require(`../../ai_generated_answers/${getPaperFilename(paperId)}.json`);
      } catch (error) {
        console.warn(`⚠️  No AI answers found for ${paperId}`);
      }

      // Load paper into service
      await sscService.loadPaper(paperId, paperData, answersData);
      loaded++;
      
      if (loaded % 10 === 0) {
        console.log(`✅ Loaded ${loaded}/${PAPER_IDS.length} papers...`);
      }
    } catch (error) {
      console.error(`❌ Failed to load paper ${paperId}:`, error);
      failed++;
      failedIds.push(paperId);
    }
  }

  console.log(`
🎉 SSC CGL Papers Loading Complete!
✅ Successfully loaded: ${loaded}
❌ Failed to load: ${failed}
${failedIds.length > 0 ? `Failed IDs: ${failedIds.join(', ')}` : ''}
  `);

  return { loaded, failed, failedIds };
}

/**
 * Get paper filename from ID by finding the matching file
 * This is a helper function - in production, you should maintain a mapping
 */
function getPaperFilename(paperId: string): string {
  // This is a simplified version - you should implement proper file lookup
  // For now, we'll use the paper ID as-is
  return paperId;
}

/**
 * Load papers in batches to avoid memory issues
 */
export async function loadSSCCGLPapersInBatches(
  batchSize: number = 20
): Promise<void> {
  const sscService = SSCCGLService.getInstance();
  
  for (let i = 0; i < PAPER_IDS.length; i += batchSize) {
    const batch = PAPER_IDS.slice(i, i + batchSize);
    console.log(`Loading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(PAPER_IDS.length / batchSize)}...`);
    
    await Promise.all(
      batch.map(async (paperId) => {
        try {
          const paperData = require(`../../SSC_CGL/SSC CGL ${paperId}.json`);
          let answersData = null;
          try {
            answersData = require(`../../ai_generated_answers/${paperId}.json`);
          } catch {
            // No answers available
          }
          await sscService.loadPaper(paperId, paperData, answersData);
        } catch (error) {
          console.error(`Failed to load ${paperId}:`, error);
        }
      })
    );
  }
}

// Export paper count for reference
export const TOTAL_PAPERS = PAPER_IDS.length;
