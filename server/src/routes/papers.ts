import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Adjust these paths as needed based on your actual directory structure
// Assuming server is at C:\Users\aloo\exam-ai\server
// and data is at C:\Users\Aryan\exam-ai\tests_json
const DATA_ROOT = path.resolve(__dirname, '../../../'); 
const TESTS_DIR = path.join(DATA_ROOT, 'tests_json');
const ANSWERS_DIR = path.join(DATA_ROOT, 'ai_generated_answers');

// GET /api/papers - List all available papers
router.get('/', (req: Request, res: Response) => {
  try {
    const fullMockDir = path.join(TESTS_DIR, 'full_mocks');
    const topicWiseDir = path.join(TESTS_DIR, 'topic_wise');
    
    let allFiles: { filename: string, fullPath: string }[] = [];
    
    if (fs.existsSync(fullMockDir)) {
      allFiles.push(...fs.readdirSync(fullMockDir).filter(f => f.endsWith('.json')).map(f => ({ filename: `full_mocks/${f}`, fullPath: path.join(fullMockDir, f) })));
    }
    if (fs.existsSync(topicWiseDir)) {
      allFiles.push(...fs.readdirSync(topicWiseDir).filter(f => f.endsWith('.json')).map(f => ({ filename: `topic_wise/${f}`, fullPath: path.join(topicWiseDir, f) })));
    }

    const papers = allFiles.map((fileObj) => {
        // Read the actual title from the JSON file!
        let title = "UPSC Principal Test";
        try {
            const fileData = JSON.parse(fs.readFileSync(fileObj.fullPath, 'utf8'));
            title = fileData.test_name || title;
        } catch (e) {}
        
        return {
            id: fileObj.filename,
            title: title,
            filename: fileObj.filename,
            hasAnswers: true // Answers are embedded in our new JSONs
        };
    });

    res.json(papers);
  } catch (error: any) {
    console.error('Error listing papers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/papers/:folder/:filename - Get paper content
router.get('/:folder/:filename', (req: Request, res: Response) => {
  try {
    const filename = path.join(req.params.folder, req.params.filename);
    const filePath = path.join(TESTS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    // Stream the file
    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    console.error('Error serving paper:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/papers/:folder/:filename/answers - Get answers content
router.get('/:folder/:filename/answers', (req: Request, res: Response) => {
  try {
    const filename = path.join(req.params.folder, req.params.filename);
    
    // In our new architecture, questions and answers are bundled in the same JSON file
    const filePath = path.join(TESTS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Answers not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    console.error('Error serving answers:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
