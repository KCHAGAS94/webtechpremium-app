import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n/language-context';
import type { TranslationKey } from '@/i18n/translations';
import type { LanguageCode } from '@/utils/language-storage';

const LANGUAGE_OPTIONS: { code: LanguageCode; labelKey: TranslationKey }[] = [
  { code: 'pt', labelKey: 'language_pt' },
  { code: 'en', labelKey: 'language_en' },
  { code: 'es', labelKey: 'language_es' },
  { code: 'ja', labelKey: 'language_ja' },
  { code: 'zh', labelKey: 'language_zh' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

// Same D-pad focus-highlight pattern as settings-screen.tsx's SettingsCard.
function FocusableRow({
  onPress,
  children,
  hasTVPreferredFocus,
}: {
  onPress: () => void;
  children: React.ReactNode;
  hasTVPreferredFocus?: boolean;
}) {
  const [focused, setFocused] = useState(!!hasTVPreferredFocus);
  return (
    <Pressable
      style={[styles.row, focused && styles.rowFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      {children}
    </Pressable>
  );
}

function FocusableActionButton({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      style={[styles.actionButton, focused && styles.actionButtonFocused]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}

/** "mudar idioma" — picks the app's UI language, persisted via language-storage.ts. */
export function LanguageModal({ visible, onClose }: Props) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.header}>
            <Text allowFontScaling={false} style={styles.headerTitle}>
              {t('language_modal_title')}
            </Text>
          </View>

          {LANGUAGE_OPTIONS.map((option) => (
            <FocusableRow
              key={option.code}
              onPress={() => {
                setLanguage(option.code);
                onClose();
              }}
              hasTVPreferredFocus={option.code === language}
            >
              <Text allowFontScaling={false} style={styles.rowLabel}>
                {t(option.labelKey)}
              </Text>
              {option.code === language && <Text style={styles.rowCheck}>✓</Text>}
            </FocusableRow>
          ))}

          <View style={styles.actions}>
            <FocusableActionButton onPress={onClose}>
              <Text allowFontScaling={false} style={styles.actionButtonText}>{t('action_close')}</Text>
            </FocusableActionButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#12004f',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 10,
    width: 320,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#170066',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 162, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowFocused: {
    borderColor: '#3ddc84',
    backgroundColor: '#1f24c2',
  },
  rowLabel: {
    color: '#ffffff',
    fontSize: 14,
  },
  rowCheck: {
    color: '#4dd6ff',
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 162, 255, 0.25)',
  },
  actionButton: {
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonFocused: {
    borderColor: '#3ddc84',
    backgroundColor: '#1f24c2',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
