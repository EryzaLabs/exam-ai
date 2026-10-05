import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, BookOpen, Clock, AlertCircle, CheckCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function TestInstructionsScreen() {
  const { testId } = useLocalSearchParams();
  const [language, setLanguage] = useState<'english' | 'hindi'>('english');
  const [agreed, setAgreed] = useState(false);

  const handleStartTest = () => {
    if (!agreed) {
      alert('Please agree to the instructions to proceed.');
      return;
    }
    
    router.replace({
      pathname: '/mock-test',
      params: { testId, lang: language },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{language === 'hindi' ? 'सामान्य निर्देश' : 'General Instructions'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 20 }}>
        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{language === 'hindi' ? 'अपनी डिफ़ॉल्ट भाषा चुनें:' : 'Choose your default language:'}</Text>
          <Text style={styles.sectionSubtitle}>{language === 'hindi' ? 'आप परीक्षा के दौरान किसी भी समय अंग्रेजी और हिंदी के बीच स्विच कर सकते हैं।' : 'You can switch between English and Hindi anytime during the test.'}</Text>
          
          <View style={styles.languageOptions}>
            <TouchableOpacity 
              style={[styles.languageButton, language === 'english' && styles.languageButtonActive]}
              onPress={() => setLanguage('english')}
            >
              <Text style={[styles.languageText, language === 'english' && styles.languageTextActive]}>English</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.languageButton, language === 'hindi' && styles.languageButtonActive]}
              onPress={() => setLanguage('hindi')}
            >
              <Text style={[styles.languageText, language === 'hindi' && styles.languageTextActive]}>हिंदी (Hindi)</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'hindi' ? 'कृपया निम्नलिखित निर्देशों को ध्यान से पढ़ें:' : 'Please read the following instructions carefully:'}
          </Text>
          
          <View style={styles.instructionItem}>
            <AlertCircle size={20} color="#4A90E2" style={styles.instructionIcon} />
            <Text style={styles.instructionText}>
              {language === 'hindi' ? 'परीक्षा में बहुविकल्पीय प्रश्न हैं। प्रत्येक प्रश्न का केवल एक सही उत्तर है।' : 'The test contains multiple-choice questions. Each question has exactly one correct answer.'}
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <CheckCircle size={20} color="#4CAF50" style={styles.instructionIcon} />
            <Text style={styles.instructionText}>
              {language === 'hindi' ? (
                <>प्रत्येक सही उत्तर के लिए <Text style={{fontWeight: 'bold'}}>+2.5 अंक</Text> दिए जाएंगे।</>
              ) : (
                <>Every correct answer awards <Text style={{fontWeight: 'bold'}}>+2.5 marks</Text>.</>
              )}
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <AlertCircle size={20} color="#F44336" style={styles.instructionIcon} />
            <Text style={styles.instructionText}>
              {language === 'hindi' ? (
                <>प्रत्येक गलत उत्तर के लिए <Text style={{fontWeight: 'bold'}}>-0.833 अंक</Text> की नकारात्मक मार्किंग (नेगेटिव मार्किंग) है।</>
              ) : (
                <>There is a negative marking of <Text style={{fontWeight: 'bold'}}>-0.833 marks</Text> for each incorrect answer.</>
              )}
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <Clock size={20} color="#FF9800" style={styles.instructionIcon} />
            <Text style={styles.instructionText}>
              {language === 'hindi' ? 'टाइमर लगातार चलेगा। यदि आप ऐप बंद करते हैं, तो परीक्षा रुक जाएगी और आप इसे बाद में फिर से शुरू कर सकते हैं।' : 'The timer will run continuously. If you close the app, the test will be paused and you can resume it later.'}
            </Text>
          </View>
          
          <View style={styles.instructionItem}>
            <BookOpen size={20} color="#9C27B0" style={styles.instructionIcon} />
            <Text style={styles.instructionText}>
              {language === 'hindi' ? 'ब्राउज़र का बैक बटन न दबाएं या पेज को रिफ्रेश न करें, क्योंकि इससे आपका परीक्षा सत्र बाधित हो सकता है।' : 'Do not press the browser back button or refresh the page, as it may disrupt your test session.'}
            </Text>
          </View>
        </View>

        {/* Declaration */}
        <TouchableOpacity 
          style={styles.declarationBox}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <CheckCircle size={16} color="#fff" />}
          </View>
          <Text style={styles.declarationText}>
            {language === 'hindi' ? 'मैंने सभी निर्देशों को पढ़ और समझ लिया है। मैं नियमों का पालन करने के लिए सहमत हूँ।' : 'I have read and understood all the instructions. I agree to abide by the rules.'}
          </Text>
        </TouchableOpacity>
        
        <View style={{height: 100}} />
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.startButton, !agreed && styles.startButtonDisabled]}
          onPress={handleStartTest}
          disabled={!agreed}
        >
          <Text style={styles.startButtonText}>{language === 'hindi' ? 'मैं शुरू करने के लिए तैयार हूँ' : 'I am ready to begin'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  languageOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  languageButtonActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#E3F2FD',
  },
  languageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  languageTextActive: {
    color: '#4A90E2',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  instructionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  declarationBox: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  declarationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  startButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
