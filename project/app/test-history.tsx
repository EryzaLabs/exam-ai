import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { TestProgressService, TestResult } from '@/services/test-progress-service';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Calendar, ArrowLeft, Search, SlidersHorizontal, ArrowDown, ArrowUp } from 'lucide-react-native';
import DesktopDashboard from '@/components/DesktopDashboard';

export default function TestHistoryScreen() {
    const [history, setHistory] = useState<TestResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<'date_desc' | 'date_asc' | 'score_desc' | 'score_asc'>('date_desc');
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 1024;

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        const data = await TestProgressService.getTestHistory();
        setHistory(data);
        setLoading(false);
    };

    const filteredAndSortedHistory = useMemo(() => {
        let result = [...history];

        // Search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item => 
                (item.testTitle || '').toLowerCase().includes(query)
            );
        }

        // Sort
        result.sort((a, b) => {
            if (sortOption === 'date_desc') {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            } else if (sortOption === 'date_asc') {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            } else if (sortOption === 'score_desc') {
                return b.accuracy - a.accuracy; // use accuracy for sorting
            } else if (sortOption === 'score_asc') {
                return a.accuracy - b.accuracy;
            }
            return 0;
        });

        return result;
    }, [history, searchQuery, sortOption]);

    const getScoreColor = (score: number, maxScore: number) => {
        const p = (score / maxScore) * 100;
        if (p >= 70) return '#059669'; // emerald-600
        if (p >= 40) return '#D97706'; // amber-600
        return '#DC2626'; // red-600
    };

    const renderItem = ({ item }: { item: TestResult }) => {
        const p = (item.overallScore / item.totalMarks) * 100;
        const attempted = item.sectionAnalytics?.reduce((sum, sec) => sum + (sec.attempted || 0), 0) || 0;
        
        return (
            <TouchableOpacity 
                style={styles.card} 
                onPress={() => router.push({ pathname: '/test-result', params: { attemptId: item.attemptId } })}
                activeOpacity={0.7}
            >
                <View style={styles.cardContent}>
                    <Text style={styles.title} numberOfLines={2}>{item.testTitle || 'Unknown Test'}</Text>
                    <View style={styles.metaContainer}>
                        <View style={styles.metaBadge}>
                            <Calendar size={12} color="#64748B" style={{marginRight: 4}} />
                            <Text style={styles.subtitle}>{new Date(item.date).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.metaBadge}>
                            <Text style={[styles.subtitle, { color: getScoreColor(item.overallScore, item.totalMarks), fontWeight: '600' }]}>
                                {item.accuracy.toFixed(1)}% Accuracy
                            </Text>
                        </View>
                        <View style={styles.metaBadge}>
                            <Text style={styles.subtitle}>
                                {attempted} Qs Attempted
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={styles.rightSection}>
                    <View style={[styles.scoreCircle, { borderColor: getScoreColor(item.overallScore, item.totalMarks) }]}>
                        <Text style={[styles.scoreText, { color: getScoreColor(item.overallScore, item.totalMarks) }]}>
                            {Number(item.overallScore.toFixed(2))}
                        </Text>
                    </View>
                    <ChevronRight size={20} color="#CBD5E1" />
                </View>
            </TouchableOpacity>
        );
    };

    const toggleSort = () => {
        setSortOption(prev => {
            if (prev === 'date_desc') return 'date_asc';
            if (prev === 'date_asc') return 'score_desc';
            if (prev === 'score_desc') return 'score_asc';
            return 'date_desc';
        });
    };

    const content = (
        <SafeAreaView style={[styles.container, isLargeScreen && { flex: undefined, minHeight: 600 }]} edges={['bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Test History</Text>
            </View>

            <View style={styles.filtersContainer}>
                <View style={styles.searchBar}>
                    <Search size={18} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search tests..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity style={styles.sortButton} onPress={toggleSort}>
                    <SlidersHorizontal size={16} color="#64748B" style={{marginRight: 6}} />
                    <Text style={styles.sortButtonText}>
                        {sortOption.includes('date') ? 'Date' : 'Score'}
                    </Text>
                    {sortOption.includes('desc') ? <ArrowDown size={14} color="#64748B" style={{marginLeft: 4}}/> : <ArrowUp size={14} color="#64748B" style={{marginLeft: 4}}/>}
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
            ) : (
                <FlatList
                    data={filteredAndSortedHistory}
                    renderItem={renderItem}
                    keyExtractor={item => item.attemptId}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.centerContent}>
                            <Text style={styles.emptyText}>No tests found matching your search.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );

    if (isLargeScreen) {
        return <DesktopDashboard>{content}</DesktopDashboard>;
    }

    return content;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center' },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
    
    filtersContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        color: '#1E293B',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    sortButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },

    list: { padding: 16, paddingBottom: 40 },
    card: { 
        backgroundColor: '#fff', 
        padding: 16, 
        marginBottom: 12, 
        borderRadius: 16, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    cardContent: { flex: 1, marginRight: 12 },
    title: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#0F172A', lineHeight: 22 },
    metaContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    subtitle: { fontSize: 13, color: '#64748B' },
    
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    scoreCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreText: {
        fontSize: 14,
        fontWeight: '700',
    },
    
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: { textAlign: 'center', fontSize: 15, color: '#94A3B8' }
});
