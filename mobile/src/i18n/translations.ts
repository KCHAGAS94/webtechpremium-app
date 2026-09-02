import type { LanguageCode } from '@/utils/language-storage';

// Central dictionary — add a key here once, use it everywhere via
// useTranslation()'s `t(key)`. Keeping all five languages side by side in one
// object (instead of five separate files) makes it obvious when a new key is
// added to pt but forgotten in the others.
const dictionaries = {
  nav_home: { pt: 'Casa', en: 'Home', es: 'Inicio', ja: 'ホーム', zh: '主页' },
  nav_live: { pt: 'TV ao Vivo', en: 'Live TV', es: 'TV en Vivo', ja: 'ライブTV', zh: '直播电视' },
  nav_movies: { pt: 'Filmes', en: 'Movies', es: 'Películas', ja: '映画', zh: '电影' },
  nav_series: { pt: 'Séries', en: 'Series', es: 'Series', ja: 'ドラマ', zh: '剧集' },
  nav_account: { pt: 'Conta', en: 'Account', es: 'Cuenta', ja: 'アカウント', zh: '账户' },
  nav_change_playlist: {
    pt: 'mudar lista de\nreprodução',
    en: 'change\nplaylist',
    es: 'cambiar lista\nde reproducción',
    ja: 'プレイリストを\n変更',
    zh: '更换\n播放列表',
  },
  nav_settings: { pt: 'Configurações', en: 'Settings', es: 'Configuración', ja: '設定', zh: '设置' },
  nav_reload: { pt: 'recarregar', en: 'reload', es: 'recargar', ja: '再読み込み', zh: '重新加载' },
  nav_exit: { pt: 'saída', en: 'exit', es: 'salir', ja: '終了', zh: '退出' },
  nav_reloading: {
    pt: 'recarregando...',
    en: 'reloading...',
    es: 'recargando...',
    ja: '再読み込み中...',
    zh: '正在重新加载...',
  },

  search_movies: { pt: 'Pesquisar filmes', en: 'Search movies', es: 'Buscar películas', ja: '映画を検索', zh: '搜索电影' },
  search_series: { pt: 'Pesquisar séries', en: 'Search series', es: 'Buscar series', ja: 'ドラマを検索', zh: '搜索剧集' },
  search_channel: { pt: 'Buscar canal', en: 'Search channel', es: 'Buscar canal', ja: 'チャンネルを検索', zh: '搜索频道' },
  search_movie: { pt: 'Buscar filme', en: 'Search movie', es: 'Buscar película', ja: '映画を検索', zh: '搜索电影' },
  search_show: { pt: 'Buscar série', en: 'Search show', es: 'Buscar serie', ja: 'ドラマを検索', zh: '搜索剧集' },
  preview_select_channel: {
    pt: 'Selecione um canal',
    en: 'Select a channel',
    es: 'Seleccione un canal',
    ja: 'チャンネルを選択してください',
    zh: '请选择频道',
  },
  preview_select_movie: {
    pt: 'Selecione um filme',
    en: 'Select a movie',
    es: 'Seleccione una película',
    ja: '映画を選択してください',
    zh: '请选择电影',
  },
  preview_select_show: {
    pt: 'Selecione uma série',
    en: 'Select a show',
    es: 'Seleccione una serie',
    ja: 'ドラマを選択してください',
    zh: '请选择剧集',
  },

  settings_title: { pt: 'Configurações', en: 'Settings', es: 'Configuración', ja: '設定', zh: '设置' },
  settings_parental_control: {
    pt: 'Controle dos Pais',
    en: 'Parental Control',
    es: 'Control Parental',
    ja: 'ペアレンタルコントロール',
    zh: '家长控制',
  },
  settings_change_language: { pt: 'mudar idioma', en: 'change language', es: 'cambiar idioma', ja: '言語を変更', zh: '更改语言' },
  settings_subtitles: {
    pt: 'Configurações de legenda',
    en: 'Subtitle settings',
    es: 'Configuración de subtítulos',
    ja: '字幕設定',
    zh: '字幕设置',
  },
  settings_hide_live: {
    pt: 'Ocultar Categorias ao Vivo',
    en: 'Hide Live Categories',
    es: 'Ocultar Categorías en Vivo',
    ja: 'ライブカテゴリを非表示',
    zh: '隐藏直播分类',
  },
  settings_hide_vod: {
    pt: 'Ocultar Categorias Vod',
    en: 'Hide VOD Categories',
    es: 'Ocultar Categorías VOD',
    ja: 'VODカテゴリを非表示',
    zh: '隐藏点播分类',
  },
  settings_hide_series: {
    pt: 'Ocultar Categorias Series',
    en: 'Hide Series Categories',
    es: 'Ocultar Categorías de Series',
    ja: 'ドラマカテゴリを非表示',
    zh: '隐藏剧集分类',
  },
  settings_clear_movie_history: {
    pt: 'Limpar histórico de filmes',
    en: 'Clear movie history',
    es: 'Borrar historial de películas',
    ja: '映画の履歴を消去',
    zh: '清除电影历史',
  },
  settings_clear_live_history: {
    pt: 'Limpar histórico Tv ao vivo',
    en: 'Clear Live TV history',
    es: 'Borrar historial de TV en vivo',
    ja: 'ライブTVの履歴を消去',
    zh: '清除直播历史',
  },
  settings_clear_series_history: {
    pt: 'Limpar histórico Series',
    en: 'Clear series history',
    es: 'Borrar historial de series',
    ja: 'ドラマの履歴を消去',
    zh: '清除剧集历史',
  },
  settings_backup: { pt: 'Backup', en: 'Backup', es: 'Copia de seguridad', ja: 'バックアップ', zh: '备份' },

  language_modal_title: {
    pt: 'Selecione o idioma',
    en: 'Select language',
    es: 'Seleccione el idioma',
    ja: '言語を選択',
    zh: '选择语言',
  },
  language_pt: { pt: 'Português', en: 'Portuguese', es: 'Portugués', ja: 'ポルトガル語', zh: '葡萄牙语' },
  language_en: { pt: 'Inglês', en: 'English', es: 'Inglés', ja: '英語', zh: '英语' },
  language_es: { pt: 'Espanhol', en: 'Spanish', es: 'Español', ja: 'スペイン語', zh: '西班牙语' },
  language_ja: { pt: 'Japonês', en: 'Japanese', es: 'Japonés', ja: '日本語', zh: '日语' },
  language_zh: { pt: 'Chinês', en: 'Chinese', es: 'Chino', ja: '中国語', zh: '中文' },

  action_cancel: { pt: 'CANCELAR', en: 'CANCEL', es: 'CANCELAR', ja: 'キャンセル', zh: '取消' },
  action_close: { pt: 'FECHAR', en: 'CLOSE', es: 'CERRAR', ja: '閉じる', zh: '关闭' },

  resume_watch_message: {
    pt: 'Você parou de assistir no meio. O que deseja fazer?',
    en: "You stopped watching partway through. What would you like to do?",
    es: 'Dejaste de ver a la mitad. ¿Qué deseas hacer?',
    ja: '途中で視聴を止めました。どうしますか？',
    zh: '您看到一半就停止了，想怎么做？',
  },
  resume_watch_continue: {
    pt: 'Continuar de onde parou',
    en: 'Continue where you left off',
    es: 'Continuar donde lo dejó',
    ja: '続きから再生',
    zh: '从上次继续',
  },
  resume_watch_restart: {
    pt: 'Começar do início',
    en: 'Start from the beginning',
    es: 'Empezar desde el principio',
    ja: '最初から再生',
    zh: '从头开始',
  },

  exit_confirm_message: {
    pt: 'Deseja sair da reprodução?',
    en: 'Do you want to exit playback?',
    es: '¿Desea salir de la reproducción?',
    ja: '再生を終了しますか？',
    zh: '要退出播放吗？',
  },
  exit_confirm_exit: { pt: 'Sair', en: 'Exit', es: 'Salir', ja: '終了', zh: '退出' },
  exit_confirm_continue: {
    pt: 'Continuar assistindo',
    en: 'Keep watching',
    es: 'Seguir viendo',
    ja: '視聴を続ける',
    zh: '继续观看',
  },

  unfavorite_confirm_message: {
    pt: 'Deseja realmente desfavoritar?',
    en: 'Do you really want to unfavorite this?',
    es: '¿Realmente desea quitar de favoritos?',
    ja: '本当にお気に入りを解除しますか？',
    zh: '确定要取消收藏吗？',
  },
  unfavorite_confirm_confirm: {
    pt: 'Desfavoritar',
    en: 'Unfavorite',
    es: 'Quitar',
    ja: '解除',
    zh: '取消收藏',
  },
  unfavorite_confirm_cancel: {
    pt: 'Cancelar',
    en: 'Cancel',
    es: 'Cancelar',
    ja: 'キャンセル',
    zh: '取消',
  },
} satisfies Record<string, Record<LanguageCode, string>>;

export type TranslationKey = keyof typeof dictionaries;

export function translate(key: TranslationKey, language: LanguageCode): string {
  return dictionaries[key][language] ?? dictionaries[key].pt;
}
