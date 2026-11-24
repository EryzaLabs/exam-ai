import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { Question } from '@/types';
import Card from './Card';
import Button from './Button';

interface QuestionCardProps {
  question: Question;
  onAnswerSelect: (selectedIndex: number, isCorrect: boolean) => void;
  showAnswer?: boolean;
}

export default function QuestionCard({ question, onAnswerSelect, showAnswer = false }: QuestionCardProps) {
  const { width } = useWindowDimensions();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null && !showAnswer) return;
    
    setSelectedOption(index);
    const isCorrect = index === question.correctAnswer;
    
    if (!showAnswer) {
      setShowExplanation(true);
      onAnswerSelect(index, isCorrect);
    }
  };

  const getOptionStyle = (index: number) => {
    if (!showExplanation && !showAnswer) {
      return selectedOption === index ? styles.selectedOption : styles.option;
    }
    
    if (index === question.correctAnswer) {
      return styles.correctOption;
    }
    
    if (selectedOption === index && index !== question.correctAnswer) {
      return styles.incorrectOption;
    }
    
    return styles.option;
  };

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.subject}>{question.subject}</Text>
        <Text style={styles.difficulty}>{question.difficulty}</Text>
      </View>
      
      <View style={styles.questionContainer}>
        <RenderHtml
          contentWidth={width - 64}
          source={{ html: question.question }}
          baseStyle={{ fontFamily: 'Inter-Medium', fontSize: 16, color: '#1C1C1E', lineHeight: 24 }}
          tagsStyles={{
             img: { maxWidth: '100%' },
             p: { marginBottom: 8 }
          }}
        />
      </View>
      
      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={getOptionStyle(index)}
            onPress={() => handleOptionSelect(index)}
            disabled={showExplanation && !showAnswer}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>{String.fromCharCode(65 + index)}</Text>
              <View style={{ flex: 1 }}>
                <RenderHtml
                    contentWidth={width - 120}
                    source={{ html: option }}
                    baseStyle={{ fontFamily: 'Inter-Regular', fontSize: 15, color: '#1C1C1E' }}
                />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      
      {(showExplanation || showAnswer) && (
        <View style={styles.explanationContainer}>
          <Text style={styles.explanationTitle}>Explanation:</Text>
          <RenderHtml
            contentWidth={width - 64}
            source={{ html: question.explanation || 'No explanation provided.' }}
            baseStyle={{ fontFamily: 'Inter-Regular', fontSize: 14, color: '#3A3A3C', lineHeight: 20 }}
            tagsStyles={{
                img: { maxWidth: '100%' }
            }}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subject: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  difficulty: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8E8E93',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  questionContainer: {
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F0F8FF',
  },
  correctOption: {
    borderWidth: 2,
    borderColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F0FFF4',
  },
  incorrectOption: {
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF5F5',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#8E8E93',
    minWidth: 20,
    marginTop: 2,
  },
  explanationContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  explanationTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
});