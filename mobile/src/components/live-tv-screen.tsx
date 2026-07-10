import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type NavKey = 'home' | 'live' | 'movies' | 'series';

type Category = {
  id: string;
  title: string;
  count: number;
};

type Channel = {
  id: string;
  number: number;
  name: string;
  logo: string;
};

type EpgEntry = {
  start: string;
  end: string;
  title: string;
};

const CATEGORIES: Category[] = [
  { id: 'all', title: 'Tudo', count: 2203 },
  { id: 'favorites', title: 'Favoritos', count: 0 },
  { id: 'client-area', title: 'Área do Cliente', count: 2 },
  { id: 'world-cup', title: 'Canais | Copa do Mundo 2026', count: 0 },
  { id: 'globo-sul', title: 'Canais | Globo Sul', count: 43 },
  { id: 'globo-sudeste', title: 'Canais | Globo Sudeste', count: 89 },
  { id: 'globo-centro-oeste', title: 'Canais | Globo Centro-Oeste', count: 22 },
  { id: 'globo-norte', title: 'Canais | Globo Norte e Nordeste', count: 20 },
  { id: 'globo-nordeste', title: 'Canais | Globo Nordeste', count: 46 },
  { id: 'abertos', title: 'Canais | Abertos', count: 42 },
];

const CHANNELS: Channel[] = [
  { id: '1', number: 1, name: 'A&E FHD', logo: '📺' },
  { id: '2', number: 2, name: 'A&E FHD [H265]', logo: '📺' },
  { id: '3', number: 3, name: 'A&E HD', logo: '📺' },
  { id: '4', number: 4, name: 'A&E SD', logo: '📺' },
  { id: '5', number: 5, name: 'AMC FHD', logo: '🎬' },
  { id: '6', number: 6, name: 'AMC FHD [H265]', logo: '🎬' },
  { id: '7', number: 7, name: 'AMC HD', logo: '🎬' },
  { id: '8', number: 8, name: 'AMC SD', logo: '🎬' },
  { id: '9', number: 9, name: 'Animal Planet FHD', logo: '🐾' },
  { id: '10', number: 10, name: 'Animal Planet FHD [H265]', logo: '🐾' },
  { id: '11', number: 11, name: 'Animal Planet HD', logo: '🐾' },
];

const EPG: Record<string, EpgEntry[]> = {
  '1': [
    { start: '07:05 PM', end: '08:15 PM', title: 'Linha de Combate' },
    { start: '08:15 PM', end: '09:05 PM', title: 'Operação Policial' },
    { start: '09:05 PM', end: '10:00 PM', title: 'Operação Policial' },
    { start: '10:00 PM', end: '11:00 PM', title: 'Bosch' },
    { start: '11:00 PM', end: '11:55 PM', title: 'Operação Policial' },
  ],
};

const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: 'home', label: 'Casa' },
  { key: 'live', label: 'TV ao Vivo' },
  { key: 'movies', label: 'Filmes' },
  { key: 'series', label: 'Séries' },
];

type Props = {
  onNavigate: (key: NavKey) => void;
};

export function LiveTvScreen({ onNavigate }: Props) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState<Channel>(CHANNELS[0]);
  const [search, setSearch] = useState('');

  const filteredChannels = useMemo(() => {
    if (!search.trim()) return CHANNELS;
    const q = search.trim().toLowerCase();
    return CHANNELS.filter((c) => c.name.toLowerCase().includes(q));
  }, [search]);

  const epgEntries = EPG[selectedChannel.id] ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerNav}>
            {NAV_ITEMS.map((item) => (
              <TouchableOpacity key={item.key} onPress={() => onNavigate(item.key)}>
                <ThemedText
                  style={[styles.headerNavItem, item.key === 'live' && styles.headerNavItemActive]}
                >
                  {item.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.searchBox}>
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder=""
              placeholderTextColor="#8888aa"
              style={styles.searchInput}
            />
          </View>

          <ThemedText style={styles.brand}>webtech</ThemedText>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Categories */}
          <View style={styles.categoriesColumn}>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryRow}
                  onPress={() => setActiveCategory(item.id)}
                >
                  <ThemedText
                    style={[
                      styles.categoryTitle,
                      item.id === activeCategory && styles.categoryTitleActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </ThemedText>
                  <ThemedText style={styles.categoryCount}>{item.count}</ThemedText>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Channels */}
          <View style={styles.channelsColumn}>
            <FlatList
              data={filteredChannels}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedChannel.id;
                return (
                  <TouchableOpacity
                    style={[styles.channelRow, isSelected && styles.channelRowSelected]}
                    onPress={() => setSelectedChannel(item)}
                  >
                    <ThemedText style={styles.channelNumber}>{item.number}</ThemedText>
                    <ThemedText style={styles.channelLogo}>{item.logo}</ThemedText>
                    <ThemedText style={styles.channelName} numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {/* Preview + EPG */}
          <View style={styles.previewColumn}>
            <View style={styles.previewPlayer}>
              <ThemedText style={styles.previewPlaceholder}>▶</ThemedText>
            </View>

            <View style={styles.previewInfo}>
              <ThemedText style={styles.previewTitle}>{selectedChannel.name}</ThemedText>

              {epgEntries.map((entry, index) => (
                <View key={index} style={styles.epgRow}>
                  <ThemedText style={styles.epgTime}>
                    {entry.start} ~ {entry.end}
                  </ThemedText>
                  <ThemedText style={styles.epgTitle} numberOfLines={1}>
                    {entry.title}
                  </ThemedText>
                </View>
              ))}

              <View style={styles.previewActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <ThemedText style={styles.actionButtonText}>alcançar</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <ThemedText style={styles.actionButtonText}>Adicionar aos favoritos</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <ThemedText style={styles.actionButtonText}>procurar</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a2e',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#252560',
  },
  headerNav: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  headerNavItem: {
    fontSize: 15,
    color: '#c7c7e6',
    fontWeight: '500',
  },
  headerNavItemActive: {
    color: '#4dd6ff',
    fontWeight: '700',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4dd6ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
    color: '#8888aa',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    padding: 0,
  },
  brand: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  categoriesColumn: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: '#1e1e50',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a45',
  },
  categoryTitle: {
    fontSize: 13,
    color: '#c7c7e6',
    flexShrink: 1,
    paddingRight: 8,
  },
  categoryTitleActive: {
    color: '#4dd6ff',
    fontWeight: '700',
  },
  categoryCount: {
    fontSize: 13,
    color: '#8888aa',
  },
  channelsColumn: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: '#1e1e50',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a45',
  },
  channelRowSelected: {
    backgroundColor: '#1a3a6b',
  },
  channelNumber: {
    fontSize: 13,
    color: '#8888aa',
    width: 20,
  },
  channelLogo: {
    fontSize: 16,
  },
  channelName: {
    fontSize: 13,
    color: '#fff',
    flexShrink: 1,
  },
  previewColumn: {
    flex: 1,
  },
  previewPlayer: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholder: {
    fontSize: 40,
    color: '#4dd6ff',
  },
  previewInfo: {
    padding: 16,
    gap: 6,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  epgRow: {
    flexDirection: 'row',
    gap: 12,
  },
  epgTime: {
    fontSize: 13,
    color: '#4dd6ff',
    width: 140,
  },
  epgTitle: {
    fontSize: 13,
    color: '#e2e2f2',
    flexShrink: 1,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    backgroundColor: '#2a5fd6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
