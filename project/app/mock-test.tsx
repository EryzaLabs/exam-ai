import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  Platform,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Flag,
  Menu,
  AlertCircle,
  Send,
  Save,
} from 'lucide-react-native';
import RenderHtml from 'react-native-render-html';
import SSCCGLService, {
  ParsedMockTest,
  ParsedQuestion,
  TestAttempt,
  UserAnswer,
} from '@/services/ssc-cgl-service';
import { TestProgressService, SavedTestState, TestResult } from '@/services/test-progress-service';
import TestSeriesService from '@/services/testseries-service';

const { width } = Dimensions.get('window');

// Shuffle array utility function
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

interface QuestionState {
  answered: boolean;
  marked: boolean;
  selectedOption: number | null;
  timeTaken: number;
}

export default function MockTestScreen() {
  const params = useLocalSearchParams();
  const testId = params.testId as string;
  const resume = params.resume === 'true';
  const source = params.source as string; // 'testseries' or undefined
  const seriesFolder = params.seriesFolder as string;
  const sectionFolder = params.sectionFolder as string;

  const [test, setTest] = useState<ParsedMockTest | null>(null);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState<Map<string, QuestionState>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTest();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, []);



  // Auto-save every 30 seconds
  useEffect(() => {
    if (test && attempt && timeRemaining > 0) {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      autoSaveRef.current = setInterval(() => {
        saveProgress();
      }, 30000);
      return () => {
         if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      }
    }
  }, [test, attempt, currentQuestionIndex, questionStates, timeRemaining]);


  useEffect(() => {
    if (test && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [test, timeRemaining > 0]); // Changed condition to restart timer only if running

  const saveProgress = async () => {
    if (!test || !attempt) return;
    
    // Create detailed answers map for saving
    const answersRecord: Record<string, number> = {};
    questionStates.forEach((state, qId) => {
        if (state.selectedOption !== null) {
            answersRecord[qId] = state.selectedOption;
        }
    });

    // Convert Map to plain object for Firestore
    const questionStatesObj: Record<string, any> = {};
    questionStates.forEach((value, key) => {
      questionStatesObj[key] = value;
    });

    // Get current question order
    const questionOrder = test.sections.flatMap(section => section.questions.map(q => q.id));

    const state: SavedTestState = {
      testId: test.id,
      attemptId: attempt.id!,
      currentQuestionIndex,
      timeRemaining,
      questionStates: questionStatesObj,
      answers: answersRecord,
      lastUpdated: Date.now(),
      questionOrder
    };

    await TestProgressService.saveCurrentTest(state);
  };

  const loadTest = async () => {
    try {
      const paper = await SSCCGLService.getPaper(testId);
      if (!paper) {
        Alert.alert('Error', 'Test not found');
        router.back();
        return;
      }
      
      // Check if we are resuming
      if (resume) {
        const savedState = await TestProgressService.getCurrentTest();
        if (savedState && savedState.testId === testId) {
             console.log("Resuming test...");
             
             // Restore shuffled question order
             let restoredPaper = paper;
             if (savedState.questionOrder) {
               const questionOrderMap = new Map<string, ParsedQuestion>();
               paper.sections.forEach(s => s.questions.forEach(q => questionOrderMap.set(q.id, q)));
               
               // Rebuild sections with saved question order
               const sectionStartIndices: number[] = [];
               let currentIndex = 0;
               paper.sections.forEach(section => {
                 sectionStartIndices.push(currentIndex);
                 currentIndex += section.questions.length;
               });
               
               restoredPaper = {
                 ...paper,
                 sections: paper.sections.map((section, sIdx) => {
                   const start = sectionStartIndices[sIdx];
                   const end = sIdx < paper.sections.length - 1 ? sectionStartIndices[sIdx + 1] : savedState.questionOrder!.length;
                   const sectionQuestionIds = savedState.questionOrder!.slice(start, end);
                   
                   return {
                     ...section,
                     questions: sectionQuestionIds.map(qId => questionOrderMap.get(qId)!).filter(Boolean)
                   };
                 })
               };
             }
             
             setTest(restoredPaper);
             
             // Restore question states from object to Map
             const restoredStates = new Map<string, QuestionState>(
               Object.entries(savedState.questionStates)
             );
             setQuestionStates(restoredStates);
             
             // Reconstruct answers for Service
             const reconstructedAnswers: UserAnswer[] = [];
             
             // Improve: We need to find the question object to get marks
             // Create a lookup for questions
             const questionsMap = new Map<string, ParsedQuestion>();
             paper.sections.forEach(s => s.questions.forEach(q => questionsMap.set(q.id, q)));
             
             restoredStates.forEach((state, qId) => {
                 if (state.selectedOption !== null) {
                     const q = questionsMap.get(qId);
                     if (q) {
                         const isCorrect = state.selectedOption === q.correctAnswerIndex;
                         reconstructedAnswers.push({
                             questionId: qId,
                             selectedOption: state.selectedOption,
                             timeTaken: state.timeTaken,
                             isCorrect,
                             marksAwarded: isCorrect ? q.marks.positive : -q.marks.negative
                         });
                     }
                 }
             });

             const resumedAttempt: TestAttempt = {
                id: savedState.attemptId,
                testId: savedState.testId,
                userId: 'user', 
                startTime: new Date(Date.now() - (paper.duration - savedState.timeRemaining) * 1000), // Approx start time
                answers: reconstructedAnswers,
                currentQuestionIndex: savedState.currentQuestionIndex,
                status: 'in-progress',
                score: 0,
                totalMarks: 0,
                accuracy: 0
             };

             // Hydrate Service
             SSCCGLService.resumeTestAttempt(savedState.attemptId, resumedAttempt);
             setAttempt(resumedAttempt);
             
             setCurrentQuestionIndex(savedState.currentQuestionIndex);
             setTimeRemaining(savedState.timeRemaining);
             return; 
        }
      }

      // Start Fresh
      setTimeRemaining(paper.duration);
      
      // Shuffle questions within each section
      const shuffledPaper = {
        ...paper,
        sections: paper.sections.map(section => ({
          ...section,
          questions: shuffleArray(section.questions)
        }))
      };
      
      setTest(shuffledPaper);
      
      const newAttempt = SSCCGLService.startTestAttempt(testId, 'user_' + Date.now());
      setAttempt(newAttempt);

      // Initialize question states
      const states = new Map<string, QuestionState>();
      shuffledPaper.sections.forEach((section) => {
        section.questions.forEach((q) => {
          states.set(q.id, {
            answered: false,
            marked: false,
            selectedOption: null,
            timeTaken: 0,
          });
        });
      });
      setQuestionStates(states);
      
      // Convert Map to plain object for Firestore
      const statesObj: Record<string, any> = {};
      states.forEach((value, key) => {
        statesObj[key] = value;
      });
      
      // Get shuffled question order
      const questionOrder = shuffledPaper.sections.flatMap(section => section.questions.map(q => q.id));
      
      // Save initial state
      await TestProgressService.saveCurrentTest({
          testId: shuffledPaper.id,
          attemptId: newAttempt.id!,
          currentQuestionIndex: 0,
          timeRemaining: shuffledPaper.duration,
          questionStates: statesObj,
          answers: {},
          lastUpdated: Date.now(),
          questionOrder
      });

    } catch (error) {
      console.error('Error loading test:', error);
      Alert.alert('Error', 'Failed to load test');
      router.back();
    }
  };

  const handleBack = async () => {
    // Automatically save and exit
    await saveProgress();
    router.back();
  };
  
  useEffect(() => {
    const backAction = () => {
        handleBack();
        return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleBack]);
   
  const performSubmit = async () => {
    try {
      console.log('Starting test submission...');
      setIsSubmitting(true);
      
      if (!attempt) {
        console.log('No attempt found');
        Alert.alert('Error', 'Test attempt not found');
        setIsSubmitting(false);
        return;
      }

      // Use attempt.id since we ensure it is populated
      const attemptId = attempt.id!;
      console.log('Submitting test with attemptId:', attemptId);
      
      // Check if this is a testseries test and if answers are ready
      if (source === 'testseries') {
        console.log('Testseries test detected, checking answer status...');
        
        // Check if answers exist
        const answersStatus = await TestSeriesService.checkAnswerGenerationStatus(testId);
        
        if (answersStatus.status === 'not-found' || !answersStatus.answersAvailable) {
          // Answers still not ready (generation might still be in progress)
          console.log('Answers not yet ready, saving with pending status...');
          Alert.alert(
            'Evaluation Pending',
            'Your answers are being processed. You can check your results in the Test History page once evaluation is complete.',
            [{ text: 'OK' }]
          );

          // Save partial result with pending status
          const partialAnalytics = SSCCGLService.submitTest(attemptId);
          if (partialAnalytics) {
            await TestProgressService.saveTestResult({
              ...partialAnalytics,
              date: new Date().toISOString(),
              testTitle: test?.title,
              answerGenerationStatus: answersStatus.status === 'not-found' ? 'pending' : answersStatus.status as any,
              evaluationStatus: 'pending'
            });
          }

          // Clear active test
          await TestProgressService.clearCurrentTest();

          // Navigate to progress tab
          router.replace('/(tabs)/progress');
          setIsSubmitting(false);
          return;
        }

        // Answers are ready, proceed with normal submission
        console.log('Answers available, proceeding with evaluation');
      }

      const analytics = SSCCGLService.submitTest(attemptId);

      if (analytics) {
        console.log('Analytics calculated, saving to history...');
        // Save to history
        await TestProgressService.saveTestResult({
            ...analytics,
            date: new Date().toISOString(),
            testTitle: test?.title,
            answerGenerationStatus: source === 'testseries' ? 'completed' : 'not-needed',
            evaluationStatus: 'completed'
        });
        
        console.log('Test result saved, clearing active test...');
        // Clear active test
        await TestProgressService.clearCurrentTest();

        console.log('Navigating to results...');
        router.replace({
          pathname: '/test-result',
          params: { attemptId },
        });
      } else {
        console.log('Analytics is null');
        setIsSubmitting(false);
        Alert.alert('Error', 'Failed to submit test');
      }
    } catch (error) {
      console.error('Error in performSubmit:', error);
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to submit test: ' + error);
    }
  };


  const getAllQuestions = (): ParsedQuestion[] => {
    if (!test) return [];
    return test.sections.flatMap((s) => s.questions);
  };

  const getCurrentQuestion = (): ParsedQuestion | null => {
    const questions = getAllQuestions();
    return questions[currentQuestionIndex] || null;
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (isSubmitting) return; // Prevent interaction while submitting
    
    const question = getCurrentQuestion();
    if (!question) return;

    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

    // Update question state
    const newStates = new Map(questionStates);
    const state = newStates.get(question.id) || {
      answered: false,
      marked: false,
      selectedOption: null,
      timeTaken: 0,
    };

    state.answered = true;
    state.selectedOption = optionIndex;
    state.timeTaken += timeTaken;
    newStates.set(question.id, state);
    setQuestionStates(newStates);

    // Record answer
    if (attempt) {
      SSCCGLService.recordAnswer(
        `${attempt.testId}_${attempt.userId}_${attempt.startTime.getTime()}`,
        question.id,
        optionIndex,
        state.timeTaken,
        question
      );
    }

    setQuestionStartTime(Date.now());
  };

  const handleMarkForReview = () => {
    const question = getCurrentQuestion();
    if (!question) return;

    const newStates = new Map(questionStates);
    const state = newStates.get(question.id) || {
      answered: false,
      marked: false,
      selectedOption: null,
      timeTaken: 0,
    };

    state.marked = !state.marked;
    newStates.set(question.id, state);
    setQuestionStates(newStates);
  };

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < getAllQuestions().length) {
      setCurrentQuestionIndex(index);
      setQuestionStartTime(Date.now());
      setShowQuestionPalette(false);
    }
  };

  const handleNext = () => {
    navigateToQuestion(currentQuestionIndex + 1);
  };

  const handlePrevious = () => {
    navigateToQuestion(currentQuestionIndex - 1);
  };

  const handleSubmit = () => {
    setShowSubmitConfirm(true);
  };

  const handleAutoSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    performSubmit();
  };



  const confirmSubmit = () => {
    setShowSubmitConfirm(false);
    if (timerRef.current) clearInterval(timerRef.current);
    performSubmit();
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const getQuestionStats = () => {
    const questions = getAllQuestions();
    const answered = Array.from(questionStates.values()).filter((s) => s.answered).length;
    const marked = Array.from(questionStates.values()).filter((s) => s.marked).length;
    const notVisited = questions.length - answered;

    return { answered, marked, notVisited, total: questions.length };
  };

  const renderQuestionPalette = () => {
    const questions = getAllQuestions();
    let sectionStartIndex = 0;

    return (
      <Modal
        visible={showQuestionPalette}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQuestionPalette(false)}
      >
        <ResponsiveContainer>
          <SafeAreaView style={styles.paletteContainer}>
            <View style={styles.paletteHeader}>
              <Text style={styles.paletteTitle}>Question Palette</Text>
              <TouchableOpacity
                style={styles.paletteCloseButton}
                onPress={() => setShowQuestionPalette(false)}
              >
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.paletteContent}>
              {test?.sections.map((section, sectionIdx) => {
                const sectionStart = sectionStartIndex;
                sectionStartIndex += section.questions.length;

                return (
                  <View key={section.id} style={styles.paletteSection}>
                    <Text style={styles.paletteSectionTitle}>{section.title}</Text>
                    <View style={styles.paletteGrid}>
                      {section.questions.map((q, idx) => {
                        const globalIdx = sectionStart + idx;
                        const state = questionStates.get(q.id);
                        const isCurrent = globalIdx === currentQuestionIndex;

                        return (
                          <TouchableOpacity
                            key={q.id}
                            style={[
                              styles.paletteButton,
                              state?.answered && styles.paletteButtonAnswered,
                              state?.marked && styles.paletteButtonMarked,
                              !state?.answered && !state?.marked && styles.paletteButtonNotVisited,
                              isCurrent && styles.paletteButtonCurrent,
                            ]}
                            onPress={() => navigateToQuestion(globalIdx)}
                          >
                            <Text
                              style={[
                                styles.paletteButtonText,
                                isCurrent && styles.paletteButtonTextCurrent,
                              ]}
                            >
                              {globalIdx + 1}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.paletteLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendAnswered]} />
                <Text style={styles.legendText}>Answered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendMarked]} />
                <Text style={styles.legendText}>Marked</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendNotVisited]} />
                <Text style={styles.legendText}>Not Visited</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.paletteSubmitButton}
              onPress={() => {
                setShowQuestionPalette(false);
                setShowSubmitConfirm(true);
              }}
            >
              <Text style={styles.paletteSubmitButtonText}>Submit Test</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </ResponsiveContainer>
      </Modal>
    );
  };

  const renderSubmitConfirmModal = () => (
    <Modal
      visible={showSubmitConfirm}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowSubmitConfirm(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.submitConfirmContainer}>
          <View style={styles.submitConfirmHeader}>
            <AlertCircle size={48} color="#FF6B35" />
            <Text style={styles.submitConfirmTitle}>Submit Test?</Text>
          </View>

          <Text style={styles.submitConfirmMessage}>
            Are you sure you want to submit the test? You won't be able to change your answers after
            submission.
          </Text>

          <View style={styles.submitStatsContainer}>
            {(() => {
              const stats = getQuestionStats();
              return (
                <>
                  <View style={styles.submitStatItem}>
                    <Text style={styles.submitStatValue}>{stats.answered}</Text>
                    <Text style={styles.submitStatLabel}>Answered</Text>
                  </View>
                  <View style={styles.submitStatItem}>
                    <Text style={styles.submitStatValue}>{stats.notVisited}</Text>
                    <Text style={styles.submitStatLabel}>Not Attempted</Text>
                  </View>
                  <View style={styles.submitStatItem}>
                    <Text style={styles.submitStatValue}>{stats.marked}</Text>
                    <Text style={styles.submitStatLabel}>Marked</Text>
                  </View>
                </>
              );
            })()}
          </View>

          <View style={styles.submitConfirmButtons}>
            <TouchableOpacity
              style={[styles.submitConfirmButton, styles.submitCancelButton]}
              onPress={() => setShowSubmitConfirm(false)}
            >
              <Text style={styles.submitCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitConfirmButton, styles.submitProceedButton]}
              onPress={confirmSubmit}
            >
              <LinearGradient
                colors={['#4A90E2', '#357ABD']}
                style={styles.submitProceedGradient}
              >
                <Text style={styles.submitProceedButtonText}>Submit Test</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!test || !attempt) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading test...</Text>
      </View>
    );
  }

  const currentQuestion = getCurrentQuestion();
  const questions = getAllQuestions();
  const stats = getQuestionStats();
  const currentState = currentQuestion ? questionStates.get(currentQuestion.id) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.headerBackButton} 
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={28} color="#fff" />
            </TouchableOpacity>
            <View style={styles.timerContainer}>
              <Clock size={20} color="#fff" />
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
            </View>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {test.title}
          </Text>
          <TouchableOpacity
            style={styles.headerRight}
            onPress={() => setShowQuestionPalette(true)}
          >
            <Menu size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.answered}</Text>
            <Text style={styles.statLabel}>Answered</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.notVisited}</Text>
            <Text style={styles.statLabel}>Not Attempted</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.marked}</Text>
            <Text style={styles.statLabel}>Marked</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Question Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentQuestion && (
          <>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </Text>
              <View style={styles.questionMarks}>
                <Text style={styles.questionMarksText}>
                  +{currentQuestion.marks.positive} / -{currentQuestion.marks.negative}
                </Text>
              </View>
            </View>

            <View style={styles.questionContainer}>
              <RenderHtml
                contentWidth={width - 48}
                source={{ html: currentQuestion.questionText }}
                baseStyle={styles.questionText}
                tagsStyles={{ img: { maxWidth: '100%' } }}
              />
            </View>

            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = currentState?.selectedOption === index;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                    onPress={() => handleOptionSelect(index)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                      {isSelected && <View style={styles.optionRadioInner} />}
                    </View>
                    <RenderHtml
                      contentWidth={width - 120}
                      source={{ html: option }}
                      baseStyle={styles.optionText}
                      tagsStyles={{ img: { maxWidth: '100%' } }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={[styles.markButton]}
            onPress={handleMarkForReview}
            disabled={!currentQuestion}
          >
            <Flag
              size={20}
              color={currentState?.marked ? '#FF6B35' : '#666'}
              fill={currentState?.marked ? '#FF6B35' : 'none'}
            />
            <Text style={styles.markButtonText}>
              {currentState?.marked ? 'Unmark' : 'Mark for Review'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
            onPress={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft size={24} color={currentQuestionIndex === 0 ? '#ccc' : '#4A90E2'} />
            <Text
              style={[styles.navButtonText, currentQuestionIndex === 0 && styles.navButtonTextDisabled]}
            >
              Previous
            </Text>
          </TouchableOpacity>

          {currentQuestionIndex === questions.length - 1 ? (
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.submitButtonGradient}>
                <Send size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Test</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.navButton,
                currentQuestionIndex === questions.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              <Text
                style={[
                  styles.navButtonText,
                  currentQuestionIndex === questions.length - 1 && styles.navButtonTextDisabled,
                ]}
              >
                Next
              </Text>
              <ChevronRight
                size={24}
                color={currentQuestionIndex === questions.length - 1 ? '#ccc' : '#4A90E2'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderQuestionPalette()}
      {renderSubmitConfirmModal()}
      
      {/* Submitting Overlay */}
      {isSubmitting && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.submittingOverlay}>
            <View style={styles.submittingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.submittingText}>Submitting Test...</Text>
              <Text style={styles.submittingSubtext}>Please wait while we save your answers</Text>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    marginRight: 8,
    padding: 4,
  },
  headerTitle: {
    flex: 2,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 6,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  questionMarks: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  questionMarksText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  questionContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionButtonSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#E3F2FD',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    borderColor: '#4A90E2',
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
  },
  optionText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerButtons: {
    marginBottom: 12,
  },
  markButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  markButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A90E2',
    marginHorizontal: 4,
  },
  navButtonTextDisabled: {
    color: '#ccc',
  },
  submitButton: {
    flex: 1,
    marginLeft: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteContainer: {
    width: width * 0.9,
    minHeight: '40%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  paletteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  paletteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  paletteContent: {
    flex: 1,
    padding: 16,
  },
  paletteSection: {
    marginBottom: 24,
  },
  paletteSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center', // Center items
  },
  paletteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paletteButtonAnswered: {
    backgroundColor: '#4CAF50',
  },
  paletteButtonMarked: {
    backgroundColor: '#FF9800',
  },
  paletteButtonNotVisited: {
    backgroundColor: '#e0e0e0',
  },
  paletteButtonCurrent: {
    borderWidth: 3,
    borderColor: '#4A90E2',
  },
  paletteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  paletteButtonTextCurrent: {
    color: '#333',
  },
  paletteLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  legendAnswered: {
    backgroundColor: '#4CAF50',
  },
  legendMarked: {
    backgroundColor: '#FF9800',
  },
  legendNotVisited: {
    backgroundColor: '#e0e0e0',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  paletteSubmitButton: {
    backgroundColor: '#FF6B35',
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  paletteSubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  submitConfirmContainer: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  submitConfirmHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  submitConfirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  submitConfirmMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  submitStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  submitStatItem: {
    alignItems: 'center',
  },
  submitStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  submitStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  submitConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  submitConfirmButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitCancelButton: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  submitCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitProceedButton: {},
  submitProceedGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitProceedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  submittingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submittingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 250,
  },
  submittingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  submittingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
