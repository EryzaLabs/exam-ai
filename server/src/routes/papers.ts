import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Adjust these paths as needed based on your actual directory structure
// Assuming server is at C:\Users\aloo\exam-ai\server
// and data is at C:\Users\aloo\exam-ai\SSC_CGL
const DATA_ROOT = path.resolve(__dirname, '../../../'); 
const PAPERS_DIR = path.join(DATA_ROOT, 'SSC_CGL');
const ANSWERS_DIR = path.join(DATA_ROOT, 'ai_generated_answers');

// GET /api/papers - List all available papers
router.get('/', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(PAPERS_DIR)) {
      return res.status(500).json({ error: 'Papers directory not found', path: PAPERS_DIR });
    }

    const files = fs.readdirSync(PAPERS_DIR).filter(f => f.endsWith('.json'));
    
    // Sort files by name (which effectively sorts by year/date roughly or at least consistently)
    files.sort().reverse(); 

    const papers = files.map((filename, index) => {
        const hasAnswers = fs.existsSync(path.join(ANSWERS_DIR, filename));
        return {
            id: filename,
            title: `UPSC Principal Mock Test ${index + 1}`,
            filename,
            hasAnswers
        };
    });

    res.json(papers);
  } catch (error: any) {
    console.error('Error listing papers:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/papers/:filename - Get paper content
router.get('/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(PAPERS_DIR, filename);

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

// GET /api/papers/:filename/answers - Get answers content
router.get('/:filename/answers', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    // The answer files have the same name as the paper files in the other directory
    const filePath = path.join(ANSWERS_DIR, filename);

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
