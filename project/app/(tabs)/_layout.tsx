import { Tabs } from 'expo-router';
import { Home, Brain, MessageSquare, TrendingUp as TrendUp, Trophy, User, Bookmark, Swords } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: 0,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter-Medium',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Practice',
          tabBarIcon: ({ size, color }) => (
            <Brain size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'AI Assistant',
          tabBarIcon: ({ size, color }) => (
            <MessageSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="battle"
        options={{
          title: 'Battle',
          href: null,
          tabBarIcon: ({ size, color }) => (
            <Swords size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Bookmarks',
          href: null,
          tabBarIcon: ({ size, color }) => (
            <Bookmark size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          href: null,
          tabBarIcon: ({ size, color }) => (
            <TrendUp size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          href: null,
          tabBarIcon: ({ size, color }) => (
            <Trophy size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}