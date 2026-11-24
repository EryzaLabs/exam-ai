/**
 * Test Filter Component
 * Advanced filtering UI for test generation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { Filter, X, CheckCircle } from 'lucide-react-native';
import { TestFilters } from '@/types';
import { QuestionDatabaseService } from '@/services/question-database';

interface TestFilterProps {
  onApplyFilters: (filters: TestFilters) => void;
  initialFilters?: TestFilters;
}

export default function TestFilterComponent({
  onApplyFilters,
  initialFilters = {},
}: TestFilterProps) {
  const [visible, setVisible] = useState(false);
  const [filters, setFilters] = useState<TestFilters>(initialFilters);
  const [availableOptions, setAvailableOptions] = useState({
    examTypes: [] as string[],
    subjects: [] as string[],
    years: [] as number[],
  });

  const dbService = new QuestionDatabaseService();

  useEffect(() => {
    loadAvailableOptions();
  }, []);

  const loadAvailableOptions = async () => {
    try {
      const [examTypes, subjects, years] = await Promise.all([
        dbService.getExamTypes(),
        dbService.getSubjects(),
        dbService.getYears(),
      ]);

      setAvailableOptions({ examTypes, subjects, years });
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const toggleFilter = (
    category: keyof TestFilters,
    value: string | number
  ) => {
    setFilters((prev) => {
      const current = prev[category] as any[] || [];
      const isSelected = current.includes(value);

      return {
        ...prev,
        [category]: isSelected
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const applyFilters = () => {
    onApplyFilters(filters);
    setVisible(false);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.examTypes && filters.examTypes.length > 0) count++;
    if (filters.subjects && filters.subjects.length > 0) count++;
    if (filters.years && filters.years.length > 0) count++;
    if (filters.difficulties && filters.difficulties.length > 0) count++;
    return count;
  };

  return (
    <>
      {/* Filter Button */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setVisible(true)}
      >
        <Filter color="#667eea" size={20} />
        <Text style={styles.filterButtonText}>Filters</Text>
        {getActiveFilterCount() > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getActiveFilterCount()}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Tests</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            {/* Filter Content */}
            <ScrollView style={styles.filterContent}>
              {/* Exam Types */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Exam Type</Text>
                <View style={styles.optionsGrid}>
                  {availableOptions.examTypes.map((examType) => (
                    <FilterChip
                      key={examType}
                      label={examType}
                      selected={filters.examTypes?.includes(examType)}
                      onPress={() => toggleFilter('examTypes', examType)}
                    />
                  ))}
                </View>
              </View>

              {/* Subjects */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Subject</Text>
                <View style={styles.optionsGrid}>
                  {availableOptions.subjects.map((subject) => (
                    <FilterChip
                      key={subject}
                      label={subject}
                      selected={filters.subjects?.includes(subject)}
                      onPress={() => toggleFilter('subjects', subject)}
                    />
                  ))}
                </View>
              </View>

              {/* Years */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Year</Text>
                <View style={styles.optionsGrid}>
                  {availableOptions.years.map((year) => (
                    <FilterChip
                      key={year}
                      label={year.toString()}
                      selected={filters.years?.includes(year)}
                      onPress={() => toggleFilter('years', year)}
                    />
                  ))}
                </View>
              </View>

              {/* Difficulty */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Difficulty</Text>
                <View style={styles.optionsGrid}>
                  {['Easy', 'Medium', 'Hard'].map((difficulty) => (
                    <FilterChip
                      key={difficulty}
                      label={difficulty}
                      selected={filters.difficulties?.includes(
                        difficulty as 'Easy' | 'Medium' | 'Hard'
                      )}
                      onPress={() => toggleFilter('difficulties', difficulty)}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Filter Chip Component
function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      {selected && <CheckCircle color="#667eea" size={16} />}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  badge: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  filterContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#667eea',
  },
  chipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#667eea',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
