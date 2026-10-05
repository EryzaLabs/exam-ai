"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const util_1 = require("util");
const router = (0, express_1.Router)();
const gunzip = (0, util_1.promisify)(zlib_1.default.gunzip);
// Root directory containing testseries folder
const DATA_ROOT = path_1.default.resolve(__dirname, '../../../');
const TESTSERIES_DIR = path_1.default.join(DATA_ROOT, 'testseries');
/**
 * GET /api/testseries - List all test series with their sections (paginated)
 * Query params: page (default 1), limit (default 20)
 */
router.get('/', (req, res) => {
    try {
        if (!fs_1.default.existsSync(TESTSERIES_DIR)) {
            return res.status(500).json({ error: 'Testseries directory not found', path: TESTSERIES_DIR });
        }
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const testSeriesFolders = fs_1.default.readdirSync(TESTSERIES_DIR, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        const testSeriesList = [];
        for (const seriesFolder of testSeriesFolders) {
            const seriesPath = path_1.default.join(TESTSERIES_DIR, seriesFolder);
            // Get all section folders
            const sectionFolders = fs_1.default.readdirSync(seriesPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            const sections = [];
            for (const sectionFolder of sectionFolders) {
                const sectionPath = path_1.default.join(seriesPath, sectionFolder);
                // Only load minimal section info - don't read _section_info.json
                // to avoid loading thousands of test metadata objects
                const sectionInfo = {
                    id: sectionFolder,
                    folderName: sectionFolder,
                    title: sectionFolder.replace(/_/g, ' ')
                };
                // Only count test files, don't load metadata
                try {
                    const testFiles = fs_1.default.readdirSync(sectionPath)
                        .filter(f => f.endsWith('.json.gz') || f.endsWith('.json'));
                    sectionInfo.availableTests = testFiles.length;
                }
                catch (err) {
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
    }
    catch (error) {
        console.error('Error listing test series:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/testseries/:seriesFolder/:sectionFolder - List tests in a section
 */
router.get('/:seriesFolder/:sectionFolder', (req, res) => {
    try {
        const { seriesFolder, sectionFolder } = req.params;
        const sectionPath = path_1.default.join(TESTSERIES_DIR, seriesFolder, sectionFolder);
        if (!fs_1.default.existsSync(sectionPath)) {
            return res.status(404).json({ error: 'Section not found' });
        }
        // Read section info
        const infoFilePath = path_1.default.join(sectionPath, '_section_info.json');
        let sectionInfo = { tests: [] };
        if (fs_1.default.existsSync(infoFilePath)) {
            const infoContent = fs_1.default.readFileSync(infoFilePath, 'utf-8');
            sectionInfo = JSON.parse(infoContent);
        }
        // Get available test files
        const testFiles = fs_1.default.readdirSync(sectionPath)
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
            const testInfo = sectionInfo.tests?.find((t) => t.id === testId || t.filename === filename);
            if (testInfo) {
                return {
                    ...testInfo,
                    id: testId,
                    filename: filename,
                    compressed: filename.endsWith('.gz')
                };
            }
            else {
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
    }
    catch (error) {
        console.error('Error listing section tests:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/testseries/test/:testId - Search for a test paper globally by ID
 */
router.get('/test/:testId', async (req, res) => {
    try {
        const { testId } = req.params;
        console.log(`[TestSeries] Global search for test: ${testId}`);
        if (!fs_1.default.existsSync(TESTSERIES_DIR)) {
            return res.status(404).json({ error: 'Testseries directory not found' });
        }
        let foundFilePath = null;
        let needsDecompression = false;
        // Recursively search all folders
        const searchFolder = (folderPath) => {
            if (foundFilePath)
                return; // Stop if already found
            const items = fs_1.default.readdirSync(folderPath, { withFileTypes: true });
            for (const item of items) {
                if (item.isDirectory()) {
                    searchFolder(path_1.default.join(folderPath, item.name));
                }
                else if (item.isFile()) {
                    if (item.name.endsWith(`_${testId}.json.gz`) || item.name === `${testId}.json.gz`) {
                        foundFilePath = path_1.default.join(folderPath, item.name);
                        needsDecompression = true;
                        return;
                    }
                    else if (item.name.endsWith(`_${testId}.json`) || item.name === `${testId}.json`) {
                        foundFilePath = path_1.default.join(folderPath, item.name);
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
            const compressedData = fs_1.default.readFileSync(foundFilePath);
            const decompressedData = await gunzip(compressedData);
            const jsonString = decompressedData.toString('utf-8');
            const testData = JSON.parse(jsonString);
            res.json(testData);
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            fs_1.default.createReadStream(foundFilePath).pipe(res);
        }
    }
    catch (error) {
        console.error('[TestSeries] Error serving test paper globally:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/testseries/:seriesFolder/:sectionFolder/:testId - Get decompressed test paper
 */
router.get('/:seriesFolder/:sectionFolder/:testId', async (req, res) => {
    try {
        const { seriesFolder, sectionFolder, testId } = req.params;
        console.log(`[TestSeries] Fetching test: ${seriesFolder}/${sectionFolder}/${testId}`);
        const sectionPath = path_1.default.join(TESTSERIES_DIR, seriesFolder, sectionFolder);
        // List all files in the section to help debug
        if (fs_1.default.existsSync(sectionPath)) {
            const files = fs_1.default.readdirSync(sectionPath);
            console.log(`[TestSeries] Files in section:`, files.slice(0, 5)); // Show first 5 files
        }
        else {
            console.error(`[TestSeries] Section path does not exist: ${sectionPath}`);
            return res.status(404).json({ error: 'Section not found' });
        }
        // Find file by ID - it might have a title prefix
        const allFiles = fs_1.default.readdirSync(sectionPath);
        let filePath = null;
        let needsDecompression = false;
        let matchedFilename = null;
        // Look for files ending with _[testId].json.gz or _[testId].json or exactly [testId].json.gz
        for (const file of allFiles) {
            if (file.endsWith(`_${testId}.json.gz`) || file === `${testId}.json.gz`) {
                filePath = path_1.default.join(sectionPath, file);
                needsDecompression = true;
                matchedFilename = file;
                break;
            }
            else if (file.endsWith(`_${testId}.json`) || file === `${testId}.json`) {
                filePath = path_1.default.join(sectionPath, file);
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
            const compressedData = fs_1.default.readFileSync(filePath);
            const decompressedData = await gunzip(compressedData);
            const jsonString = decompressedData.toString('utf-8');
            const testData = JSON.parse(jsonString);
            console.log(`[TestSeries] Successfully decompressed and parsed test`);
            res.json(testData);
        }
        else {
            // Stream uncompressed file
            res.setHeader('Content-Type', 'application/json');
            console.log(`[TestSeries] Streaming uncompressed test`);
            fs_1.default.createReadStream(filePath).pipe(res);
        }
    }
    catch (error) {
        console.error('[TestSeries] Error serving test paper:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=testseries.js.map