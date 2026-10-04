import { icon } from './icons';
import { Playlist } from '../core/Playlist';
import type { Song, CatalogSong } from '../core/types';
import { LocalAudioPlayer } from '../players/LocalAudioPlayer';
import { YouTubePlayer } from '../players/YouTubePlayer';
import { PlayerCoordinator } from '../players/PlayerCoordinator';
import { fileToSong, releaseSong } from '../services/fileLoader';
import { findPlaybackAlternatives } from '../services/playbackAlternatives';
import { searchCatalog } from '../services/catalogClient';
import { element, mount, renderQueue, renderPlayer, renderCatalog, renderCollections, matchesScope, type QueueScope, showNotice } from './render';
export function startApp(): void {
  mount();
  let theme: 'dark' | 'light' = 'dark';
  try { if (localStorage.getItem('deluxxx-theme') === 'light') theme = 'light'; } catch { /* Use the default theme when storage is unavailable. */ }
  const applyTheme = (): void => {
    document.documentElement.dataset.theme = theme;
    const light = theme === 'light';
    const label = light ? 'Activar tema oscuro' : 'Activar tema claro';
    const button = element<HTMLButtonElement>('theme-toggle');
    button.innerHTML = icon(light ? 'moon' : 'sun');
    button.setAttribute('aria-label',label);
    button.setAttribute('aria-pressed',String(light));
    button.title = label;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content',light ? '#f4f6fb' : '#030915');
  };
  applyTheme();
  element('theme-toggle').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    try { localStorage.setItem('deluxxx-theme',theme); } catch { /* The current tab still keeps the chosen theme. */ }
  });
  const playlist = new Playlist(releaseSong);
  const youtube = new YouTubePlayer('youtube-player',findPlaybackAlternatives);
  const player = new PlayerCoordinator(new LocalAudioPlayer(),youtube);
  let results: CatalogSong[] = [];
  let uploadBusy = false;
  let searchController: AbortController | null = null;
  let searchVersion = 0;
  let scope: QueueScope = 'all';
  const refresh = (): void => { renderQueue(playlist, element<HTMLInputElement>('queue-filter').value, scope); renderCollections(playlist); renderPlayer(playlist, player); };
  const error = (reason: unknown): void => showNotice(reason instanceof Error ? reason.message : 'No se pudo completar la operación.', true);
  const showSource = (song: Song | null): void => {
    element('youtube-panel').hidden = song?.source !== 'youtube';
    if (song?.source === 'youtube') element<HTMLAnchorElement>('youtube-link').href = `https://music.youtube.com/watch?v=${encodeURIComponent(song.videoId)}`;
  };
  const play = async (song: Song | null, autoplay = true): Promise<void> => {
    showSource(song);
    refresh();
    if (song) await player.load(song, autoplay);
    else player.stop();
  };
  youtube.onRecovery = message => showNotice(message);
  youtube.onAlternative = candidate => {
    const current = playlist.getCurrent();
    if (current?.source !== 'youtube') return;
    current.videoId = candidate.videoId;
    current.duration = candidate.duration;
    showSource(current);
    refresh();
    showNotice(`Reproduciendo una versión alternativa: «${candidate.title}» · ${candidate.artist}.`);
  };
  player.onChange = () => renderPlayer(playlist, player);
  player.onError = message => showNotice(message, true);
  player.onEnded = () => {
    const song = playlist.next(true);
    if (song) void play(song);
    else { player.pause(); showNotice('Llegaste al final de tu lista.'); refresh(); }
  };
  const insertionIndex = (): number => {
    const mode = element<HTMLSelectElement>('insert-mode').value;
    if (mode === 'start') return 0;
    if (mode === 'end') return playlist.size;
    const index = element<HTMLInputElement>('insert-position').valueAsNumber;
    if (!Number.isInteger(index) || index < 0 || index > playlist.size) throw new RangeError(`Elige una posición entera entre 0 y ${playlist.size}.`);
    return index;
  };
  element('insert-mode').addEventListener('change', () => { element('position-field').hidden = element<HTMLSelectElement>('insert-mode').value !== 'position'; });
  element('file-input').addEventListener('change', () => {
    const count = element<HTMLInputElement>('file-input').files?.length ?? 0;
    element('file-status').textContent = count ? `${count} ${count === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}` : 'Ningún archivo seleccionado';
  });
  const upload = async (files: FileList | null): Promise<void> => {
    if (uploadBusy) return;
    if (!files?.length) { showNotice('Elige al menos un archivo de audio.', true); return; }
    let index: number;
    try { index = insertionIndex(); } catch (reason) { error(reason); return; }
    const mode = element<HTMLSelectElement>('insert-mode').value;
    const title = element<HTMLInputElement>('song-title').value.trim();
    const artist = element<HTMLInputElement>('song-artist').value.trim();
    uploadBusy = true;
    element<HTMLButtonElement>('upload-button').disabled = true;
    let added = 0, failed = 0;
    try {
      for (const file of files) {
        let song: Song | null = null;
        try {
          song = await fileToSong(file);
          if (files.length === 1 && title) song.title = title;
          if (artist) song.artist = artist;
          if (mode === 'end') playlist.addLast(song);
          else playlist.addAt(Math.min(index++, playlist.size), song);
          added++; refresh();
        } catch (reason) { if (song) releaseSong(song); failed++; error(reason); }
      }
      if (!failed) { element<HTMLDialogElement>('upload-drawer').close(); navigate('queue'); }
      if (!failed) showNotice(`${added} ${added === 1 ? 'canción agregada' : 'canciones agregadas'} a tu lista.`);
      element<HTMLInputElement>('file-input').value = '';
      element('file-status').textContent = 'Ningún archivo seleccionado';
    } finally { uploadBusy = false; element<HTMLButtonElement>('upload-button').disabled = false; }
  };
  element('upload-form').addEventListener('submit', event => { event.preventDefault(); void upload(element<HTMLInputElement>('file-input').files); });
  const dropzone = element('dropzone');
  dropzone.addEventListener('dragover', event => { event.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', event => { event.preventDefault(); dropzone.classList.remove('dragover'); void upload(event.dataTransfer?.files ?? null); });
  element('search-form').addEventListener('submit', async event => {
    event.preventDefault();
    const query = element<HTMLInputElement>('catalog-query').value.trim();
    if (query.length < 2) { showNotice('Escribe al menos dos caracteres para buscar.', true); return; }
    navigate('catalog');
    searchController?.abort();
    searchController = new AbortController();
    const controller = searchController, version = ++searchVersion;
    const timer = window.setTimeout(() => controller.abort('timeout'), 25000);
    element<HTMLButtonElement>('search-button').disabled = true;
    element('catalog-status').textContent = 'Buscando en YouTube Music…';
    results = []; renderCatalog(results);
    try {
      results = await searchCatalog(query, controller.signal, element<HTMLSelectElement>('catalog-kind').value);
      if (version !== searchVersion) return;
      renderCatalog(results);
      element('catalog-status').textContent = results.length ? `${results.length} resultados para «${query}»` : `No encontramos canciones para «${query}». Prueba otra búsqueda.`;
    } catch (reason) {
      if (version !== searchVersion) return;
      element('catalog-status').textContent = 'El catálogo no está disponible. Puedes seguir escuchando tus archivos locales.';
      if (controller.signal.reason === 'timeout') showNotice('La búsqueda tardó demasiado. Intenta de nuevo.', true);
      else error(reason);
    } finally { clearTimeout(timer); if (version === searchVersion) element<HTMLButtonElement>('search-button').disabled = false; }
  });
  element('catalog-results').addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-result],[data-listen]');
    if (!button) return;
    const result = results[Number(button.dataset.result ?? button.dataset.listen)];
    if (!result) return;
    try {
      let selected: Song | null = null;
      if (button.dataset.listen !== undefined) for (const song of playlist) {
        if (song.source === 'youtube' && song.videoId === result.videoId) { selected = song; break; }
      }
      if (!selected) {
        selected = { ...result, id: crypto.randomUUID(), source: 'youtube' };
        playlist.addAt(insertionIndex(), selected);
      }
      if (button.dataset.listen !== undefined) void play(playlist.playById(selected.id));
      refresh(); showNotice(`«${result.title}» agregada a tu lista.`);
    } catch (reason) { error(reason); }
  });
  element('queue-filter').addEventListener('input', refresh);
  element('queue').addEventListener('click', async event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-action]');
    if (!button || button.disabled) return;
    const id = button.dataset.id!;
    try {
      if (button.dataset.action === 'play') await play(playlist.playById(id));
      else if (button.dataset.action === 'favorite') { playlist.toggleFavorite(id); refresh(); }
      else if (button.dataset.action === 'remove') {
        const active = playlist.getCurrent()?.id === id, resume = player.playing;
        if (active) player.stop();
        const removed = playlist.remove(id);
        if (active) { const song = playlist.getCurrent(); showSource(song); if (song && resume) await play(song); }
        refresh();
        if (removed) showNotice(`«${removed.title}» eliminada de tu lista.`);
      } else {
        playlist.move(id, playlist.indexOf(id) + (button.dataset.action === 'up' ? -1 : 1)); refresh();
        element('queue').querySelector<HTMLButtonElement>(`[data-action="${button.dataset.action}"][data-id="${id}"]`)?.focus();
      }
    } catch (reason) { error(reason); }
  });
  element('queue').addEventListener('dragstart', event => {
    const row = (event.target as Element).closest<HTMLElement>('[data-song-id]');
    if (row) { event.dataTransfer?.setData('text/deluxxx-song', row.dataset.songId!); row.classList.add('dragging'); }
  });
  element('queue').addEventListener('dragend', () => { element('queue').querySelectorAll('.dragging').forEach(row => row.classList.remove('dragging')); });
  element('queue').addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('text/deluxxx-song')) event.preventDefault(); });
  element('queue').addEventListener('drop', event => {
    event.preventDefault();
    const row = (event.target as Element).closest<HTMLElement>('[data-song-id]');
    const id = event.dataTransfer?.getData('text/deluxxx-song');
    if (!id || !row) return;
    try { playlist.move(id, playlist.indexOf(row.dataset.songId!)); refresh(); } catch (reason) { error(reason); }
  });
  element('clear-queue').addEventListener('click', () => { player.stop(); playlist.clear(); showSource(null); refresh(); showNotice('Tu lista está vacía.'); });
  element('play').addEventListener('click', () => { const song = playlist.getCurrent(); if (song) { showSource(song); void player.toggle(song); } });
  element('next').addEventListener('click', () => { const song = playlist.next(); if (song) void play(song); });
  element('previous').addEventListener('click', () => { const song = playlist.prev(); if (song) void play(song); });
  element('shuffle').addEventListener('click', () => { playlist.shuffle = !playlist.shuffle; refresh(); });
  element('repeat').addEventListener('click', () => { playlist.repeat = playlist.repeat === 'off' ? 'all' : playlist.repeat === 'all' ? 'one' : 'off'; refresh(); });
  element('back-ten').addEventListener('click', () => player.skip(-10));
  element('forward-ten').addEventListener('click', () => player.skip(10));
  element('progress').addEventListener('input', () => player.seek(element<HTMLInputElement>('progress').valueAsNumber));
  element('volume').addEventListener('input', () => player.setVolume(element<HTMLInputElement>('volume').valueAsNumber));
  element('dismiss-notice').addEventListener('click', () => { element('notice').hidden = true; });
  function navigate(section: 'home' | 'catalog' | 'queue' | 'favorites', nextScope: QueueScope = 'all'): void {
    scope = section === 'favorites' ? 'favorites' : nextScope;
    for (const name of ['home','catalog','queue']) element(`${name}-section`).hidden = name !== (section === 'favorites' ? 'queue' : section);
    for (const name of ['home','catalog','queue','favorites']) {
      const button = element(`nav-${name}`);
      button.classList.toggle('selected', name === section);
      if (name === section) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    }
    const titles = {home:'Tu <span>biblioteca.</span>',catalog:'Encuentra tu <span>sonido.</span>',queue:'Tu música, <span>a tu manera.</span>',favorites:'Tus <span>favoritas.</span>'};
    element('view-title').innerHTML = titles[section];
    element('view-eyebrow').textContent = section === 'catalog' ? 'EXPLORA YOUTUBE MUSIC' : 'TU MÚSICA, TU MOMENTO';
    element('view-description').textContent = section === 'catalog' ? 'Busca canciones y artistas. Escucha o agrégalos a tu lista.' : section === 'favorites' ? 'Las canciones que quieres volver a escuchar.' : 'Organiza tus canciones, descubre nuevos sonidos y dale play a tu momento.';
    refresh();
    window.scrollTo({top:0,behavior:document.documentElement.classList.contains('motion-off') || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    if (section === 'catalog') element('catalog-query').focus({preventScroll:true});
  }
  const openUpload = (): void => {
    element('upload-feedback').hidden = true;
    element<HTMLDialogElement>('upload-drawer').showModal();
  };
  for (const id of ['nav-upload','header-upload','add-music']) element(id).addEventListener('click', openUpload);
  element('close-upload').addEventListener('click', () => element<HTMLDialogElement>('upload-drawer').close());
  for (const id of ['nav-settings','header-settings']) element(id).addEventListener('click', () => element<HTMLDialogElement>('settings-dialog').showModal());
  element('close-settings').addEventListener('click', () => element<HTMLDialogElement>('settings-dialog').close());
  for (const id of ['upload-drawer','settings-dialog']) element(id).addEventListener('click', event => {
    if (event.target === element(id)) element<HTMLDialogElement>(id).close();
  });
  const motion = element<HTMLInputElement>('motion-toggle');
  try { motion.checked = localStorage.getItem('deluxxx-motion') !== 'off'; } catch { /* Storage may be unavailable. */ }
  document.documentElement.classList.toggle('motion-off', !motion.checked);
  motion.addEventListener('change', () => {
    document.documentElement.classList.toggle('motion-off', !motion.checked);
    try { localStorage.setItem('deluxxx-motion', motion.checked ? 'on' : 'off'); } catch { /* Keep the current preference in this session. */ }
  });
  element('logo-home').addEventListener('click', () => navigate('home'));
  element('home-explore').addEventListener('click', () => navigate('catalog'));
  for (const section of ['home','catalog','queue','favorites'] as const) element(`nav-${section}`).addEventListener('click', () => navigate(section));
  element('favorite-current').addEventListener('click', () => {
    const song = playlist.getCurrent(); if (song) { playlist.toggleFavorite(song.id); refresh(); }
  });
  element('collections').addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-collection],[data-collection-play]');
    if (!button || button.disabled) return;
    const key = button.dataset.collection ?? button.dataset.collectionPlay;
    if (key === 'upload') { openUpload(); return; }
    if (key === 'shuffle') {
      playlist.shuffle = true;
      navigate('queue');
      if (playlist.size) void play(playlist.next() ?? playlist.getCurrent()); else openUpload();
      return;
    }
    if (key !== 'all' && key !== 'favorites' && key !== 'local' && key !== 'youtube') return;
    navigate(key === 'favorites' ? 'favorites' : 'queue', key);
    if (button.dataset.collectionPlay !== undefined) for (const song of playlist) {
      if (matchesScope(song,key)) { void play(playlist.playById(song.id)); break; }
    }
  });
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || (event.target instanceof HTMLElement && (event.target.matches('input,textarea,select,button,a') || event.target.isContentEditable))) return;
    if (event.code === 'Space') { event.preventDefault(); element<HTMLButtonElement>('play').click(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); element<HTMLButtonElement>('next').click(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); element<HTMLButtonElement>('previous').click(); }
  });
  const interval = window.setInterval(() => renderPlayer(playlist, player), 500);
  window.addEventListener('pagehide', () => {
    clearInterval(interval); searchController?.abort(); player.stop(); playlist.clear();
  });
  refresh();
}
