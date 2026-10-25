/**
 * Example: How to Load All SSC CGL Papers
 * 
 * Copy this code to your app/_layout.tsx file
 */

import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { loadAllSSCCGLPapers, loadPapersByYear, TOTAL_PAPERS } from './scripts/generated-loader';

export default function RootLayout() {
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState('');

  useEffect(() => {
    // Load all papers when app starts
    const initializePapers = async () => {
      try {
        setLoadingProgress(`Loading ${TOTAL_PAPERS} SSC CGL papers...`);
        
        // Option 1: Load all 239 papers (~10-15 seconds)
        const result = await loadAllSSCCGLPapers();
        
        // Option 2: Load only 2024 papers (faster - ~2-3 seconds)
        // const result = await loadPapersByYear(2024);
        
        console.log(`✅ Successfully loaded ${result.loaded} papers!`);
        setLoadingProgress(`Loaded ${result.loaded} papers successfully!`);
        
        // Wait a moment to show success message
        setTimeout(() => {
          setLoadingPapers(false);
        }, 500);
        
      } catch (error) {
        console.error('Failed to load papers:', error);
        setLoadingProgress('Error loading papers');
        setLoadingPapers(false);
      }
    };

    initializePapers();
  }, []);

  // Show loading screen while papers are being loaded
  if (loadingPapers) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>
          {loadingProgress}
        </Text>
        <Text style={{ color: '#94A3B8', marginTop: 8, fontSize: 12 }}>
          Please wait...
        </Text>
      </View>
    );
  }

  // Once loaded, show the app
  return <Slot />;
}
