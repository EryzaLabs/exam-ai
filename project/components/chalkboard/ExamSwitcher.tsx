import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import { ChevronDown, Check, GraduationCap } from 'lucide-react-native';
import { useExam, ExamTarget, EXAMS } from '@/context/exam-context';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';

export default function ExamSwitcher() {
  const { examMode, setExamMode } = useExam();
  const { colors, radii } = useChalkboardTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 540;
  const [open, setOpen] = useState(false);

  const examOptions: { id: ExamTarget; title: string; short: string; compact: string }[] = [
    { id: 'all', title: 'All Teaching Exams', short: 'All Exams', compact: 'All' },
    { id: 'upsc', title: 'UPSC Principal & Vice-Principal', short: 'UPSC Principal', compact: 'UPSC' },
    { id: 'uppsc', title: 'UP Principal & Headmaster', short: 'UP Principal', compact: 'UP Prin' },
    { id: 'tgt', title: 'DSSSB TGT (Trained Graduate Teacher)', short: 'DSSSB TGT', compact: 'TGT' },
    { id: 'pgt', title: 'DSSSB PGT (Post Graduate Teacher)', short: 'DSSSB PGT', compact: 'PGT' },
  ];

  const currentExam = examOptions.find((e) => e.id === examMode) || examOptions[0];

  const handleSelect = (id: ExamTarget) => {
    setExamMode(id);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surface,
            borderColor: colors.line,
            borderRadius: radii.button,
          },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Selected exam: ${currentExam.title}. Tap to change.`}
      >
        <GraduationCap size={15} color={colors.accent} />
        <Text
          style={[
            styles.triggerText,
            { color: colors.text },
            isCompact && { maxWidth: 65 },
          ]}
          numberOfLines={1}
        >
          {isCompact ? currentExam.compact : currentExam.short}
        </Text>
        <ChevronDown size={14} color={colors.muted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.dropdownMenu,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.line,
                    borderRadius: radii.card,
                  },
                ]}
              >
                <View style={[styles.menuHeader, { borderBottomColor: colors.line }]}>
                  <Text style={[styles.menuHeaderTitle, { color: colors.muted }]}>
                    Switch Target Exam
                  </Text>
                </View>

                {examOptions.map((opt) => {
                  const isSelected = opt.id === examMode;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.menuItem,
                        {
                          borderBottomColor: colors.line,
                          backgroundColor: isSelected ? colors.surface2 : colors.surface,
                        },
                      ]}
                      onPress={() => handleSelect(opt.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.menuItemText,
                          {
                            color: isSelected ? colors.text : colors.muted,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {opt.title}
                      </Text>
                      {isSelected && <Check size={16} color={colors.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    minHeight: 38,
    flexShrink: 0,
  },
  triggerText: {
    fontSize: 13.5,
    fontWeight: '600',
    maxWidth: 130,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownMenu: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  menuHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 14,
    flex: 1,
  },
});
