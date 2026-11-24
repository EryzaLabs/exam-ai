/**
 * PDF Upload Component
 * UI for uploading and processing exam PDFs
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { PDFProcessor } from '@/services/pdf-processor';
import { QuestionDatabaseService } from '@/services/question-database';

interface ProcessingStatus {
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  questionCount?: number;
  error?: string;
}

export default function PDFUploadComponent() {
  const [files, setFiles] = useState<ProcessingStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Pick PDF files
   */
  const pickPDFs = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.assets) {
        const newFiles: ProcessingStatus[] = result.assets.map((asset) => ({
          fileName: asset.name,
          status: 'pending',
          progress: 0,
          stage: 'Waiting to start',
        }));

        setFiles([...files, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Failed to pick files');
    }
  };

  /**
   * Process all pending files
   */
  const processPDFs = async () => {
    if (files.length === 0) {
      Alert.alert('No Files', 'Please select PDF files first');
      return;
    }

    setIsProcessing(true);

    const processor = new PDFProcessor();
    const dbService = new QuestionDatabaseService();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.status !== 'pending') continue;

      try {
        // Update status
        updateFileStatus(i, {
          status: 'processing',
          progress: 0,
          stage: 'Starting...',
        });

        // Process PDF (in production, you'd pass the actual file path)
        // This is a placeholder - actual implementation would use the file URI
        const job = await processor.processPDF(file.fileName);

        // Update progress
        updateFileStatus(i, {
          progress: 50,
          stage: 'Extracting questions...',
        });

        // Import into database
        if (job.results) {
          await dbService.importQuestions(
            job.results.extractedQuestions,
            job.results.documentStructure.papers.map((p) => ({
              id: p.paperId,
              name: p.paperName,
              type: 'paper_type' as const,
              metadata: {
                examType: job.results!.documentStructure.examType,
                year: job.results!.documentStructure.year,
                paperName: p.paperName,
                questionCount: p.totalQuestions,
                createdAt: new Date(),
                source: file.fileName,
              },
              questions: [],
            }))
          );

          updateFileStatus(i, {
            status: 'completed',
            progress: 100,
            stage: 'Completed',
            questionCount: job.results.extractedQuestions.length,
          });
        }
      } catch (error) {
        console.error(`Error processing ${file.fileName}:`, error);
        updateFileStatus(i, {
          status: 'failed',
          stage: 'Failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    setIsProcessing(false);
    Alert.alert(
      'Processing Complete',
      'All PDFs have been processed. Questions are now available in the app!'
    );
  };

  /**
   * Update file status
   */
  const updateFileStatus = (
    index: number,
    updates: Partial<ProcessingStatus>
  ) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], ...updates };
      return newFiles;
    });
  };

  /**
   * Remove file
   */
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Clear all files
   */
  const clearAll = () => {
    setFiles([]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>Import Question Papers</Text>
        <Text style={styles.headerSubtitle}>
          Upload exam PDFs to automatically extract questions
        </Text>
      </LinearGradient>

      {/* Upload Button */}
      <View style={styles.uploadSection}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickPDFs}
          disabled={isProcessing}
        >
          <Upload color="#667eea" size={24} />
          <Text style={styles.uploadButtonText}>Select PDF Files</Text>
        </TouchableOpacity>

        {files.length > 0 && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.processButton,
                isProcessing && styles.processButtonDisabled,
              ]}
              onPress={processPDFs}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.processButtonText}>
                  Process {files.length} File(s)
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearAll}
              disabled={isProcessing}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* File List */}
      <ScrollView style={styles.fileList}>
        {files.map((file, index) => (
          <View key={index} style={styles.fileItem}>
            <View style={styles.fileHeader}>
              <FileText color="#667eea" size={20} />
              <Text style={styles.fileName} numberOfLines={1}>
                {file.fileName}
              </Text>

              {file.status === 'completed' && (
                <CheckCircle color="#10b981" size={20} />
              )}
              {file.status === 'failed' && (
                <XCircle color="#ef4444" size={20} />
              )}
              {file.status === 'processing' && (
                <ActivityIndicator size="small" color="#667eea" />
              )}
            </View>

            {/* Progress */}
            {file.status === 'processing' && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${file.progress}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>{file.stage}</Text>
              </View>
            )}

            {/* Status */}
            <View style={styles.fileStatus}>
              {file.status === 'completed' && file.questionCount && (
                <Text style={styles.successText}>
                  ✓ Extracted {file.questionCount} questions
                </Text>
              )}
              {file.status === 'failed' && (
                <Text style={styles.errorText}>✗ {file.error}</Text>
              )}
              {file.status === 'pending' && (
                <Text style={styles.pendingText}>Waiting to process...</Text>
              )}
            </View>

            {/* Remove button */}
            {file.status !== 'processing' && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFile(index)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Info Box */}
      {files.length === 0 && (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Select one or more PDF files containing exam questions
          </Text>
          <Text style={styles.infoText}>
            2. Our AI will automatically extract questions, options, and answers
          </Text>
          <Text style={styles.infoText}>
            3. Questions will be organized by exam, subject, and year
          </Text>
          <Text style={styles.infoText}>
            4. Start practicing immediately after processing!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  uploadSection: {
    padding: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  processButton: {
    flex: 1,
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  processButtonDisabled: {
    opacity: 0.6,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  clearButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  fileList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fileItem: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  fileStatus: {
    marginTop: 8,
  },
  successText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
  pendingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  removeButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
  infoBox: {
    margin: 20,
    padding: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 8,
  },
});
