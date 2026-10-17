import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';

interface TimerProps {
  duration: number; // in seconds
  onTimeUp: () => void;
  isRunning?: boolean;
}

export default function Timer({ duration, onTimeUp, isRunning = true }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, isRunning, onTimeUp]);

  const formatTime = (seconds: number) => {
    const totalSecs = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    const percentage = timeLeft / duration;
    if (percentage <= 0.1) return '#FF3B30'; // Red
    if (percentage <= 0.3) return '#FF9500'; // Orange
    return '#007AFF'; // Blue
  };

  return (
    <View style={styles.container}>
      <Clock size={20} color={getTimeColor()} />
      <Text style={[styles.timeText, { color: getTimeColor() }]}>
        {formatTime(timeLeft)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  timeText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
});