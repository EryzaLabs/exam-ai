"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const zlib_1 = __importDefault(require("zlib"));
const util_1 = require("util");
const router = (0, express_1.Router)();
const gzip = (0, util_1.promisify)(zlib_1.default.gzip);
const gunzip = (0, util_1.promisify)(zlib_1.default.gunzip);
const DATA_ROOT = path_1.default.resolve(__dirname, '../../../');
const PYTHON_SCRIPT = path_1.default.join(DATA_ROOT, 'generate_ai_answers.py');
const ANSWERS_DIR = path_1.default.join(DATA_ROOT, 'ai_generated_answers');
// Python command - check for venv first, then fall back to system python
const getVenvPython = () => {
    const venvPython = process.platform === 'win32'
        ? path_1.default.join(DATA_ROOT, 'venv', 'Scripts', 'python.exe')
        : path_1.default.join(DATA_ROOT, 'venv', 'bin', 'python3');
    if (fs_1.default.existsSync(venvPython)) {
        return venvPython;
    }
    // Fall back to system python
    return process.env.PYTHON_CMD || (process.platform === 'win32' ? 'python' : 'python3');
};
const PYTHON_CMD = getVenvPython();
// In-memory queue for tracking generation status
// In production, use Redis or a database
const generationQueue = new Map();
/**
 * POST /api/answers/generate - Trigger answer generation for a test
 */
router.post('/generate', async (req, res) => {
    try {
        const { testId, testFilePath } = req.body;
        if (!testId || !testFilePath) {
            return res.status(400).json({ error: 'testId and testFilePath are required' });
        }
        // Check if already in queue or completed
        if (generationQueue.has(testId)) {
            const existing = generationQueue.get(testId);
            return res.json({
                testId,
                status: existing.status,
                message: 'Answer generation already in progress or completed'
            });
        }
        // Resolve actual file path if testFilePath doesn't include title prefix
        let actualTestFilePath = testFilePath;
        if (!fs_1.default.existsSync(path_1.default.join(DATA_ROOT, testFilePath))) {
            const testFileDir = path_1.default.dirname(path_1.default.join(DATA_ROOT, testFilePath));
            if (fs_1.default.existsSync(testFileDir)) {
                const files = fs_1.default.readdirSync(testFileDir);
                const matchingFile = files.find(f => f.endsWith(`_${testId}.json.gz`) || f === `${testId}.json.gz`);
                if (matchingFile) {
                    actualTestFilePath = path_1.default.join(path_1.default.dirname(testFilePath), matchingFile);
                    console.log(`[Answer Gen] Resolved file locally: ${matchingFile}`);
                }
            }
            // If STILL not found locally, perform a global search across testseries
            if (!fs_1.default.existsSync(path_1.default.join(DATA_ROOT, actualTestFilePath))) {
                console.log(`[Answer Gen] Performing global search for ${testId}`);
                const TESTSERIES_DIR = path_1.default.join(DATA_ROOT, 'testseries');
                let foundPath = null;
                if (fs_1.default.existsSync(TESTSERIES_DIR)) {
                    const searchFolder = (folderPath) => {
                        if (foundPath)
                            return;
                        const items = fs_1.default.readdirSync(folderPath, { withFileTypes: true });
                        for (const item of items) {
                            if (item.isDirectory()) {
                                searchFolder(path_1.default.join(folderPath, item.name));
                            }
                            else if (item.isFile()) {
                                if (item.name.endsWith(`_${testId}.json.gz`) || item.name === `${testId}.json.gz` || item.name.endsWith(`_${testId}.json`) || item.name === `${testId}.json`) {
                                    foundPath = path_1.default.join(folderPath, item.name);
                                    return;
                                }
                            }
                        }
                    };
                    searchFolder(TESTSERIES_DIR);
                    if (foundPath) {
                        actualTestFilePath = path_1.default.relative(DATA_ROOT, foundPath);
                        console.log(`[Answer Gen] Global search found file: ${actualTestFilePath}`);
                    }
                }
            }
        }
        // Check if answers already exist (both .json and .json.gz)
        const answerFileName = path_1.default.basename(actualTestFilePath).replace('.json.gz', '.json');
        const answerFilePath = path_1.default.join(ANSWERS_DIR, answerFileName);
        const answerFilePathGz = path_1.default.join(ANSWERS_DIR, answerFileName + '.gz');
        if (fs_1.default.existsSync(answerFilePath) || fs_1.default.existsSync(answerFilePathGz)) {
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
    }
    catch (error) {
        console.error('Error queueing answer generation:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/answers/status/:testId - Check generation status
 */
router.get('/status/:testId', (req, res) => {
    try {
        const { testId } = req.params;
        const status = generationQueue.get(testId);
        // Check if status not in queue - check for completed files
        if (!status) {
            // Look for files with either just ID or title prefix
            const possibleFiles = [];
            if (fs_1.default.existsSync(ANSWERS_DIR)) {
                const allFiles = fs_1.default.readdirSync(ANSWERS_DIR);
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
            if (fs_1.default.existsSync(ANSWERS_DIR)) {
                const allFiles = fs_1.default.readdirSync(ANSWERS_DIR);
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
    }
    catch (error) {
        console.error('Error checking generation status:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/answers/:testFileName - Get generated answers (supports both .json and .json.gz)
 */
router.get('/:testFileName', async (req, res) => {
    try {
        const { testFileName } = req.params;
        // Extract testId from filename (last part after '_' or whole name)
        const testId = testFileName.includes('_')
            ? testFileName.split('_').pop()?.replace(/\.json(\.gz)?$/, '')
            : testFileName.replace(/\.json(\.gz)?$/, '');
        console.log(`[Fetch Answers] Looking for testId: ${testId}`);
        // Look for answer file with title prefix or just ID
        let filePath;
        let needsDecompression = false;
        if (fs_1.default.existsSync(ANSWERS_DIR)) {
            const allFiles = fs_1.default.readdirSync(ANSWERS_DIR);
            for (const file of allFiles) {
                if (file.endsWith(`_${testId}.json.gz`) || file === `${testId}.json.gz`) {
                    filePath = path_1.default.join(ANSWERS_DIR, file);
                    needsDecompression = true;
                    console.log(`[Fetch Answers] Found compressed: ${file}`);
                    break;
                }
                else if (file.endsWith(`_${testId}.json`) || file === `${testId}.json`) {
                    filePath = path_1.default.join(ANSWERS_DIR, file);
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
            const compressedData = fs_1.default.readFileSync(filePath);
            const decompressedData = await gunzip(compressedData);
            res.send(decompressedData);
        }
        else {
            // Stream uncompressed file
            fs_1.default.createReadStream(filePath).pipe(res);
        }
    }
    catch (error) {
        console.error('Error serving answers:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Background answer generation using Python script
 */
async function generateAnswersInBackground(testId, testFilePath) {
    const queueItem = generationQueue.get(testId);
    if (!queueItem)
        return;
    try {
        queueItem.status = 'in-progress';
        queueItem.progress = 10;
        // Ensure answers directory exists
        if (!fs_1.default.existsSync(ANSWERS_DIR)) {
            fs_1.default.mkdirSync(ANSWERS_DIR, { recursive: true });
        }
        // Create a temporary file with just this test for processing
        // Use original filename to preserve title for output
        const originalFileName = path_1.default.basename(testFilePath, '.json.gz').replace('.json', '');
        const tempTestFile = path_1.default.join(DATA_ROOT, 'temp', `${originalFileName}.json`);
        const tempDir = path_1.default.dirname(tempTestFile);
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        // Decompress if needed and copy to temp location
        const fullTestFilePath = path_1.default.join(DATA_ROOT, testFilePath);
        if (testFilePath.endsWith('.json.gz')) {
            console.log(`[Answer Gen] Decompressing ${testFilePath}...`);
            const compressedData = fs_1.default.readFileSync(fullTestFilePath);
            const decompressedData = await gunzip(compressedData);
            fs_1.default.writeFileSync(tempTestFile, decompressedData);
        }
        else {
            fs_1.default.copyFileSync(fullTestFilePath, tempTestFile);
        }
        console.log(`[Answer Gen] Processing ${originalFileName}...`);
        // Run Python script for this specific test
        const pythonProcess = (0, child_process_1.spawn)(PYTHON_CMD, [
            PYTHON_SCRIPT,
            '--file', tempTestFile
        ]);
        let output = '';
        let errorOutput = '';
        // Update progress based on output
        pythonProcess.stdout.on('data', (data) => {
            if (data.toString().includes('Processing')) {
                queueItem.progress = 30;
            }
            else if (data.toString().includes('Section:')) {
                queueItem.progress = Math.min(queueItem.progress + 10, 80);
            }
        });
        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error(`[Answer Gen Error ${testId}]:`, data.toString().trim());
        });
        pythonProcess.on('close', async (code) => {
            // Clean up temp file
            if (fs_1.default.existsSync(tempTestFile)) {
                fs_1.default.unlinkSync(tempTestFile);
            }
            if (code === 0) {
                // Find the generated answer file - Python uses input filename stem
                // So temp_testId.json -> temp_testId.json output
                let answerFilePath;
                if (fs_1.default.existsSync(ANSWERS_DIR)) {
                    const files = fs_1.default.readdirSync(ANSWERS_DIR);
                    // Look for files ending with _testId.json or exactly testId.json
                    const matchingFile = files.find(f => f.endsWith(`_${testId}.json`) ||
                        f === `${testId}.json`);
                    if (matchingFile) {
                        answerFilePath = path_1.default.join(ANSWERS_DIR, matchingFile);
                        console.log(`📄 Found generated answer file: ${matchingFile}`);
                    }
                }
                // Compress the generated answer file if found
                if (answerFilePath && fs_1.default.existsSync(answerFilePath)) {
                    try {
                        const answerFilePathGz = answerFilePath + '.gz';
                        // Read the JSON file
                        const jsonData = fs_1.default.readFileSync(answerFilePath);
                        // Compress it
                        const compressed = await gzip(jsonData);
                        // Write compressed file
                        fs_1.default.writeFileSync(answerFilePathGz, compressed);
                        // Delete original uncompressed file
                        fs_1.default.unlinkSync(answerFilePath);
                        console.log(`📦 Compressed answer file: ${path_1.default.basename(answerFilePathGz)}`);
                        queueItem.status = 'completed';
                        queueItem.progress = 100;
                        queueItem.completedAt = new Date().toISOString();
                        console.log(`✅ Answer generation completed for ${testId}`);
                    }
                    catch (compressError) {
                        console.error(`Failed to compress answer file for ${testId}:`, compressError);
                        // Mark as completed anyway, file exists uncompressed
                        queueItem.status = 'completed';
                        queueItem.progress = 100;
                        queueItem.completedAt = new Date().toISOString();
                    }
                }
                else {
                    // Python exited successfully but no output file found
                    queueItem.status = 'failed';
                    queueItem.error = 'Generation completed but output file not found';
                    queueItem.completedAt = new Date().toISOString();
                    console.error(`❌ Answer generation failed for ${testId}: Output file not found`);
                }
            }
            else {
                queueItem.status = 'failed';
                queueItem.error = errorOutput || 'Unknown error';
                queueItem.completedAt = new Date().toISOString();
                console.error(`❌ Answer generation failed for ${testId}:`, errorOutput);
            }
        });
    }
    catch (error) {
        console.error(`Error in background generation for ${testId}:`, error);
        queueItem.status = 'failed';
        queueItem.error = error.message;
        queueItem.completedAt = new Date().toISOString();
    }
}
exports.default = router;
//# sourceMappingURL=answer-generation.js.map