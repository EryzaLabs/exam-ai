import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const router = Router();
const gunzip = promisify(zlib.gunzip);

// Root directory containing testseries folder
const DATA_ROOT = path.resolve(__dirname, '../../../');
const TESTSERIES_DIR = path.join(DATA_ROOT, 'testseries');

/**
 * GET /api/testseries - List all test series with their sections (paginated)
 * Query params: page (default 1), limit (default 20)
 */
router.get('/', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(TESTSERIES_DIR)) {
      return res.status(500).json({ error: 'Testseries directory not found', path: TESTSERIES_DIR });
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const testSeriesFolders = fs.readdirSync(TESTSERIES_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const testSeriesList: any[] = [];

    for (const seriesFolder of testSeriesFolders) {
      const seriesPath = path.join(TESTSERIES_DIR, seriesFolder);
      
      // Get all section folders
      const sectionFolders = fs.readdirSync(seriesPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      const sections: any[] = [];

      for (const sectionFolder of sectionFolders) {
        const sectionPath = path.join(seriesPath, sectionFolder);
        
        // Only load minimal section info - don't read _section_info.json
        // to avoid loading thousands of test metadata objects
        const sectionInfo: any = {
          id: sectionFolder,
          folderName: sectionFolder,
          title: sectionFolder.replace(/_/g, ' ')
        };

        // Only count test files, don't load metadata
        try {
          const testFiles = fs.readdirSync(sectionPath)
            .filter(f => f.endsWith('.json.gz') || f.endsWith('.json'));
          sectionInfo.availableTests = testFiles.length;
        } catch (err) {
          console.error(`Error counting tests in ${sectionFolder}:`, err);
          sectionInfo.availableTests = 0;
        }
        
        sections.push(sectionInfo);
      }

      // Extract series ID from folder name (last part after last underscore)
      const seriesIdMatch = seriesFolder.match(/_([a-f0-9]{24})$/);
      const seriesId = seriesIdMatch ? seriesIdMatch[1] : seriesFolder;

      testSeriesList.push({
        id: seriesId,
        folderName: seriesFolder,
        title: seriesFolder.replace(/_/g, ' ').replace(/\s+[a-f0-9]{24}$/i, ''),
        sections: sections,
        totalSections: sections.length,
        totalTests: sections.reduce((sum, s) => sum + s.availableTests, 0)
      });
    }

    // Apply pagination
    const totalSeries = testSeriesList.length;
    const paginatedSeries = testSeriesList.slice(skip, skip + limit);

    res.json({
      total: totalSeries,
      page,
      limit,
      totalPages: Math.ceil(totalSeries / limit),
      hasMore: skip + limit < totalSeries,
      testSeries: paginatedSeries
    });

  } catch (error: any) {
    console.error('Error listing test series:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/testseries/:seriesFolder/:sectionFolder - List tests in a section
 */
router.get('/:seriesFolder/:sectionFolder', (req: Request, res: Response) => {
  try {
    const { seriesFolder, sectionFolder } = req.params;
    const sectionPath = path.join(TESTSERIES_DIR, seriesFolder, sectionFolder);

    if (!fs.existsSync(sectionPath)) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Read section info
    const infoFilePath = path.join(sectionPath, '_section_info.json');
    let sectionInfo: any = { tests: [] };

    if (fs.existsSync(infoFilePath)) {
      const infoContent = fs.readFileSync(infoFilePath, 'utf-8');
      sectionInfo = JSON.parse(infoContent);
    }

    // Get available test files
    const testFiles = fs.readdirSync(sectionPath)
      .filter(f => f.endsWith('.json.gz') || f.endsWith('.json'))
      .map(filename => {
        // Extract ID from filename - format is either:
        // 1. "Title_ID.json.gz" or
        // 2. "ID.json.gz"
        const withoutExt = filename.replace(/\.(json\.gz|json)$/, '');
        const parts = withoutExt.split('_');
        const testId = parts[parts.length - 1]; // ID is always the last part
        const title = parts.length > 1 ? parts.slice(0, -1).join(' ') : withoutExt;
        
        // Try to find matching test info from _section_info.json
        const testInfo = sectionInfo.tests?.find((t: any) => 
          t.id === testId || t.filename === filename
        );
        
        if (testInfo) {
          return {
            ...testInfo,
            id: testId,
            filename: filename,
            compressed: filename.endsWith('.gz')
          };
        } else {
          // No info found, create basic info from filename
          return {
            id: testId,
            title: title.replace(/_/g, ' '),
            filename: filename,
            compressed: filename.endsWith('.gz')
          };
        }
      });

    console.log(`[TestSeries] Section ${sectionFolder}: Found ${testFiles.length} test files`);

    res.json({
      section: sectionInfo,
      tests: testFiles,
      total: testFiles.length
    });

  } catch (error: any) {
    console.error('Error listing section tests:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/testseries/test/:testId - Search for a test paper globally by ID
 */
router.get('/test/:testId', async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    console.log(`[TestSeries] Global search for test: ${testId}`);

    if (!fs.existsSync(TESTSERIES_DIR)) {
      return res.status(404).json({ error: 'Testseries directory not found' });
    }

    let foundFilePath: string | null = null;
    let needsDecompression = false;

    // Recursively search all folders
    const searchFolder = (folderPath: string) => {
      if (foundFilePath) return; // Stop if already found
      const items = fs.readdirSync(folderPath, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          searchFolder(path.join(folderPath, item.name));
        } else if (item.isFile()) {
          if (item.name.endsWith(`_${testId}.json.gz`) || item.name === `${testId}.json.gz`) {
            foundFilePath = path.join(folderPath, item.name);
            needsDecompression = true;
            return;
          } else if (item.name.endsWith(`_${testId}.json`) || item.name === `${testId}.json`) {
            foundFilePath = path.join(folderPath, item.name);
            needsDecompression = false;
            return;
          }
        }
      }
    };

    searchFolder(TESTSERIES_DIR);

    if (!foundFilePath) {
      console.error(`[TestSeries] Global search failed for TestID: ${testId}`);
      return res.status(404).json({ error: 'Test paper not found globally' });
    }

    console.log(`[TestSeries] Global search found file: ${foundFilePath}`);

    if (needsDecompression) {
      const compressedData = fs.readFileSync(foundFilePath);
      const decompressedData = await gunzip(compressedData);
      const jsonString = decompressedData.toString('utf-8');
      const testData = JSON.parse(jsonString);
      res.json(testData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      fs.createReadStream(foundFilePath).pipe(res);
    }
  } catch (error: any) {
    console.error('[TestSeries] Error serving test paper globally:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/testseries/:seriesFolder/:sectionFolder/:testId - Get decompressed test paper
 */
router.get('/:seriesFolder/:sectionFolder/:testId', async (req: Request, res: Response) => {
  try {
    const { seriesFolder, sectionFolder, testId } = req.params;
    
    console.log(`[TestSeries] Fetching test: ${seriesFolder}/${sectionFolder}/${testId}`);
    
    const sectionPath = path.join(TESTSERIES_DIR, seriesFolder, sectionFolder);
    
    // List all files in the section to help debug
    if (fs.existsSync(sectionPath)) {
      const files = fs.readdirSync(sectionPath);
      console.log(`[TestSeries] Files in section:`, files.slice(0, 5)); // Show first 5 files
    } else {
      console.error(`[TestSeries] Section path does not exist: ${sectionPath}`);
      return res.status(404).json({ error: 'Section not found' });
    }
    
    // Find file by ID - it might have a title prefix
    const allFiles = fs.readdirSync(sectionPath);
    
    let filePath: string | null = null;
    let needsDecompression = false;
    let matchedFilename: string | null = null;
    
    // Look for files ending with _[testId].json.gz or _[testId].json or exactly [testId].json.gz
    for (const file of allFiles) {
      if (file.endsWith(`_${testId}.json.gz`) || file === `${testId}.json.gz`) {
        filePath = path.join(sectionPath, file);
        needsDecompression = true;
        matchedFilename = file;
        break;
      } else if (file.endsWith(`_${testId}.json`) || file === `${testId}.json`) {
        filePath = path.join(sectionPath, file);
        needsDecompression = false;
        matchedFilename = file;
        break;
      }
    }
    
    if (filePath) {
      console.log(`[TestSeries] Found file: ${matchedFilename}`);
    }
    
    if (!filePath) {
      console.error(`[TestSeries] Test paper not found. TestID: ${testId}, Available files:`, allFiles.slice(0, 3));
      return res.status(404).json({ 
        error: 'Test paper not found',
        testId,
        hint: 'File might have a title prefix. Available files: ' + allFiles.slice(0, 3).join(', ')
      });
    }

    if (needsDecompression) {
      // Read and decompress
      const compressedData = fs.readFileSync(filePath);
      const decompressedData = await gunzip(compressedData);
      const jsonString = decompressedData.toString('utf-8');
      const testData = JSON.parse(jsonString);

      console.log(`[TestSeries] Successfully decompressed and parsed test`);
      res.json(testData);
    } else {
      // Stream uncompressed file
      res.setHeader('Content-Type', 'application/json');
      console.log(`[TestSeries] Streaming uncompressed test`);
      fs.createReadStream(filePath).pipe(res);
    }

  } catch (error: any) {
    console.error('[TestSeries] Error serving test paper:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
