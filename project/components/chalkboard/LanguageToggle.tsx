import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useChalkboardTheme } from '@/constants/chalkboard-theme';
import { useLanguage } from '@/context/language-context';

export default function LanguageToggle() {
  const { colors, radii } = useChalkboardTheme();
  const { lang, setLang } = useLanguage();

  return (
    <View
      style={[
        styles.pillWrap,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderRadius: radii.button,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => setLang('en')}
        style={[
          styles.btn,
          lang === 'en' && {
            backgroundColor: colors.accent,
            borderRadius: radii.button - 2,
          },
        ]}
        activeOpacity={0.75}
        accessibilityLabel="Switch app language to English"
      >
        <Text
          style={[
            styles.btnText,
            { color: lang === 'en' ? colors.accentText : colors.muted },
          ]}
        >
          EN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setLang('hi')}
        style={[
          styles.btn,
          lang === 'hi' && {
            backgroundColor: colors.accent,
            borderRadius: radii.button - 2,
          },
        ]}
        activeOpacity={0.75}
        accessibilityLabel="ऐप की भाषा हिंदी में बदलें"
      >
        <Text
          style={[
            styles.btnText,
            { color: lang === 'hi' ? colors.accentText : colors.muted },
          ]}
        >
          हिं
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  pillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 2,
    height: 36,
  },
  btn: {
    paddingHorizontal: 8,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
