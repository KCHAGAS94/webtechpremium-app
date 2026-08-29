import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivationStatusModal } from './src/components/activation-status-modal';
import { BootLoadingScreen } from './src/components/boot-loading-screen';
import { ContentBrowserScreen, type NavKey } from './src/components/content-browser-screen';
import { DeviceActivationScreen } from './src/components/device-activation-screen';
import { MoviesScreen } from './src/components/movies-screen';
import { PlaylistManagerScreen } from './src/components/playlist-manager-screen';
import { SeriesScreen } from './src/components/series-screen';
import { SettingsScreen } from './src/components/settings-screen';
import { LanguageProvider, useTranslation } from './src/i18n/language-context';
import type { TranslationKey } from './src/i18n/translations';
import { getDeviceMac } from './src/utils/device-id';
import type { ContentCategory } from './src/utils/content-classifier';
import { type M3uChannel } from './src/utils/m3u-parser';
import { fetchDevicePlaylists, fetchDeviceStatus, type DeviceStatus, type PanelPlaylist } from './src/utils/panel-api';
import { loadFastCatalog, loadPlaylist, loadPlaylistFromDisk } from './src/utils/playlist-loader';
import { fetchAccountExpiration, parseXtreamCredentials, type SeriesMeta } from './src/utils/xtream-api';
import { getCachedPlaylistState, setCachedPlaylistState } from './src/utils/playlist-cache';
import { consumeLastCrashLog } from './src/utils/crash-logger';
import { popBackAction, useBackStackEntry } from './src/utils/back-stack';

// Maps a dashboard/menu screen key to the content bucket its browser screen
// should show (see content-classifier.ts). Same screen component for all
// three - only the category (and which nav item lights up) changes.
const CONTENT_SCREENS: Partial<Record<string, ContentCategory>> = {
  tv: 'live',
  movies: 'movies',
  series: 'series',
};

// Two fixed layouts, not a continuously-scaled one: Platform.isTV is a
// build-time-fixed flag (true only on actual Android TV/tvOS runtimes), so
// this picks one of exactly two dp presets — same idea as the "fixed dp
// instead of percentage" reasoning below, just extended to a second device
// class instead of interpolating between them.
const IS_TV = Platform.isTV;

// Fixed dp sizes for the Home menu icons — matches the old emoji fontSize
// values (64/40/28) that styles.tvIcon/midIcon/sideMenuIcon used, kept as
// plain numbers here since Ionicons takes `size` as a prop, not a style.
const ICON_SIZE_LARGE = IS_TV ? 64 : 40;
const ICON_SIZE_MEDIUM = IS_TV ? 40 : 26;
const ICON_SIZE_SMALL = IS_TV ? 28 : 20;

// Set right before BackHandler.exitApp() (see handleConfirmExit), checked on
// the next resume (see the AppState effect) — survives even a real process
// kill since it's on disk, not in memory.
const PENDING_FRESH_START_KEY = 'webtechpremium:pending-fresh-start';

interface MenuItem {
  id: string;
  label: TranslationKey;
  // Ionicons glyph name instead of an emoji character: emoji are rendered by
  // each device's own system emoji font, which varies wildly between TV
  // manufacturers (confirmed — the same emoji looked completely different on
  // a different physical TV). An icon font bundled with the app looks
  // identical everywhere.
  icon: keyof typeof Ionicons.glyphMap;
  screen?: string;
}

const menuItems: MenuItem[] = [
  { id: '1', label: 'nav_live', icon: 'tv-outline', screen: 'tv' },
  { id: '2', label: 'nav_movies', icon: 'film-outline', screen: 'movies' },
  { id: '3', label: 'nav_series', icon: 'albums-outline', screen: 'series' },
  { id: '4', label: 'nav_account', icon: 'person-outline', screen: 'account' },
  { id: '5', label: 'nav_change_playlist', icon: 'swap-horizontal-outline', screen: 'playlist' },
  { id: '6', label: 'nav_settings', icon: 'settings-outline', screen: 'settings' },
];

const sideMenuItems: MenuItem[] = [
  { id: '7', label: 'nav_reload', icon: 'refresh-outline', screen: 'reload' },
  { id: '8', label: 'nav_exit', icon: 'exit-outline', screen: 'exit' },
];

// playlistValidity is either 'Vitalício' (see its computation below) or the
// painel's raw `expiracaoData` string (YYYY-MM-DD, from a Date's
// toISOString().slice(0,10) — see dashboard's /api/devices) — reformatted
// here to the DD/MM/YYYY Brazilian users expect, same as the painel itself
// shows it.
function formatPlaylistValidity(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

// Highlights whichever card currently has TV-remote (D-pad) focus, so the
// Casa/home screen shows where the selection is, matching the focus rings
// added to the browser screens' headers/lists.
function FocusableCard({
  style,
  focusedStyle,
  onPress,
  children,
  autoFocus,
}: {
  style: object;
  focusedStyle: object;
  onPress: () => void;
  children: React.ReactNode;
  // Grabs D-pad focus as soon as this card mounts, so arriving at Home
  // (first launch, or backing out of a section) always shows a highlighted
  // starting point instead of no focus anywhere until the user presses a
  // direction key. `hasTVPreferredFocus` is RN's built-in TV-focus hook
  // (Android TV / tvOS); the `focused` default just keeps the highlight
  // style in sync with it on the very first render, before any onFocus
  // event has fired.
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(!!autoFocus);
  return (
    <Pressable
      style={[style, focused && focusedStyle]}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      hasTVPreferredFocus={autoFocus}
    >
      {children}
    </Pressable>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { t } = useTranslation();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [channels, setChannels] = useState<M3uChannel[]>([]);
  const [seriesMetaByShowName, setSeriesMetaByShowName] = useState<Map<string, SeriesMeta>>(new Map());
  const [playlists, setPlaylists] = useState<PanelPlaylist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  const [reloadingPlaylist, setReloadingPlaylist] = useState(false);
  const [reloadPlaylistError, setReloadPlaylistError] = useState('');
  const [reloadingChannels, setReloadingChannels] = useState(false);
  const [reloadChannelsError, setReloadChannelsError] = useState('');
  const [reloadBlockedMessage, setReloadBlockedMessage] = useState('');
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [deviceMac, setDeviceMac] = useState('');
  // True only for the initial boot check (cache lookup, or first-run painel
  // fetch) — shows BootLoadingScreen so that gap doesn't render an empty
  // Home/activation screen that looks broken rather than loading.
  const [booting, setBooting] = useState(true);
  // Full-screen progress shown while activatePlaylist downloads+parses a
  // freshly activated playlist's M3U (Séries) — without this, currentScreen
  // flipped to 'home' as soon as the fast Xtream catalog landed while that
  // download/parse kept running invisibly in the background, so early taps
  // went unanswered and looked like the app had frozen/crashed rather than
  // still loading.
  const [activationProgress, setActivationProgress] = useState<number | null>(null);
  // Freshly checked at every boot (see bootstrap) against the painel's
  // /app/device-status, independent of whatever stale cached playlist
  // metadata says — a device can sit on a cold, never-reopened app for
  // weeks after its plan lapses, so this can't be inferred from the disk
  // cache alone. While true, content screens are blocked (handleMenuPress)
  // and the user is kept on "Minhas listas" until they pick a valid one.
  const [expired, setExpired] = useState(false);
  // The MAC's actual ativação/plan (tipo + dataExpiracao), as opposed to
  // whichever playlist happens to be active — backs the "Conta" modal so it
  // reflects the reseller's "Ativação App" record instead of one playlist's
  // own expiracaoData. Set alongside `expired` in bootstrap (see
  // fetchDeviceStatus there).
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  // Backs the "Verificar status do app" button on ActivationStatusModal —
  // separate from `booting` since this re-check happens after boot, on
  // whatever screen is already mounted, without re-running the rest of
  // bootstrap (cached channels etc. stay untouched).
  const [checkingStatus, setCheckingStatus] = useState(false);
  // Shown on ActivationStatusModal right after a check finishes and the MAC
  // is still not active — tells the user to go activate it in the painel
  // instead of the button appearing to do nothing.
  const [notActiveMessage, setNotActiveMessage] = useState<string | null>(null);
  const tvItem = menuItems[0];
  const centerTop = menuItems[1];
  const rightTop = menuItems[2];
  const centerBottom = menuItems[3];
  const rightBottom = menuItems[4];
  const settingsItem = menuItems[5];
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId);
  // "Vitalício" has no expiration date at all (dataExpiracao is null in the
  // painel for that tipo) — showing "Não informada" for those was misleading,
  // so tipo takes priority over the raw date when it says VITALICIO.
  const playlistValidity =
    activePlaylist?.tipo === 'VITALICIO' ? 'Vitalício' : activePlaylist?.expiracaoData;
  // Same idea as playlist-manager-screen.tsx's Minhas listas: the painel's
  // own dataExpiracao/tipo are filled in manually at ativação time and can
  // drift from the truth, so the provider's own Xtream account (exp_date) is
  // tried first and playlistValidity above is only the fallback for
  // non-Xtream lists or while this fetch is pending/fails.
  const [xtreamExpiration, setXtreamExpiration] = useState<Date | null | undefined>(undefined);
  useEffect(() => {
    setXtreamExpiration(undefined);
    if (!activePlaylist) return;
    const credentials = parseXtreamCredentials(activePlaylist.url);
    if (!credentials) {
      setXtreamExpiration(null);
      return;
    }
    let cancelled = false;
    fetchAccountExpiration(credentials)
      .then((date) => {
        if (!cancelled) setXtreamExpiration(date);
      })
      .catch(() => {
        if (!cancelled) setXtreamExpiration(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activePlaylist]);
  const displayedValidity = xtreamExpiration
    ? xtreamExpiration.toLocaleDateString('pt-BR')
    : playlistValidity
      ? formatPlaylistValidity(playlistValidity)
      : null;
  // The "Conta" modal shows the MAC's own ativação record from the painel
  // (deviceStatus, from "Ativação App" — tipo + dataExpiracao) rather than
  // whichever playlist happens to be active: a device can have a Vitalício
  // ativação plus a separately-dated playlist credential, and "Conta" means
  // the former, not the latter. No fallback to the playlist's own date when
  // there's no ativação record — that showed a stale/unrelated date for a
  // MAC the painel itself reports as "Não ativado".
  const accountValidity =
    deviceStatus?.tipo === 'VITALICIO'
      ? 'Vitalício'
      : deviceStatus?.dataExpiracao
        ? formatPlaylistValidity(deviceStatus.dataExpiracao)
        : null;
  // Drives ActivationStatusModal: true only once the painel has explicitly
  // confirmed this MAC as active (expirado: false). `null` (never linked to
  // an "Ativação App" record) and a failed/not-yet-run fetch both count as
  // "not active" here, same as `true` — additive to the existing `expired`
  // gate above, not a replacement for it.
  const isAppActive = deviceStatus?.expirado === false;
  // Same source of truth as the painel's own "Expirado" column ("Ativação
  // App"/"Instalados"), from the device's own ativação record (deviceStatus)
  // — never a playlist's own `expirado`. A playlist can be perfectly valid
  // while the device's actual ativação (tipo) doesn't exist or lapsed, and
  // showing the playlist's status there made "Conta" say "Ativo" for a MAC
  // the painel itself shows as "Não ativado".
  const accountStatus =
    deviceStatus?.expirado != null ? (deviceStatus.expirado ? 'Expirado' : 'Ativo') : 'Não ativado';

  useEffect(() => {
    if (!reloadBlockedMessage) return;
    const timer = setTimeout(() => setReloadBlockedMessage(''), 2000);
    return () => clearTimeout(timer);
  }, [reloadBlockedMessage]);

  // Every screen/modal that's currently open registers itself on the shared
  // back-stack (see back-stack.ts) while it's visible, so the single remote
  // "voltar" handler below always unwinds the exact same path the user
  // navigated in, one step at a time, instead of jumping straight to Casa.
  useBackStackEntry(
    currentScreen === 'tv' || currentScreen === 'movies' || currentScreen === 'series' || currentScreen === 'playlist' || currentScreen === 'settings',
    () => setCurrentScreen('home')
  );
  useBackStackEntry(accountModalVisible, () => setAccountModalVisible(false));
  useBackStackEntry(exitModalVisible, () => setExitModalVisible(false));

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (popBackAction()) return true;
      if (currentScreen === 'home') {
        setExitModalVisible(true);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [currentScreen]);

  const activatePlaylist = async (playlist: PanelPlaylist, mac: string = deviceMac, panelPlaylists: PanelPlaylist[] = playlists) => {
    // Drops the previous playlist's full channel array before fetching the
    // new one, instead of after, so the old list is eligible for GC while
    // loadPlaylist's raw M3U text + parsed arrays + Xtream JSON responses are
    // being held — otherwise both the outgoing and incoming full catalogs
    // are alive in memory at once, which is enough to OOM-kill the app on
    // low-RAM Android TV boxes when switching between large playlists.
    setChannels([]);
    setActivePlaylistId(playlist.id);
    // /devices (which is where `playlist` here always comes from — the
    // painel's own playlist picker, or the "Recarregar" reload) never
    // returns an expired lista, so activating one always clears the
    // expired gate from bootstrap's fresh check.
    setExpired(false);

    // Keeps the user on a full-screen progress bar (instead of an
    // apparently-ready-but-unresponsive Home) until the full M3U
    // download+parse below finishes — see the activationProgress comment.
    setActivationProgress(0);

    // loadFastCatalog (TV ao Vivo/Filmes straight from the Xtream API, a
    // couple of small JSON calls) and loadPlaylist (the M3U download+parse,
    // still needed for Séries and for persisting the file boot reads back)
    // run concurrently, but Home isn't shown until both are done — see
    // activationProgress.
    const fullPromise = loadPlaylist(playlist.url, mac, (progress) => {
      if (progress.totalLines > 0) {
        setActivationProgress(progress.processedLines / progress.totalLines);
      }
    });
    const fast = await loadFastCatalog(playlist.url).catch(() => null);
    if (fast) {
      setChannels([...fast.tv, ...fast.filmes]);
    }

    // fullPromise (the M3U download+parse) can fail on its own even when
    // loadFastCatalog above succeeded — e.g. a provider whose Xtream JSON API
    // works but whose get.php M3U export is disabled/404s. Left uncaught,
    // that rejection used to leave the user stuck on the "Carregando sua
    // lista..." progress screen forever (activationProgress never reached
    // null). Only Séries actually depends on this call; TV ao Vivo/Filmes
    // already came from loadFastCatalog, so a failure here is recoverable as
    // long as fast catalog gave us something to show.
    try {
      const { tv, filmes, series, seriesMetaByShowName: freshSeriesMeta } = await fullPromise;
      // `fast?.tv ?? tv` looked right but isn't: when loadFastCatalog's
      // Xtream call failed, `fast` still resolves with `tv`/`filmes` as `[]`
      // (see loadFastCatalog) — an empty array is never nullish, so `??`
      // never falls through to the M3U-parsed list here, silently leaving
      // TV ao Vivo/Filmes empty even though the full parse just found them.
      setChannels([
        ...(fast?.tv.length ? fast.tv : tv),
        ...(fast?.filmes.length ? fast.filmes : filmes),
        ...series,
      ]);
      if (freshSeriesMeta) {
        setSeriesMetaByShowName(freshSeriesMeta);
      }
    } catch (err) {
      if (!fast || (fast.tv.length === 0 && fast.filmes.length === 0)) {
        setActivationProgress(null);
        setPlaylists(panelPlaylists);
        setReloadPlaylistError(
          err instanceof Error ? `Falha ao carregar a playlist: ${err.message}` : 'Falha ao carregar a playlist.'
        );
        setCurrentScreen('playlist');
        return;
      }
    }

    setCurrentScreen('home');
    setActivationProgress(null);
    if (mac) {
      setCachedPlaylistState(mac, { panelPlaylists, activePlaylistId: playlist.id });
    }
  };

  // Shared by the initial mount and by the "Saída" fake-power-cycle (see
  // handleConfirmExit/the AppState effect below) — both cases should behave
  // exactly like a cold start: same boot screen, same fresh fetch, no stale
  // in-memory state from before.
  const bootstrap = useCallback(async () => {
    setBooting(true);

    // If the previous run ended in an uncaught JS exception, report it now —
    // see crash-logger.ts. Doesn't catch a native OOM kill (that terminates
    // the process below the JS layer), but rules JS exceptions in or out
    // when diagnosing "the app just closed" reports.
    consumeLastCrashLog().then((crash) => {
      if (crash) console.warn('[crash] app did not exit cleanly last run:', crash);
    });

    const mac = await getDeviceMac();
    setDeviceMac(mac);

    // The app never contacts the painel on its own anymore — linking a
    // MAC to a lista now happens on the painel side (reseller does it),
    // and the app only asks "what's assigned to this MAC?" when the user
    // explicitly presses "Recarregar Lista" on the activation screen (see
    // handleReloadPlaylist below). Boot restores whatever the last
    // successful manual fetch left behind: which playlist was active
    // (cached metadata, see playlist-cache.ts), TV ao Vivo/Filmes from the
    // Xtream API (fast, no size cap), and Séries read back from the
    // per-device M3U file on disk (see loadPlaylistFromDisk) — no size cap
    // there either, unlike the old AsyncStorage-JSON cache this replaced.
    const cached = await getCachedPlaylistState(mac);
    const activePlaylist = cached?.panelPlaylists.find((p) => p.id === cached.activePlaylistId);
    const disk = activePlaylist ? await loadPlaylistFromDisk(activePlaylist.url, mac) : null;

    // Fresh check against the painel, independent of the cached playlist
    // metadata above — that cache is only ever refreshed when the user
    // manually reloads, so it can't be trusted to reflect a plan that
    // expired while the app sat untouched. `expirado` is null for a MAC
    // that was never activated at all, which is not the "expired" case.
    const status = await fetchDeviceStatus(mac).catch(() => null);
    const isExpired = status?.expirado === true;
    setExpired(isExpired);
    setDeviceStatus(status);

    // Independent check: does the painel actually have an M3U lista linked
    // to this MAC right now? A device can have disk/cache left over from a
    // lista that was since unlinked or never had a URL to begin with (a
    // reseller can register the MAC in "Usuários" without pasting a link),
    // and device-status alone doesn't catch that — it only looks at whether
    // a Lista row exists and isn't expired, not whether it has a usable url.
    // `null` here means the painel couldn't be reached at all, which must
    // NOT be treated as "no lista" — that keeps the offline-cache fallback
    // below working.
    const panelPlaylists = await fetchDevicePlaylists(mac).catch(() => null);
    const noListaLinked = panelPlaylists !== null && panelPlaylists.length === 0;

    // Detects a reseller having reassigned/edited this MAC's lista since our
    // last successful load. Editing a lista in the painel (as opposed to
    // linking a different one) keeps the same id but changes its url, so
    // comparing ids alone isn't enough — a stale cached/disk playlist would
    // otherwise be reused forever even after the painel's url changes.
    const serverActivePlaylist = panelPlaylists?.find((p) => p.id === cached?.activePlaylistId) ?? null;
    const playlistChanged =
      panelPlaylists !== null && !!cached && (!serverActivePlaylist || serverActivePlaylist.url !== activePlaylist?.url);

    if (cached && disk && !isExpired && !noListaLinked && !playlistChanged) {
      setPlaylists(cached.panelPlaylists);
      setActivePlaylistId(cached.activePlaylistId);
      setChannels([...disk.tv, ...disk.filmes, ...disk.series]);
      setCurrentScreen('home');
    } else if (playlistChanged && serverActivePlaylist && !isExpired) {
      // Server truth for this MAC changed — re-fetch it now (showing the
      // "Carregando sua lista..." progress screen, same as a manual
      // "Recarregar Lista") instead of silently falling back to the stale
      // cached/disk copy.
      setPlaylists(panelPlaylists ?? []);
      setBooting(false);
      await activatePlaylist(serverActivePlaylist, mac, panelPlaylists ?? []);
      return;
    } else {
      // Expired: still restore whatever cached playlists/channels we have
      // (so the "Minhas listas" screen can show what was active and its
      // expiration date), but land on the list-switching screen instead of
      // Home — handleMenuPress keeps the user there until they pick a
      // playlist the painel confirms isn't expired. Skipped when
      // noListaLinked — showing a card for a lista the painel no longer has
      // on file would be misleading, so playlists is left empty and
      // DeviceActivationScreen ("Recarregar Lista") shows instead of
      // PlaylistManagerScreen (see currentScreen === 'playlist' below).
      if (isExpired && cached && !noListaLinked) {
        setPlaylists(cached.panelPlaylists);
        setActivePlaylistId(cached.activePlaylistId);
      }
      setCurrentScreen('playlist');
    }
    setBooting(false);
  }, []);

  useEffect(() => {
    bootstrap();
    // Deliberately runs once on mount — bootstrap is stable (empty deps) and
    // re-running it here would fight the AppState-triggered call below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Saída" can't force Android to actually kill the process (that's the
  // OS's call, not something Expo/RN exposes control over — see the
  // conversation that led to this) — some devices keep it cached in the
  // background instead, so reopening the app can resume with stale
  // in-memory state and a dead server connection instead of truly starting
  // over. This simulates the "TV was turned off and on again" the user
  // wants regardless of what the OS actually did with the process: a flag
  // set right before exiting, checked here the next time the app becomes
  // active, forces the exact same fresh boot sequence a real cold start
  // would run — no stale channels, no stale connection.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      AsyncStorage.getItem(PENDING_FRESH_START_KEY).then((value) => {
        if (!value) return;
        AsyncStorage.removeItem(PENDING_FRESH_START_KEY);
        bootstrap();
      });
    });
    return () => subscription.remove();
  }, [bootstrap]);

  if (booting) {
    return <BootLoadingScreen />;
  }

  if (activationProgress !== null) {
    return <BootLoadingScreen text="Carregando sua lista..." progress={activationProgress} />;
  }

  // "Verificar status do app" on ActivationStatusModal — re-polls the painel
  // for this MAC's ativação record so the modal can close as soon as a
  // reseller links/activates it, without requiring a full app restart.
  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setNotActiveMessage(null);
    try {
      // fetchDevicePlaylists hits /api/devices, which registers this MAC in
      // the painel if it isn't there yet (see registerDevice server-side).
      // device-status alone never does that — it only reads. Without this,
      // a MAC that failed to register on first boot (painel unreachable at
      // that moment) could never appear in "Instalados" no matter how many
      // times the user pressed this button.
      await fetchDevicePlaylists(deviceMac).catch(() => null);
      const status = await fetchDeviceStatus(deviceMac);
      setDeviceStatus(status);
      if (status?.expirado !== false) {
        setNotActiveMessage('MAC ainda não está ativo. Ative-o no painel e tente novamente.');
      }
    } catch {
      // Painel unreachable — leave deviceStatus as-is, modal stays open.
      setNotActiveMessage('Não foi possível consultar o painel. Tente novamente.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleReloadPlaylist = async () => {
    setReloadingPlaylist(true);
    setReloadPlaylistError('');
    try {
      const panelPlaylists = await fetchDevicePlaylists(deviceMac);
      setPlaylists(panelPlaylists);

      if (panelPlaylists.length === 0) {
        setActivePlaylistId(null);
        setChannels([]);
        setReloadPlaylistError('Nenhuma lista vinculada a este MAC ainda no painel.');
        return;
      }

      await activatePlaylist(panelPlaylists[0], deviceMac, panelPlaylists);
    } catch (err) {
      setReloadPlaylistError(
        err instanceof Error ? `Falha ao consultar o painel: ${err.message}` : 'Falha ao consultar o painel.'
      );
    } finally {
      setReloadingPlaylist(false);
    }
  };

  // "Recarregar" on the home menu: goes back to the painel to fetch whatever
  // M3U link is *currently* linked to this device's MAC (the reseller may
  // have changed servers, as in the painel screenshot showing the same MAC
  // re-pointed to a different SERVIDOR), then re-activates with that fresh
  // link — not just re-downloading the same stale URL that was cached at
  // boot. Favorites and watch history live in AsyncStorage keyed by
  // title/show id (see favorites-storage.ts, watch-history-storage.ts), not
  // by channel list index, so they're untouched by this.
  const handleReloadChannels = async () => {
    if (!deviceMac) {
      setCurrentScreen('playlist');
      return;
    }
    setReloadingChannels(true);
    setReloadChannelsError('');
    try {
      const panelPlaylists = await fetchDevicePlaylists(deviceMac);
      if (panelPlaylists.length === 0) {
        // No lista linked anymore (unlinked, or never had a url) — same
        // "não tem lista" case bootstrap checks for. Drop whatever's
        // playing and send the user to DeviceActivationScreen instead of
        // leaving stale, no-longer-backed channels playable on Home.
        setPlaylists([]);
        setActivePlaylistId(null);
        setChannels([]);
        setCurrentScreen('playlist');
        return;
      }
      setPlaylists(panelPlaylists);
      const fresh = panelPlaylists.find((p) => p.id === activePlaylistId) ?? panelPlaylists[0];
      await activatePlaylist(fresh, deviceMac, panelPlaylists);
    } catch (err) {
      // Previously failed silently, so a network hiccup looked exactly like
      // the button doing nothing. Now it's visible (banner below) instead
      // of just keeping the stale channels with no explanation.
      setReloadChannelsError(
        err instanceof Error ? `Falha ao recarregar: ${err.message}` : 'Falha ao recarregar a lista.'
      );
    } finally {
      setReloadingChannels(false);
    }
  };

  const handleMenuPress = (screen?: string) => {
    if (reloadingChannels) {
      setReloadBlockedMessage('Aguarde o fim do carregamento...');
      return;
    }
    // Blocks watching on an expired plan: any attempt to reach a content
    // screen gets redirected to "Minhas listas" instead, same place
    // bootstrap already lands the user on expired boot. "Sair"/"Recarregar"
    // stay allowed — recarregar is how the user picks up a renewal without
    // restarting the app.
    if (expired && screen && screen in CONTENT_SCREENS) {
      setReloadBlockedMessage('Sua lista expirou. Escolha uma lista válida para continuar assistindo.');
      setCurrentScreen('playlist');
      return;
    }
    if (screen === 'exit') {
      setExitModalVisible(true);
    } else if (screen === 'account') {
      setAccountModalVisible(true);
    } else if (screen === 'reload') {
      handleReloadChannels();
    } else if (screen && screen in CONTENT_SCREENS && channels.length === 0) {
      setCurrentScreen('playlist');
    } else {
      setCurrentScreen(screen || 'home');
    }
  };

  const handleConfirmExit = () => {
    setExitModalVisible(false);
    AsyncStorage.setItem(PENDING_FRESH_START_KEY, '1').finally(() => {
      BackHandler.exitApp();
    });
  };

  // Overlaid on top of whichever screen renders below (Modal is a native
  // portal, so it doesn't matter which branch returns) whenever the painel
  // hasn't confirmed this MAC as active — see isAppActive above. Additive to
  // every existing screen/return below; none of them had to change.
  const activationModal = (
    <ActivationStatusModal
      visible={!isAppActive}
      macAddress={deviceMac}
      // Only shows the real date/tipo once the painel actually confirms the
      // MAC as active — otherwise accountValidity can still hold a stale
      // record (e.g. an already-expired ativação) that would misleadingly
      // read as "Vitalício"/a date while this modal is telling the user the
      // device isn't active.
      expirationLabel={isAppActive ? accountValidity : null}
      checking={checkingStatus}
      onCheckStatus={handleCheckStatus}
      notActiveMessage={notActiveMessage}
    />
  );

  if (currentScreen === 'playlist') {
    if (playlists.length === 0) {
      return (
        <>
          <DeviceActivationScreen
            macAddress={deviceMac}
            onReload={handleReloadPlaylist}
            error={reloadPlaylistError}
            reloading={reloadingPlaylist}
          />
          {activationModal}
        </>
      );
    }

    return (
      <>
        <PlaylistManagerScreen
          playlists={playlists}
          activePlaylistId={activePlaylistId}
          macAddress={deviceMac}
          onSelect={activatePlaylist}
          // No way back to Home while expired — otherwise the user could
          // close straight back to the menu and tap "TV ao vivo" etc., which
          // handleMenuPress would just bounce them right back here anyway,
          // but with no explanation of why.
          onClose={expired ? undefined : () => setCurrentScreen('home')}
          expired={expired}
        />
        {activationModal}
      </>
    );
  }

  if (currentScreen === 'movies') {
    return (
      <>
        <MoviesScreen
          channels={channels}
          playlistUrl={playlists.find((p) => p.id === activePlaylistId)?.url ?? ''}
          activeNav="movies"
          onNavigate={(key) => setCurrentScreen(key === 'live' ? 'tv' : key)}
        />
        {activationModal}
      </>
    );
  }

  if (currentScreen === 'series') {
    return (
      <>
        <SeriesScreen
          channels={channels}
          metaByShowName={seriesMetaByShowName}
          playlistUrl={playlists.find((p) => p.id === activePlaylistId)?.url ?? ''}
          activeNav="series"
          onNavigate={(key) => setCurrentScreen(key === 'live' ? 'tv' : key)}
        />
        {activationModal}
      </>
    );
  }

  if (currentScreen === 'settings') {
    return (
      <>
        <SettingsScreen
          onBack={() => setCurrentScreen('home')}
          channels={channels}
          seriesMetaByShowName={seriesMetaByShowName}
        />
        {activationModal}
      </>
    );
  }

  const contentCategory = CONTENT_SCREENS[currentScreen];
  if (contentCategory) {
    return (
      <>
        <ContentBrowserScreen
          channels={channels}
          category={contentCategory}
          activeNav={currentScreen === 'tv' ? 'live' : (currentScreen as NavKey)}
          onNavigate={(key) => setCurrentScreen(key === 'live' ? 'tv' : key)}
        />
        {activationModal}
      </>
    );
  }

  return (
    <>
    <LinearGradient
      colors={['#050042', '#0d0569', '#050042']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContent}>
          <View style={styles.contentArea}>
            <View style={[styles.layoutRow, !IS_TV && mobileStyles.layoutRow]}>
              <FocusableCard
                key={tvItem.id}
                style={[styles.tvCard, !IS_TV && mobileStyles.tvCard]}
                focusedStyle={styles.tvCardFocused}
                onPress={() => handleMenuPress(tvItem.screen)}
                autoFocus
              >
                <Ionicons name={tvItem.icon} size={ICON_SIZE_LARGE} color="#ffffff" style={styles.tvIcon} />
                <Text allowFontScaling={false} style={[styles.tvLabel, !IS_TV && mobileStyles.tvLabel]}>{t(tvItem.label)}</Text>
              </FocusableCard>

              <View style={styles.midColumn}>
                <FocusableCard
                  key={centerTop.id}
                  style={[styles.midCard, !IS_TV && mobileStyles.midCard]}
                  focusedStyle={styles.midCardFocused}
                  onPress={() => handleMenuPress(centerTop.screen)}
                >
                  <Ionicons name={centerTop.icon} size={ICON_SIZE_MEDIUM} color="#ffffff" style={styles.midIcon} />
                  <Text allowFontScaling={false} style={[styles.midLabel, !IS_TV && mobileStyles.midLabel]}>{t(centerTop.label)}</Text>
                </FocusableCard>

                <FocusableCard
                  key={centerBottom.id}
                  style={[styles.midCard, !IS_TV && mobileStyles.midCard]}
                  focusedStyle={styles.midCardFocused}
                  onPress={() => handleMenuPress(centerBottom.screen)}
                >
                  <Ionicons name={centerBottom.icon} size={ICON_SIZE_MEDIUM} color="#ffffff" style={styles.midIcon} />
                  <Text allowFontScaling={false} style={[styles.midLabel, !IS_TV && mobileStyles.midLabel]}>{t(centerBottom.label)}</Text>
                </FocusableCard>
              </View>

              <View style={styles.midColumn}>
                <FocusableCard
                  key={rightTop.id}
                  style={[styles.midCard, !IS_TV && mobileStyles.midCard]}
                  focusedStyle={styles.midCardFocused}
                  onPress={() => handleMenuPress(rightTop.screen)}
                >
                  <Ionicons name={rightTop.icon} size={ICON_SIZE_MEDIUM} color="#ffffff" style={styles.midIcon} />
                  <Text allowFontScaling={false} style={[styles.midLabel, !IS_TV && mobileStyles.midLabel]}>{t(rightTop.label)}</Text>
                </FocusableCard>

                <FocusableCard
                  key={rightBottom.id}
                  style={[styles.midCard, !IS_TV && mobileStyles.midCard]}
                  focusedStyle={styles.midCardFocused}
                  onPress={() => handleMenuPress(rightBottom.screen)}
                >
                  <Ionicons name={rightBottom.icon} size={ICON_SIZE_MEDIUM} color="#ffffff" style={styles.midIcon} />
                  <Text allowFontScaling={false} style={[styles.midLabel, !IS_TV && mobileStyles.midLabel]}>{t(rightBottom.label)}</Text>
                </FocusableCard>
              </View>

              <View style={[styles.sideMenu, !IS_TV && mobileStyles.sideMenu]}>
                <FocusableCard
                  key={settingsItem.id}
                  style={[styles.sideMenuItem, !IS_TV && mobileStyles.sideMenuItem]}
                  focusedStyle={styles.sideMenuItemFocused}
                  onPress={() => handleMenuPress(settingsItem.screen)}
                >
                  <Ionicons name={settingsItem.icon} size={ICON_SIZE_SMALL} color="#ffffff" style={styles.sideMenuIcon} />
                  <Text allowFontScaling={false} style={[styles.sideMenuLabel, !IS_TV && mobileStyles.sideMenuLabel]}>{t(settingsItem.label)}</Text>
                </FocusableCard>

                {sideMenuItems.map((item) => {
                  const isReloadItem = item.screen === 'reload';
                  return (
                    <FocusableCard
                      key={item.id}
                      style={[styles.sideMenuItem, !IS_TV && mobileStyles.sideMenuItem]}
                      focusedStyle={styles.sideMenuItemFocused}
                      onPress={() => handleMenuPress(item.screen)}
                    >
                      {isReloadItem && reloadingChannels ? (
                        <ActivityIndicator color="#4dd6ff" style={styles.sideMenuSpinner} />
                      ) : (
                        <Ionicons name={item.icon} size={ICON_SIZE_SMALL} color="#ffffff" style={styles.sideMenuIcon} />
                      )}
                      <Text allowFontScaling={false} style={[styles.sideMenuLabel, !IS_TV && mobileStyles.sideMenuLabel]}>
                        {isReloadItem && reloadingChannels ? t('nav_reloading') : t(item.label)}
                      </Text>
                    </FocusableCard>
                  );
                })}
              </View>
            </View>
          </View>

          {!!displayedValidity && (
            <Text allowFontScaling={false} style={styles.playlistExpirationLabel}>
              Data expira lista: <Text allowFontScaling={false} style={styles.playlistExpirationValue}>{displayedValidity}</Text>
            </Text>
          )}

          {!!(reloadBlockedMessage || reloadChannelsError) && (
            <View style={styles.reloadErrorBanner}>
              <Text allowFontScaling={false} style={styles.reloadErrorText}>
                {reloadBlockedMessage || reloadChannelsError}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      <Modal
        visible={exitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExitModalVisible(false)}
      >
        <View style={styles.exitModalOverlay}>
          <View style={styles.exitModalBox}>
            <Text allowFontScaling={false} style={styles.exitModalTitle}>
              Deseja sair do app?
            </Text>
            <View style={styles.exitModalActions}>
              <FocusableCard
                key={exitModalVisible ? 'exit-no-open' : 'exit-no-closed'}
                style={[styles.exitModalButton, styles.exitModalButtonNo]}
                focusedStyle={styles.exitModalButtonNoFocused}
                onPress={() => setExitModalVisible(false)}
                autoFocus={exitModalVisible}
              >
                <Text allowFontScaling={false} style={styles.exitModalButtonText}>Não</Text>
              </FocusableCard>
              <FocusableCard
                style={[styles.exitModalButton, styles.exitModalButtonYes]}
                focusedStyle={styles.exitModalButtonYesFocused}
                onPress={handleConfirmExit}
              >
                <Text allowFontScaling={false} style={styles.exitModalButtonText}>Sim</Text>
              </FocusableCard>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={accountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={styles.exitModalOverlay}>
          <View style={styles.accountModalBox}>
            <Text allowFontScaling={false} style={styles.accountModalTitle}>Conta</Text>

            <View style={styles.accountRow}>
              <Text allowFontScaling={false} style={styles.accountRowLabel}>Endereço Mac</Text>
              <Text allowFontScaling={false} style={styles.accountRowValue}>{deviceMac}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text allowFontScaling={false} style={styles.accountRowLabel}>Estado da conta</Text>
              <Text allowFontScaling={false} style={styles.accountRowValue}>{accountStatus ?? 'Não informado'}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text allowFontScaling={false} style={styles.accountRowLabel}>Data de validade</Text>
              <Text allowFontScaling={false} style={styles.accountRowValue}>
                {accountValidity || 'Não informada'}
              </Text>
            </View>
            <Text allowFontScaling={false} style={styles.accountRenewHint}>
              Renove sua assinatura em{'\n'}
              <Text style={styles.accountRenewLink}>https://painel.webtechpremium.kchagas.com.br/</Text>
            </Text>

            <FocusableCard
              key={accountModalVisible ? 'account-close-open' : 'account-close-closed'}
              style={styles.accountModalClose}
              focusedStyle={styles.accountModalCloseFocused}
              onPress={() => setAccountModalVisible(false)}
              autoFocus={accountModalVisible}
            >
              <Text allowFontScaling={false} style={styles.exitModalButtonText}>Fechar</Text>
            </FocusableCard>
          </View>
        </View>
      </Modal>
    </LinearGradient>
    {activationModal}
    </>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 0,
  },
  layoutRow: {
    flex: 1,
    flexDirection: 'row',
    // Fixed dp width instead of '90%': a percentage resolves to a different
    // absolute size on every screen (this is what changed the whole menu's
    // proportions/size on a different physical TV — same dp values elsewhere
    // in this file, like tvCard's width:220, didn't move at all). A fixed dp
    // value renders the same everywhere, the same way dp is supposed to.
    width: 900,
    gap: 8,
    minHeight: 0,
    maxHeight: 286,
  },
  tvCard: {
    width: 220,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tvCardFocused: {
    borderColor: '#4dd6ff',
    borderWidth: 3,
    backgroundColor: '#1f0d8a',
  },
  tvIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  tvLabel: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  midColumn: {
    flex: 1.15,
    gap: 8,
    minHeight: 0,
  },
  midCard: {
    flex: 1,
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  midCardFocused: {
    borderColor: '#4dd6ff',
    borderWidth: 3,
    backgroundColor: '#1f0d8a',
  },
  midIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  midLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  sideMenu: {
    width: 190,
    gap: 8,
  },
  sideMenuItem: {
    flex: 1,
    backgroundColor: '#12004f',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  sideMenuItemFocused: {
    borderColor: '#4dd6ff',
    borderWidth: 3,
    backgroundColor: '#1f0d8a',
  },
  sideMenuIcon: {
    fontSize: 28,
    color: '#ffffff',
    lineHeight: 32,
  },
  sideMenuSpinner: {
    width: 28,
  },
  sideMenuLabel: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
  },
  playlistExpirationLabel: {
    textAlign: 'center',
    color: '#8888aa',
    fontSize: 18,
    marginBottom: 12,
  },
  playlistExpirationValue: {
    fontWeight: 'bold',
  },
  reloadErrorBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(120, 0, 0, 0.85)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reloadErrorText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
  },
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitModalBox: {
    backgroundColor: '#12004f',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
    width: 280,
    alignItems: 'center',
  },
  exitModalTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  exitModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  exitModalButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  exitModalButtonNo: {
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
  },
  exitModalButtonNoFocused: {
    borderColor: '#4dd6ff',
    borderWidth: 3,
    backgroundColor: '#1f0d8a',
  },
  exitModalButtonYes: {
    backgroundColor: '#7a0000',
    borderColor: '#ff4d4d',
  },
  exitModalButtonYesFocused: {
    borderColor: '#ff8a8a',
    borderWidth: 3,
    backgroundColor: '#a30000',
  },
  exitModalButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  accountModalBox: {
    backgroundColor: '#12004f',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: 320,
  },
  accountModalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(77, 214, 255, 0.25)',
    paddingVertical: 10,
    gap: 12,
  },
  accountRowLabel: {
    color: '#c7c7e6',
    fontSize: 12,
  },
  accountRowValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  accountRenewHint: {
    color: '#8888aa',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 14,
  },
  accountRenewLink: {
    color: '#4dd6ff',
    fontWeight: '600',
  },
  accountModalClose: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: '#170066',
    borderColor: '#1aa2ff',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  accountModalCloseFocused: {
    borderColor: '#4dd6ff',
    borderWidth: 3,
    backgroundColor: '#1f0d8a',
  },
});

// Fixed dp overrides applied on top of `styles` whenever IS_TV is false —
// a second fixed preset, not a computed scale off window width, for the
// same reason `styles.layoutRow.width: 900` is a fixed dp value rather than
// a percentage (see that comment above): phone screens vary too, and we
// want the same result on all of them, not a different one per device.
const mobileStyles = StyleSheet.create({
  layoutRow: {
    width: 630,
    maxHeight: 200,
  },
  tvCard: {
    width: 170,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tvLabel: {
    fontSize: 13,
    lineHeight: 16,
  },
  midCard: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  midLabel: {
    fontSize: 11,
    lineHeight: 13,
  },
  sideMenu: {
    width: 130,
  },
  sideMenuItem: {
    paddingHorizontal: 6,
    gap: 8,
  },
  sideMenuLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
});
