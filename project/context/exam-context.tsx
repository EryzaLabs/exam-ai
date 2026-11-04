import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExamTarget = 'all' | 'upsc' | 'uppsc';

export interface ExamInfo {
  id: ExamTarget;
  shortName: string;
  fullName: string;
  tagline: string;
  badge: string;
  pillLabel: string;
}

export const EXAMS: Record<ExamTarget, ExamInfo> = {
  all: {
    id: 'all',
    shortName: 'UPSC & UP Principal',
    fullName: 'UPSC & UP Principal Exams 2026',
    tagline: 'Comprehensive CBT Mocks & Topic Tests for Both Vacancies',
    badge: 'UPSC & UP PRINCIPAL 2026',
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
      if (saved && (saved === 'all' || saved === 'upsc' || saved === 'uppsc')) {
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
        if (examMode === 'all') return title.replace(/UPSC Principal/gi, 'UPSC & UP Principal');
      }
      return title || (examMode === 'uppsc' ? 'UP Principal Test' : examMode === 'all' ? 'UPSC & UP Principal Test' : 'UPSC Principal Test');
    }

    if (filename.includes('full_mocks/')) {
      const match = filename.match(/mock_test_(\d+)\.json/i);
      const num = match ? parseInt(match[1], 10) : 1;
      const padded = num < 10 ? `0${num}` : `${num}`;

      if (examMode === 'uppsc') {
        return `UP Principal Full Mock Test ${padded} • Complete CBT Exam`;
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
        if (examMode === 'all') {
          return `${cleanName} • Practice Set ${paddedPart}`;
        }
        return `${cleanName} • Practice Set ${paddedPart}`;
      }
    }

    // Fallback title transform
    if (title) {
      if (examMode === 'uppsc') return title.replace(/UPSC Principal/gi, 'UP Principal');
      if (examMode === 'all') return title.replace(/UPSC Principal/gi, 'UPSC & UP Principal');
    }

    return title || (examMode === 'uppsc' ? 'UP Principal Test' : 'UPSC Principal Test');
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
