import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Flag,
  ArrowLeft,
  BarChart3,
} from 'lucide-react-native';
import ReportService, { QuestionReport, ReportStatus } from '@/services/report-service';

const statusColors = {
  pending: '#FF9500',
  reviewed: '#4A90E2',
  resolved: '#34C759',
  dismissed: '#8E8E93',
};

const statusIcons = {
  pending: Clock,
  reviewed: AlertTriangle,
  resolved: CheckCircle,
  dismissed: XCircle,
};

const reportTypeLabels = {
  wrong_answer: 'Wrong Answer',
  incorrect_question: 'Incorrect Question',
  typo: 'Typo/Error',
  inappropriate: 'Inappropriate Content',
  other: 'Other Issue',
};

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    byStatus: Record<ReportStatus, number>;
    byType: Record<string, number>;
  } | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all');

  useEffect(() => {
    loadReports();
    loadStats();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const allReports = await ReportService.getAllReports();
      setReports(allReports);
    } catch (error) {
      Alert.alert('Error', 'Failed to load reports');
      console.error('Load reports error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const reportStats = await ReportService.getReportStats();
      setStats(reportStats);
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: ReportStatus) => {
    try {
      await ReportService.updateReportStatus(reportId, newStatus);
      await loadReports();
      await loadStats();
      Alert.alert('Success', `Report marked as ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update report status');
      console.error('Update status error:', error);
    }
  };

  const filteredReports =
    filterStatus === 'all'
      ? reports
      : reports.filter((r) => r.status === filterStatus);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Flag size={20} color="#4A90E2" />
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Reports</Text>
          </View>
          <View style={styles.statCard}>
            <Clock size={20} color="#FF9500" />
            <Text style={styles.statNumber}>{stats.byStatus.pending || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle size={20} color="#34C759" />
            <Text style={styles.statNumber}>{stats.byStatus.resolved || 0}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      )}

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as const).map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filterStatus === status && styles.filterButtonActive,
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterStatus === status && styles.filterButtonTextActive,
              ]}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reports List */}
      <ScrollView
        style={styles.reportsList}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadReports} />
        }
      >
        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <BarChart3 size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No reports found</Text>
          </View>
        ) : (
          filteredReports.map((report) => {
            const StatusIcon = statusIcons[report.status || 'pending'];
            return (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View style={styles.reportTypeContainer}>
                    <Flag size={16} color="#FF9500" />
                    <Text style={styles.reportType}>
                      {reportTypeLabels[report.reportType]}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors[report.status || 'pending'] },
                    ]}
                  >
                    <StatusIcon size={12} color="#fff" />
                    <Text style={styles.statusText}>
                      {(report.status || 'pending').charAt(0).toUpperCase() + (report.status || 'pending').slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.reportDescription}>{report.description}</Text>

                <View style={styles.reportMeta}>
                  <Text style={styles.reportMetaText}>
                    Test: {report.testTitle || 'Unknown'}
                  </Text>
                  <Text style={styles.reportMetaText}>
                    {formatDate(report.createdAt || Date.now())}
                  </Text>
                </View>

                {report.questionText && (
                  <View style={styles.questionPreview}>
                    <Text style={styles.questionPreviewLabel}>Question:</Text>
                    <Text style={styles.questionPreviewText} numberOfLines={2}>
                      {report.questionText}
                    </Text>
                  </View>
                )}

                {report.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonReviewed]}
                      onPress={() => updateReportStatus(report.id!, 'reviewed')}
                    >
                      <Text style={styles.actionButtonText}>Mark Reviewed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonResolved]}
                      onPress={() => updateReportStatus(report.id!, 'resolved')}
                    >
                      <Text style={styles.actionButtonText}>Resolve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonDismissed]}
                      onPress={() => updateReportStatus(report.id!, 'dismissed')}
                    >
                      <Text style={styles.actionButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {report.status === 'reviewed' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonResolved]}
                      onPress={() => updateReportStatus(report.id!, 'resolved')}
                    >
                      <Text style={styles.actionButtonText}>Resolve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonDismissed]}
                      onPress={() => updateReportStatus(report.id!, 'dismissed')}
                    >
                      <Text style={styles.actionButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  filterContainer: {
    maxHeight: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  reportsList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  reportMeta: {
    gap: 4,
    marginBottom: 12,
  },
  reportMetaText: {
    fontSize: 12,
    color: '#999',
  },
  questionPreview: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  questionPreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  questionPreviewText: {
    fontSize: 12,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonReviewed: {
    backgroundColor: '#4A90E2',
  },
  actionButtonResolved: {
    backgroundColor: '#34C759',
  },
  actionButtonDismissed: {
    backgroundColor: '#8E8E93',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
