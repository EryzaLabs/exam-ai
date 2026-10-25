import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Medal, Award, Users, Globe, GraduationCap, TrendingUp as TrendUp } from 'lucide-react-native';
import Card from '@/components/Card';
import { mockLeaderboard } from '@/data/mockData';

type FilterType = 'global' | 'friends' | 'school';

export default function LeaderboardScreen() {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('global');

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy size={20} color="#FFD700" />;
      case 2:
        return <Medal size={20} color="#C0C0C0" />;
      case 3:
        return <Award size={20} color="#CD7F32" />;
      default:
        return (
          <View style={styles.rankNumber}>
            <Text style={styles.rankText}>{position}</Text>
          </View>
        );
    }
  };

  const getFilterIcon = (filter: FilterType) => {
    switch (filter) {
      case 'global':
        return <Globe size={16} color={selectedFilter === filter ? '#FFFFFF' : '#007AFF'} />;
      case 'friends':
        return <Users size={16} color={selectedFilter === filter ? '#FFFFFF' : '#007AFF'} />;
      case 'school':
        return <GraduationCap size={16} color={selectedFilter === filter ? '#FFFFFF' : '#007AFF'} />;
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'global', label: 'Global' },
    { key: 'friends', label: 'Friends' },
    { key: 'school', label: 'School' },
  ];

  const currentUserRank = mockLeaderboard.findIndex(user => user.name === 'Aryan') + 1;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Leaderboard</Text>
        
        <Card>
          <Text style={styles.cardTitle}>Your Position</Text>
          <View style={styles.userPositionContainer}>
            <View style={styles.userRankBadge}>
              {getRankIcon(currentUserRank)}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Aryan</Text>
              <Text style={styles.userStats}>Rank #{currentUserRank} • 2180 points • 78.5% accuracy</Text>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.filterContainer}>
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.key && styles.activeFilter
                ]}
                onPress={() => setSelectedFilter(filter.key)}
              >
                {getFilterIcon(filter.key)}
                <Text style={[
                  styles.filterText,
                  selectedFilter === filter.key && styles.activeFilterText
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Top Performers</Text>
          <View style={styles.leaderboardContainer}>
            {mockLeaderboard.slice(0, 3).map((user, index) => (
              <View key={user.id} style={[
                styles.topUserCard,
                index === 0 && styles.firstPlace,
                index === 1 && styles.secondPlace,
                index === 2 && styles.thirdPlace,
              ]}>
                <View style={styles.topUserRank}>
                  {getRankIcon(index + 1)}
                </View>
                <View style={styles.topUserInfo}>
                  <Text style={styles.topUserName}>{user.name}</Text>
                  <Text style={styles.topUserScore}>{user.score} points</Text>
                  <Text style={styles.topUserAccuracy}>{user.accuracy}% accuracy</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Full Rankings</Text>
          <View style={styles.rankingsContainer}>
            {mockLeaderboard.map((user, index) => (
              <View 
                key={user.id} 
                style={[
                  styles.rankingItem,
                  user.name === 'Aryan' && styles.currentUserItem
                ]}
              >
                <View style={styles.rankingLeft}>
                  <View style={styles.rankingPosition}>
                    {getRankIcon(index + 1)}
                  </View>
                  <View style={styles.rankingInfo}>
                    <Text style={[
                      styles.rankingName,
                      user.name === 'Aryan' && styles.currentUserName
                    ]}>
                      {user.name}
                      {user.name === 'Aryan' && ' (You)'}
                    </Text>
                    <Text style={styles.rankingAccuracy}>{user.accuracy}% accuracy</Text>
                  </View>
                </View>
                <Text style={styles.rankingScore}>{user.score}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Achievement Highlights</Text>
          <View style={styles.achievementsContainer}>
            <View style={styles.achievementItem}>
              <Trophy size={20} color="#FFD700" />
              <Text style={styles.achievementText}>
                🎉 You're in the top 25% of all users!
              </Text>
            </View>
            <View style={styles.achievementItem}>
              <TrendUp size={20} color="#34C759" />
              <Text style={styles.achievementText}>
                📈 Moved up 3 positions this week
              </Text>
            </View>
            <View style={styles.achievementItem}>
              <Award size={20} color="#FF9500" />
              <Text style={styles.achievementText}>
                🎯 Beat your personal best score!
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1E',
    marginVertical: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  userPositionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  userRankBadge: {
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1E',
  },
  userStats: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  activeFilter: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  leaderboardContainer: {
    gap: 12,
  },
  topUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 16,
  },
  firstPlace: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD700',
  },
  secondPlace: {
    backgroundColor: '#F8F8F8',
    borderColor: '#C0C0C0',
  },
  thirdPlace: {
    backgroundColor: '#FFF4E6',
    borderColor: '#CD7F32',
  },
  topUserRank: {
    alignItems: 'center',
  },
  topUserInfo: {
    flex: 1,
  },
  topUserName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1E',
  },
  topUserScore: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#007AFF',
    marginTop: 2,
  },
  topUserAccuracy: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  rankingsContainer: {
    gap: 8,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  currentUserItem: {
    backgroundColor: '#F0F8FF',
    borderColor: '#007AFF',
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankingPosition: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1E',
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1E',
  },
  currentUserName: {
    color: '#007AFF',
  },
  rankingAccuracy: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8E8E93',
  },
  rankingScore: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#007AFF',
  },
  achievementsContainer: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  achievementText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1E',
    flex: 1,
  },
});