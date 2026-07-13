import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

type Props = {
  macAddress?: string;
  subscriptionStatus?: string;
  onReload: () => void;
  reloading?: boolean;
};

export function DeviceActivationScreen({
  macAddress = '00:1A:3M:A3:02:11',
  subscriptionStatus = 'Expirado / Não Conectado',
  onReload,
  reloading = false,
}: Props) {
  return (
    <LinearGradient
      colors={['#04041a', '#0a0a2e', '#04041a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.card}>
          <ThemedText style={styles.title}>Dispositivo não ativado</ThemedText>
          <ThemedText style={styles.subtitle}>Insira a lista no painel</ThemedText>

          <View style={styles.divider} />

          <View style={styles.detailBlock}>
            <ThemedText style={styles.detailLabel}>Seu Endereço MAC</ThemedText>
            <ThemedText style={styles.macValue}>{macAddress}</ThemedText>
          </View>

          <View style={styles.detailBlock}>
            <ThemedText style={styles.detailLabel}>Status da Assinatura</ThemedText>
            <ThemedText style={styles.statusValue}>{subscriptionStatus}</ThemedText>
          </View>

          <View style={styles.divider} />

          <ThemedText style={styles.instructions}>
            Acesse o site{' '}
            <ThemedText style={styles.link}>https://www.paineldousuario.com.br/</ThemedText>{' '}
            ou fale com seu revendedor para vincular sua lista M3U a este endereço MAC.
          </ThemedText>

          <TouchableOpacity
            style={[styles.reloadButton, reloading && styles.reloadButtonDisabled]}
            onPress={onReload}
            disabled={reloading}
            activeOpacity={0.8}
          >
            <ThemedText style={styles.reloadButtonText}>
              {reloading ? 'Verificando...' : 'Recarregar Lista'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: 'rgba(18, 0, 79, 0.55)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(77, 214, 255, 0.35)',
    paddingHorizontal: 22,
    paddingVertical: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#9fa3d1',
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(77, 214, 255, 0.2)',
    marginVertical: 12,
  },
  detailBlock: {
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 10,
    color: '#9fa3d1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  macValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4dd6ff',
    letterSpacing: 1,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ff5c5c',
  },
  instructions: {
    fontSize: 12,
    lineHeight: 17,
    color: '#c7c7e6',
    textAlign: 'center',
  },
  link: {
    color: '#4dd6ff',
    fontWeight: '600',
  },
  reloadButton: {
    marginTop: 16,
    backgroundColor: '#2a5fd6',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  reloadButtonDisabled: {
    opacity: 0.6,
  },
  reloadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
