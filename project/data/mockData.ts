import { Question, MockTest, User, ProgressData, LeaderboardEntry, Bookmark } from '@/types';

export const mockQuestions: Question[] = [
  {
    id: '1',
    question: 'What is the derivative of x²?',
    options: ['x', '2x', 'x²', '2x²'],
    correctAnswer: 1,
    explanation: 'The derivative of x² is 2x using the power rule: d/dx(xⁿ) = nxⁿ⁻¹',
    subject: 'Mathematics',
    difficulty: 'Easy',
    timeToSolve: 30,
  },
  {
    id: '2',
    question: 'Which of the following is NOT a greenhouse gas?',
    options: ['Carbon dioxide', 'Methane', 'Nitrogen', 'Water vapor'],
    correctAnswer: 2,
    explanation: 'Nitrogen (N₂) is not a greenhouse gas. It makes up about 78% of Earth\'s atmosphere but doesn\'t trap heat.',
    subject: 'Science',
    difficulty: 'Medium',
    timeToSolve: 45,
  },
  {
    id: '3',
    question: 'What is the capital of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
    correctAnswer: 2,
    explanation: 'Canberra is the capital city of Australia, despite Sydney and Melbourne being larger cities.',
    subject: 'Geography',
    difficulty: 'Easy',
    timeToSolve: 20,
  },
  {
    id: '4',
    question: 'Which programming paradigm does React primarily follow?',
    options: ['Object-oriented', 'Functional', 'Procedural', 'Logic'],
    correctAnswer: 1,
    explanation: 'React primarily follows functional programming paradigms with hooks and functional components.',
    subject: 'Computer Science',
    difficulty: 'Medium',
    timeToSolve: 35,
  },
  {
    id: '5',
    question: 'What is the time complexity of binary search?',
    options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
    correctAnswer: 1,
    explanation: 'Binary search has O(log n) time complexity because it eliminates half of the search space in each iteration.',
    subject: 'Computer Science',
    difficulty: 'Hard',
    timeToSolve: 60,
  },
];

export const mockTests: MockTest[] = [
  {
    id: '1',
    name: 'Mathematics Fundamentals',
    questions: mockQuestions.filter(q => q.subject === 'Mathematics'),
    duration: 30,
    totalMarks: 50,
  },
  {
    id: '2',
    name: 'General Science',
    questions: mockQuestions.filter(q => q.subject === 'Science'),
    duration: 45,
    totalMarks: 75,
  },
  {
    id: '3',
    name: 'Computer Science Basics',
    questions: mockQuestions.filter(q => q.subject === 'Computer Science'),
    duration: 60,
    totalMarks: 100,
  },
];

export const mockUser: User = {
  id: '1',
  name: 'Aryan',
  email: 'aryan@example.com',
  streak: 7,
  totalPractice: 156,
  accuracy: 78.5,
};

export const mockProgressData: ProgressData[] = [
  { date: '2024-01-01', accuracy: 65, questionsAttempted: 12, timeSpent: 25 },
  { date: '2024-01-02', accuracy: 72, questionsAttempted: 15, timeSpent: 30 },
  { date: '2024-01-03', accuracy: 68, questionsAttempted: 18, timeSpent: 35 },
  { date: '2024-01-04', accuracy: 75, questionsAttempted: 14, timeSpent: 28 },
  { date: '2024-01-05', accuracy: 80, questionsAttempted: 20, timeSpent: 40 },
  { date: '2024-01-06', accuracy: 78, questionsAttempted: 16, timeSpent: 32 },
  { date: '2024-01-07', accuracy: 82, questionsAttempted: 22, timeSpent: 45 },
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { id: '1', name: 'Alex Johnson', score: 2450, accuracy: 89.2 },
  { id: '2', name: 'Sarah Chen', score: 2380, accuracy: 87.5 },
  { id: '3', name: 'Mike Davis', score: 2320, accuracy: 85.8 },
  { id: '4', name: 'Aryan', score: 2180, accuracy: 78.5 },
  { id: '5', name: 'Emma Wilson', score: 2150, accuracy: 83.2 },
  { id: '6', name: 'David Brown', score: 2080, accuracy: 81.7 },
  { id: '7', name: 'Lisa Garcia', score: 2020, accuracy: 79.4 },
];

export const mockBookmarks: Bookmark[] = [
  {
    id: '1',
    questionId: '1',
    question: mockQuestions[0],
    notes: 'Remember the power rule formula',
    createdAt: new Date('2024-01-05'),
  },
  {
    id: '2',
    questionId: '2',
    question: mockQuestions[1],
    notes: 'Common mistake - nitrogen is not a greenhouse gas',
    createdAt: new Date('2024-01-06'),
  },
];