import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import zlib from 'zlib';
import { promisify } from 'util';

const router = Router();
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const DATA_ROOT = path.resolve(__dirname, '../../../');
const PYTHON_SCRIPT = path.join(DATA_ROOT, 'generate_ai_answers.py');
const ANSWERS_DIR = path.join(DATA_ROOT, 'ai_generated_answers');

// Python command - check for venv first, then fall back to system python
const getVenvPython = () => {
  const venvPython = process.platform === 'win32' 
    ? path.join(DATA_ROOT, 'venv', 'Scripts', 'python.exe')
    : path.join(DATA_ROOT, 'venv', 'bin', 'python3');
  
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  
  // Fall back to system python
  return process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
};

const PYTHON_CMD = getVenvPython();

// In-memory queue for tracking generation status
// In production, use Redis or a database
const generationQueue: Map<string, {
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  testId: string;
  testFilePath: string;
  progress: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}> = new Map();

/**
 * POST /api/answers/generate - Trigger answer generation for a test
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { testId, testFilePath } = req.body;

    if (!testId || !testFilePath) {
      return res.status(400).json({ error: 'testId and testFilePath are required' });
    }

    // Check if already in queue or completed
    if (generationQueue.has(testId)) {
      const existing = generationQueue.get(testId)!;
      return res.json({
        testId,
        status: existing.status,
        message: 'Answer generation already in progress or completed'
      });
    }

    // Resolve actual file path if testFilePath doesn't include title prefix
    let actualTestFilePath = testFilePath;
    if (!fs.existsSync(path.join(DATA_ROOT, testFilePath))) {
      const testFileDir = path.dirname(path.join(DATA_ROOT, testFilePath));
      if (fs.existsSync(testFileDir)) {
        const files = fs.readdirSync(testFileDir);
        const matchingFile = files.find(f => f.endsWith(`_${testId}.json.gz`) || f === `${testId}.json.gz`);
        if (matchingFile) {
          actualTestFilePath = path.join(path.dirname(testFilePath), matchingFile);
          console.log(`[Answer Gen] Resolved file locally: ${matchingFile}`);
        }
      }

      // If STILL not found locally, perform a global search across testseries
      if (!fs.existsSync(path.join(DATA_ROOT, actualTestFilePath))) {
        console.log(`[Answer Gen] Performing global search for ${testId}`);
        const TESTSERIES_DIR = path.join(DATA_ROOT, 'testseries');
        let foundPath: string | null = null;
        
        if (fs.existsSync(TESTSERIES_DIR)) {
          const searchFolder = (folderPath: string) => {
            if (foundPath) return;
            const items = fs.readdirSync(folderPath, { withFileTypes: true });
            for (const item of items) {
              if (item.isDirectory()) {
                searchFolder(path.join(folderPath, item.name));
              } else if (item.isFile()) {
                if (item.name.endsWith(`_${testId}.json.gz`) || item.name === `${testId}.json.gz` || item.name.endsWith(`_${testId}.json`) || item.name === `${testId}.json`) {
                  foundPath = path.join(folderPath, item.name);
                  return;
                }
              }
            }
          };
          searchFolder(TESTSERIES_DIR);
          
          if (foundPath) {
            actualTestFilePath = path.relative(DATA_ROOT, foundPath);
            console.log(`[Answer Gen] Global search found file: ${actualTestFilePath}`);
          }
        }
      }
    }

    // Check if answers already exist (both .json and .json.gz)
    const answerFileName = path.basename(actualTestFilePath).replace('.json.gz', '.json');
    const answerFilePath = path.join(ANSWERS_DIR, answerFileName);
    const answerFilePathGz = path.join(ANSWERS_DIR, answerFileName + '.gz');

    if (fs.existsSync(answerFilePath) || fs.existsSync(answerFilePathGz)) {
      return res.json({
        testId,
        status: 'completed',
        message: 'Answers already exist',
        answersAvailable: true
      });
    }

    // Add to queue
    generationQueue.set(testId, {
      status: 'pending',
      testId,
      testFilePath: actualTestFilePath,
      progress: 0,
      startedAt: new Date().toISOString()
    });

    // Start background generation (don't await)
    generateAnswersInBackground(testId, actualTestFilePath);

    res.json({
      testId,
      status: 'pending',
      message: 'Answer generation queued successfully',
      estimatedTime: '2-5 minutes'
    });

  } catch (error: any) {
    console.error('Error queueing answer generation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/answers/status/:testId - Check generation status
 */
router.get('/status/:testId', (req: Request, res: Response) => {
  try {
    const { testId } = req.params;

    const status = generationQueue.get(testId);
    
    // Check if status not in queue - check for completed files
    if (!status) {
      // Look for files with either just ID or title prefix
      const possibleFiles = [];
      
      if (fs.existsSync(ANSWERS_DIR)) {
        const allFiles = fs.readdirSync(ANSWERS_DIR);
        
        // Find files ending with _testId.json or _testId.json.gz or exactly testId.json(.gz)
        for (const file of allFiles) {
          if (file.endsWith(`_${testId}.json`) || 
              file.endsWith(`_${testId}.json.gz`) ||
              file === `${testId}.json` || 
              file === `${testId}.json.gz`) {
            possibleFiles.push(file);
          }
        }
      }
      
      if (possibleFiles.length > 0) {
        const file = possibleFiles[0];
        console.log(`[Answer Status] Found answer file: ${file}`);
        
        return res.json({
          testId,
          status: 'completed',
          progress: 100,
          answersAvailable: true,
          answerFile: file
        });
      }

      return res.status(404).json({
        testId,
        status: 'not-found',
        message: 'Answer generation not started'
      });
    }

    // If status is 'completed', verify file actually exists
    if (status.status === 'completed') {
      const possibleFiles = [];
      
      if (fs.existsSync(ANSWERS_DIR)) {
        const allFiles = fs.readdirSync(ANSWERS_DIR);
        
        for (const file of allFiles) {
          if (file.endsWith(`_${testId}.json`) || 
              file.endsWith(`_${testId}.json.gz`) ||
              file === `${testId}.json` || 
              file === `${testId}.json.gz`) {
            possibleFiles.push(file);
          }
        }
      }
      
      // If marked completed but no file exists, it actually failed
      if (possibleFiles.length === 0) {
        console.log(`[Answer Status] Marked completed but no file found for ${testId}`);
        return res.json({
          ...status,
          testId,
          status: 'failed',
          answersAvailable: false,
          error: 'Generation completed but output file not found'
        });
      }
      
      // File exists, return success
      return res.json({
        ...status,
        testId,
        answersAvailable: true,
        answerFile: possibleFiles[0]
      });
    }

    // Not completed yet or in other status
    res.json({
      ...status,
      testId,
      answersAvailable: false
    });

  } catch (error: any) {
    console.error('Error checking generation status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/answers/:testFileName - Get generated answers (supports both .json and .json.gz)
 */
router.get('/:testFileName', async (req: Request, res: Response) => {
  try {
    const { testFileName } = req.params;
    
    // Extract testId from filename (last part after '_' or whole name)
    const testId = testFileName.includes('_') 
      ? testFileName.split('_').pop()?.replace(/\.json(\.gz)?$/, '')
      : testFileName.replace(/\.json(\.gz)?$/, '');
    
    console.log(`[Fetch Answers] Looking for testId: ${testId}`);
    
    // Look for answer file with title prefix or just ID
    let filePath: string | undefined;
    let needsDecompression = false;
    
    if (fs.existsSync(ANSWERS_DIR)) {
      const allFiles = fs.readdirSync(ANSWERS_DIR);
      
      for (const file of allFiles) {
        if (file.endsWith(`_${testId}.json.gz`) || file === `${testId}.json.gz`) {
          filePath = path.join(ANSWERS_DIR, file);
          needsDecompression = true;
          console.log(`[Fetch Answers] Found compressed: ${file}`);
          break;
        } else if (file.endsWith(`_${testId}.json`) || file === `${testId}.json`) {
          filePath = path.join(ANSWERS_DIR, file);
          needsDecompression = false;
          console.log(`[Fetch Answers] Found uncompressed: ${file}`);
          break;
        }
      }
    }
    
    if (!filePath) {
      console.error(`[Fetch Answers] Not found for testId: ${testId}`);
      return res.status(404).json({ error: 'Answers not found' });
    }

    res.setHeader('Content-Type', 'application/json');

    if (needsDecompression) {
      // Read, decompress and send
      const compressedData = fs.readFileSync(filePath);
      const decompressedData = await gunzip(compressedData);
      res.send(decompressedData);
    } else {
      // Stream uncompressed file
      fs.createReadStream(filePath).pipe(res);
    }

  } catch (error: any) {
    console.error('Error serving answers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Background answer generation using Python script
 */
async function generateAnswersInBackground(testId: string, testFilePath: string) {
  const queueItem = generationQueue.get(testId);
  if (!queueItem) return;

  try {
    queueItem.status = 'in-progress';
    queueItem.progress = 10;

    // Ensure answers directory exists
    if (!fs.existsSync(ANSWERS_DIR)) {
      fs.mkdirSync(ANSWERS_DIR, { recursive: true });
    }

    // Create a temporary file with just this test for processing
    // Use original filename to preserve title for output
    const originalFileName = path.basename(testFilePath, '.json.gz').replace('.json', '');
    const tempTestFile = path.join(DATA_ROOT, 'temp', `${originalFileName}.json`);
    const tempDir = path.dirname(tempTestFile);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Decompress if needed and copy to temp location
    const fullTestFilePath = path.join(DATA_ROOT, testFilePath);
    if (testFilePath.endsWith('.json.gz')) {
      console.log(`[Answer Gen] Decompressing ${testFilePath}...`);
      const compressedData = fs.readFileSync(fullTestFilePath);
      const decompressedData = await gunzip(compressedData);
      fs.writeFileSync(tempTestFile, decompressedData);
    } else {
      fs.copyFileSync(fullTestFilePath, tempTestFile);
    }

    console.log(`[Answer Gen] Processing ${originalFileName}...`);

    // Run Python script for this specific test
    const pythonProcess = spawn(PYTHON_CMD, [
      PYTHON_SCRIPT,
      '--file', tempTestFile
    ]);

    let output = '';
    let errorOutput = '';

    // Update progress based on output
    pythonProcess.stdout.on('data', (data) => {
      if (data.toString().includes('Processing')) {
        queueItem.progress = 30;
      } else if (data.toString().includes('Section:')) {
        queueItem.progress = Math.min(queueItem.progress + 10, 80);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[Answer Gen Error ${testId}]:`, data.toString().trim());
    });

    pythonProcess.on('close', async (code) => {
      // Clean up temp file
      if (fs.existsSync(tempTestFile)) {
        fs.unlinkSync(tempTestFile);
      }

      if (code === 0) {
        // Find the generated answer file - Python uses input filename stem
        // So temp_testId.json -> temp_testId.json output
        let answerFilePath: string | undefined;
        
        if (fs.existsSync(ANSWERS_DIR)) {
          const files = fs.readdirSync(ANSWERS_DIR);
          // Look for files ending with _testId.json or exactly testId.json
          const matchingFile = files.find(f => 
            f.endsWith(`_${testId}.json`) || 
            f === `${testId}.json`
          );
          
          if (matchingFile) {
            answerFilePath = path.join(ANSWERS_DIR, matchingFile);
            console.log(`📄 Found generated answer file: ${matchingFile}`);
          }
        }

        // Compress the generated answer file if found
        if (answerFilePath && fs.existsSync(answerFilePath)) {
          try {
            const answerFilePathGz = answerFilePath + '.gz';
            // Read the JSON file
            const jsonData = fs.readFileSync(answerFilePath);
            // Compress it
            const compressed = await gzip(jsonData);
            // Write compressed file
            fs.writeFileSync(answerFilePathGz, compressed);
            // Delete original uncompressed file
            fs.unlinkSync(answerFilePath);
            console.log(`📦 Compressed answer file: ${path.basename(answerFilePathGz)}`);
            
            queueItem.status = 'completed';
            queueItem.progress = 100;
            queueItem.completedAt = new Date().toISOString();
            console.log(`✅ Answer generation completed for ${testId}`);
          } catch (compressError) {
            console.error(`Failed to compress answer file for ${testId}:`, compressError);
            // Mark as completed anyway, file exists uncompressed
            queueItem.status = 'completed';
            queueItem.progress = 100;
            queueItem.completedAt = new Date().toISOString();
          }
        } else {
          // Python exited successfully but no output file found
          queueItem.status = 'failed';
          queueItem.error = 'Generation completed but output file not found';
          queueItem.completedAt = new Date().toISOString();
          console.error(`❌ Answer generation failed for ${testId}: Output file not found`);
        }
      } else {
        queueItem.status = 'failed';
        queueItem.error = errorOutput || 'Unknown error';
        queueItem.completedAt = new Date().toISOString();
        console.error(`❌ Answer generation failed for ${testId}:`, errorOutput);
      }
    });

  } catch (error: any) {
    console.error(`Error in background generation for ${testId}:`, error);
    queueItem.status = 'failed';
    queueItem.error = error.message;
    queueItem.completedAt = new Date().toISOString();
  }
}

export default router;
