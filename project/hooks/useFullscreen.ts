import { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

export const useFullscreen = () => {
  useEffect(() => {
    const setupFullscreen = async () => {
      if (Platform.OS === 'android') {
        try {
          // Configure status bar
          StatusBar.setHidden(false);
          StatusBar.setTranslucent(true);
        //   StatusBar.setBackgroundColor('transparent', true);
          StatusBar.setBarStyle('light-content', true);
          
          // Set system UI background color to transparent
        //   await SystemUI.setBackgroundColorAsync('transparent');
          
          // Configure navigation bar for true edge-to-edge fullscreen
        //   await NavigationBar.setBackgroundColorAsync('transparent');
        //   await NavigationBar.setBorderColorAsync('transparent');
        //   await NavigationBar.setPositionAsync('absolute');
          await NavigationBar.setVisibilityAsync('hidden');
          
        } catch (error) {
          console.log('Fullscreen configuration failed:', error);
          // Fallback: try basic configuration
          try {
            // await NavigationBar.setBackgroundColorAsync('transparent');
            await NavigationBar.setVisibilityAsync('hidden');
          } catch (fallbackError) {
            console.log('Fallback configuration also failed:', fallbackError);
          }
        }
      }
    };

    setupFullscreen();
  }, []);
};
