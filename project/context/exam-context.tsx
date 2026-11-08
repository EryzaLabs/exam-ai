import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExamTarget = 'all' | 'upsc' | 'uppsc' | 'tgt' | 'pgt';

export interface ExamInfo {
  id: ExamTarget;
  shortName: string;
  fullName: string;
  tagline: string;
  badge: string;
  pillLabel: string;
  isIndividualPurchasable?: boolean;
  price?: number;
  originalPrice?: number;
  subjects?: string[];
}

export const EXAMS: Record<ExamTarget, ExamInfo> = {
  all: {
    id: 'all',
    shortName: 'All Teaching Exams',
    fullName: 'UPSC Principal, UP Principal, TGT & PGT 2026',
    tagline: 'Comprehensive CBT Mocks, Solved PYQs & Topic Tests across All Vacancies',
    badge: 'ALL-ACCESS PASS 2026',
    pillLabel: '✨ All Exams',
  },
  upsc: {
    id: 'upsc',
    shortName: 'UPSC Principal',
    fullName: 'UPSC Principal & Vice-Principal 2026',
    tagline: 'Delhi GNCTD, KVS & NVS Principal Cadre',
    badge: 'UPSC PRINCIPAL 2026',
    pillLabel: '🏛️ UPSC Principal',
  },
  uppsc: {
    id: 'uppsc',
    shortName: 'UP Principal',
    fullName: 'UP Principal Exam 2026 (UPPSC / Education Dept)',
    tagline: 'Uttar Pradesh Principal & Headmaster Recruitment 2026',
    badge: 'UP PRINCIPAL 2026',
    pillLabel: '🏫 UP Principal',
  },
  tgt: {
    id: 'tgt',
    shortName: 'TGT Official Papers',
    fullName: 'TGT (Trained Graduate Teacher) Official Previous Year Papers',
    tagline: 'Official Exam Papers: Hindi, Mathematics, Science, Social Science, English, PE, Drawing',
    badge: 'TGT 2026',
    pillLabel: '🎯 TGT Series',
    isIndividualPurchasable: true,
    price: 199,
    originalPrice: 999,
    subjects: ['Hindi', 'Mathematics', 'Science', 'Social Science', 'English', 'Sanskrit'],
  },
  pgt: {
    id: 'pgt',
    shortName: 'PGT Official Papers',
    fullName: 'PGT (Post Graduate Teacher) Official Previous Year Papers',
    tagline: 'Official Exam Papers: Commerce, Physics, Chemistry, Biology, History, Geography, Economics, English',
    badge: 'PGT 2026',
    pillLabel: '🎓 PGT Series',
    isIndividualPurchasable: true,
    price: 199,
    originalPrice: 999,
    subjects: ['Hindi', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Commerce', 'Economics', 'English'],
  },
};

const STORAGE_KEY = '@astra_exam_target';

interface ExamContextType {
  examMode: ExamTarget;
  setExamMode: (target: ExamTarget) => void;
  examInfo: ExamInfo;
  formatTestTitle: (title: string, filename: string) => string;
}

const ExamContext = createContext<ExamContextType>({
  examMode: 'all',
  setExamMode: () => {},
  examInfo: EXAMS.all,
  formatTestTitle: (title) => title,
});

export const useExam = () => useContext(ExamContext);

export function ExamProvider({ children }: { children: React.ReactNode }) {
  const [examMode, setExamModeState] = useState<ExamTarget>('all');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && (saved === 'all' || saved === 'upsc' || saved === 'uppsc' || saved === 'tgt' || saved === 'pgt')) {
        setExamModeState(saved as ExamTarget);
      }
    }).catch(() => {});
  }, []);

  const setExamMode = (target: ExamTarget) => {
    setExamModeState(target);
    AsyncStorage.setItem(STORAGE_KEY, target).catch(() => {});
  };

  const formatTestTitle = (title: string, filename: string): string => {
    if (!filename) {
      if (title) {
        if (examMode === 'uppsc') return title.replace(/UPSC Principal/gi, 'UP Principal');
        if (examMode === 'tgt') return title.replace(/UPSC Principal/gi, 'TGT');
        if (examMode === 'pgt') return title.replace(/UPSC Principal/gi, 'PGT');
        if (examMode === 'all') return title;
      }
      return title || (examMode === 'uppsc' ? 'UP Principal Test' : examMode === 'tgt' ? 'TGT Official Paper' : examMode === 'pgt' ? 'PGT Official Paper' : 'Exam Test');
    }

    if (filename.includes('tgt_pgt/') || filename.includes('tgt/') || filename.includes('pgt/')) {
      const clean = filename.replace(/^.*\//, '').replace(/\.json$/i, '').replace(/[_\-]+/g, ' ');
      return clean.replace(/\b\w/g, (c) => c.toUpperCase());
    }

    if (filename.includes('full_mocks/')) {
      const match = filename.match(/mock_test_(\d+)\.json/i);
      const num = match ? parseInt(match[1], 10) : 1;
      const padded = num < 10 ? `0${num}` : `${num}`;

      if (examMode === 'uppsc') {
        return `UP Principal Full Mock Test ${padded} • Complete CBT Exam`;
      }
      if (examMode === 'tgt') {
        return `TGT Comprehensive Test ${padded} • Official Paper`;
      }
      if (examMode === 'pgt') {
        return `PGT Comprehensive Test ${padded} • Official Paper`;
      }
      if (examMode === 'all') {
        return `UPSC & UP Principal Full Mock ${padded} • Complete CBT Exam`;
      }
      return `UPSC Principal Full Mock Test ${padded} • Complete CBT Exam`;
    }

    if (filename.includes('topic_wise/')) {
      const base = filename.replace('topic_wise/', '').replace('.json', '');
      const match = base.match(/^(.+?)_test_(\d+)$/i);
      if (match) {
        const slug = match[1];
        const partNum = parseInt(match[2], 10);
        const paddedPart = partNum < 10 ? `0${partNum}` : `${partNum}`;
        const cleanName = slug
          .replace(/[_\-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        if (examMode === 'uppsc') {
          return `${cleanName} • UP Principal Set ${paddedPart}`;
        }
        if (examMode === 'tgt') {
          return `${cleanName} • TGT Practice Set ${paddedPart}`;
        }
        if (examMode === 'pgt') {
          return `${cleanName} • PGT Practice Set ${paddedPart}`;
        }
        return `${cleanName} • Practice Set ${paddedPart}`;
      }
    }

    // Fallback title transform
    if (title) {
      if (examMode === 'uppsc') return title.replace(/UPSC Principal/gi, 'UP Principal');
      if (examMode === 'tgt') return title.replace(/UPSC Principal/gi, 'TGT');
      if (examMode === 'pgt') return title.replace(/UPSC Principal/gi, 'PGT');
    }

    return title || 'Mock Test';
  };

  return (
    <ExamContext.Provider
      value={{
        examMode,
        setExamMode,
        examInfo: EXAMS[examMode] || EXAMS.all,
        formatTestTitle,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}
export default ExamContext;
