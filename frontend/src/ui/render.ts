import type { Playlist } from '../core/Playlist';
import type { Song, CatalogSong } from '../core/types';
import type { PlayerCoordinator } from '../players/PlayerCoordinator';
import { icon } from './icons';
export type QueueScope = 'all' | 'favorites' | 'local' | 'youtube';
export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Falta el elemento ${id}.`);
  return result as T;
}
export function escape(value: string): string {
  return value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
}
export function formatTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}
function artwork(song: { artwork?: string }, className = 'song-art'): string {
  if (song.artwork && /^https:\/\//.test(song.artwork)) return `<img class="${className}" src="${escape(song.artwork)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  return `<span class="${className} placeholder">${icon('music')}</span>`;
}
export function matchesScope(song: Song, scope: QueueScope): boolean {
  return scope === 'all' || (scope === 'favorites' ? !!song.favorite : song.source === scope);
}
export function mount(): void {
  element('app').innerHTML = `
  <a class="skip-link" href="#content">Ir a mi música</a>
  <aside class="sidebar">
    <button class="brand-icon" id="logo-home" aria-label="Ir al inicio">${icon('play')}</button>
    <nav aria-label="Secciones">
      <button id="nav-home" class="nav-item selected" aria-current="page">${icon('home')}<span>Inicio</span></button>
      <button id="nav-catalog" class="nav-item">${icon('compass')}<span>Explorar</span></button>
      <button id="nav-queue" class="nav-item">${icon('music')}<span>Biblioteca</span><b id="nav-count">0</b></button>
      <button id="nav-favorites" class="nav-item">${icon('heart')}<span>Favoritas</span></button>
      <button id="nav-upload" class="nav-item">${icon('upload')}<span>Subir música</span></button>
    </nav>
    <div class="sidebar-bottom"><button id="nav-settings" class="nav-item">${icon('settings')}<span>Ajustes</span></button><div class="session-badge">DX</div><span class="session-label">Tu espacio</span></div>
  </aside>
  <section class="listening-column" aria-label="Sonando ahora">
    <header class="brand"><span>DeluxXx <em>Sound</em></span><span class="brand-wave">${icon('wave')}</span></header>
    <div class="turntable" aria-hidden="true"><div class="record-halo"></div><div class="record"><div class="record-grooves"></div><div id="vinyl-art" class="record-label"><span class="record-monogram">DX<span>SOUND</span></span></div><span class="record-spindle"></span></div><div class="tonearm"><span class="arm-pivot"></span><span class="arm-stem"></span><span class="arm-head"></span></div><span class="turntable-label">DELUXXX · SIDE A</span></div>
    <section class="player-bar" aria-label="Reproductor de música">
      <div class="player-topline"><span class="overline">SONANDO AHORA</span><span id="current-source" class="source-label"></span></div>
      <div class="now-playing"><div id="current-art" class="small-cover"></div><div class="now-text"><strong id="current-title">Tu próxima canción</strong><span id="current-artist">Elige música para empezar</span></div><button id="favorite-current" class="icon-button heart-button" aria-label="Marcar canción como favorita" aria-pressed="false" disabled>${icon('heart')}</button></div>
      <div class="timeline"><input id="progress" type="range" min="0" max="0" step="0.1" value="0" aria-label="Posición de reproducción" disabled><div><span id="elapsed">0:00</span><span id="duration">0:00</span></div></div>
      <div class="transport-buttons"><button id="shuffle" class="icon-button" aria-label="Activar aleatorio" aria-pressed="false">${icon('shuffle')}</button><button id="previous" class="icon-button" aria-label="Canción anterior" disabled>${icon('prev')}</button><button id="play" class="play-button" aria-label="Reproducir" disabled>${icon('play')}</button><button id="next" class="icon-button" aria-label="Canción siguiente" disabled>${icon('next')}</button><button id="repeat" class="icon-button" aria-label="Repetir: desactivado" aria-pressed="false">${icon('repeat')}<span id="repeat-badge"></span></button></div>
      <div class="player-extras"><button id="back-ten" class="text-button" aria-label="Retroceder 10 segundos" disabled>−10s</button><label for="volume" class="volume-label">${icon('volume')}<span class="sr-only">Volumen</span></label><input id="volume" type="range" min="0" max="1" step="0.01" value="0.8" aria-label="Volumen"><button id="forward-ten" class="text-button" aria-label="Adelantar 10 segundos" disabled>+10s</button></div>
    </section>
    <div class="listening-caption"><span class="status-orbit"></span><span id="playback-status">Un espacio para tu música.</span></div>
  </section>
  <main id="content" class="main">
    <header class="topbar"><form id="search-form" class="search-form"><span>${icon('search')}</span><input id="catalog-query" type="search" minlength="2" maxlength="150" placeholder="Buscar canciones, artistas…" aria-label="Buscar en YouTube Music" required><select id="catalog-kind" aria-label="Tipo de resultado"><option value="songs">Canciones</option><option value="videos">Videos</option></select><button id="search-button" class="icon-button" aria-label="Buscar" type="submit">${icon('search')}</button></form><button id="theme-toggle" type="button" class="icon-button theme-toggle" aria-label="Activar tema claro" aria-pressed="false" title="Activar tema claro">${icon('sun')}</button><button id="header-upload" class="icon-button header-upload" aria-label="Agregar archivos de música">${icon('plus')}</button><button id="header-settings" class="icon-button header-settings" aria-label="Ajustes de la aplicación">${icon('settings')}</button></header>
    <div class="workspace-body">
      <section class="welcome"><div><p id="view-eyebrow" class="overline accent">TU MÚSICA, TU MOMENTO</p><h1 id="view-title">Tu <span>biblioteca.</span></h1><p id="view-description">Tus canciones, tus favoritas y lo que quieres descubrir.</p></div><button id="add-music" class="button primary">${icon('plus')} Agregar música</button></section>
      <div id="notice" class="notice" role="status" aria-live="polite" hidden><span id="notice-text"></span><button id="dismiss-notice" class="icon-button" aria-label="Cerrar aviso">${icon('close')}</button></div>
      <section id="home-section" class="home-section" aria-label="Colecciones de música"><div id="collections" class="collections"></div><div class="home-tip">${icon('headphones')}<span>Sube tus archivos o encuentra tu próxima canción en <button id="home-explore">Explorar</button>.</span></div></section>
      <section class="catalog" id="catalog-section" aria-labelledby="catalog-heading" hidden><div class="section-heading"><h2 id="catalog-heading">YouTube Music</h2><span class="tag">DESCUBRIR</span></div><p id="catalog-status" class="small muted">Busca una canción o un artista en la barra de arriba.</p><div id="catalog-results" class="results"></div></section>
      <section class="queue-section" id="queue-section" aria-labelledby="queue-heading" hidden><div class="section-heading"><div><h2 id="queue-heading"><span id="queue-title">Mi lista</span> <span id="queue-count" class="count-pill">0</span></h2><p id="queue-summary" class="small muted">Todo empieza con una canción.</p></div><button id="clear-queue" class="button quiet" disabled>${icon('trash')} Vaciar cola</button></div><label class="queue-search">${icon('search')}<input id="queue-filter" type="search" placeholder="Filtrar por canción o artista" aria-label="Filtrar lista por título o artista"></label><div class="table-head"><span>#</span><span>CANCIÓN</span><span>TIEMPO</span><span>ACCIONES</span></div><div id="queue"></div></section>
      <section id="youtube-panel" class="youtube-panel" hidden><div class="section-heading"><div><span class="overline">FUENTE DE AUDIO</span><h2>YouTube</h2></div><a id="youtube-link" target="_blank" rel="noopener noreferrer">Abrir original</a></div><div class="youtube-shell"><div id="youtube-player"></div></div><p class="small muted">El audio y los controles de la canción están conectados al reproductor de la izquierda. Si el navegador pide permiso, pulsa reproducir dentro de YouTube.</p></section>
      <footer class="main-footer"><div class="footer-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span>MÚSICA A TU MANERA</span><div class="footer-line"></div></footer>
    </div>
  </main>
  <dialog id="upload-drawer" class="drawer"><div class="drawer-heading"><div><p class="overline accent">TU COLECCIÓN</p><h2>Agrega tu música</h2></div><button id="close-upload" class="icon-button" aria-label="Cerrar carga de archivos">${icon('close')}</button></div><form id="upload-form"><p class="muted small">Tus archivos se quedan en este navegador.</p><label class="dropzone" id="dropzone" for="file-input">${icon('upload')}<strong>Elige o arrastra tus audios</strong><span>MP3 · WAV · OGG · M4A · AAC · FLAC · WEBM</span><small>Hasta 50 MB por archivo</small><input id="file-input" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm" multiple></label><p id="file-status" class="small muted">Ningún archivo seleccionado</p><label class="field">Título opcional<input id="song-title" type="text" maxlength="200" placeholder="Nombre de la canción"></label><label class="field">Artista opcional<input id="song-artist" type="text" maxlength="200" placeholder="Nombre del artista"></label><label class="field">Agregar a la cola<select id="insert-mode"><option value="end">Al final</option><option value="start">Al inicio</option><option value="position">En una posición</option></select></label><label class="field" id="position-field" hidden>Posición (empieza en 0)<input id="insert-position" type="number" min="0" step="1" value="0"><span id="position-hint" class="muted small">Entre 0 y 0</span></label><p id="upload-feedback" class="form-feedback" role="status" hidden></p><button id="upload-button" class="button primary full" type="submit">${icon('plus')} Agregar archivos</button></form></dialog>
  <dialog id="settings-dialog" class="settings-dialog"><div class="drawer-heading"><h2>Tu experiencia</h2><button id="close-settings" class="icon-button" aria-label="Cerrar ajustes">${icon('close')}</button></div><label class="setting"><span><strong>Animaciones suaves</strong><small>Movimiento del vinilo y transiciones.</small></span><input id="motion-toggle" type="checkbox" checked></label><div class="shortcut-list"><h3>Atajos de teclado</h3><p><span>Reproducir / pausar</span><kbd>Espacio</kbd></p><p><span>Anterior / siguiente</span><kbd>← →</kbd></p></div><p class="small muted">La biblioteca de esta versión vive en tu pestaña. Recargar la página vacía la cola.</p></dialog>`;
}
export function renderCollections(playlist: Playlist): void {
  const songs = playlist.toArray();
  const groups = [
    {name:'Mi lista',key:'all',icon:'list',theme:'wine',description:'Todo lo que quieres escuchar',songs},
    {name:'Favoritas',key:'favorites',icon:'heart',theme:'rose',description:'Las que siempre vuelven',songs:songs.filter(song=>song.favorite)},
    {name:'Mis archivos',key:'local',icon:'disc',theme:'ocean',description:'Tu música, cerca de ti',songs:songs.filter(song=>song.source==='local')},
    {name:'YouTube Music',key:'youtube',icon:'globe',theme:'blue',description:'Descubre y sigue escuchando',songs:songs.filter(song=>song.source==='youtube')},
  ];
  element('collections').innerHTML = groups.map((group,index)=>{
    const cover = group.songs.find(song=>song.artwork);
    const image = cover ? artwork(cover,'collection-image') : `<div class="collection-symbol">${icon(group.icon)}<span>${group.name === 'Mi lista' ? 'DELUXXX' : 'SOUND'}</span></div>`;
    return `<article class="collection-card theme-${group.theme}" style="--order:${index}"><button class="collection-art" data-collection="${group.key}" aria-label="Abrir ${group.name}">${image}<span class="art-label">${group.description}</span></button><div class="collection-info"><button class="collection-name" data-collection="${group.key}">${group.name}</button><span>${group.songs.length} ${group.songs.length===1?'canción':'canciones'}</span><button class="collection-play" data-collection-play="${group.key}" aria-label="Reproducir ${group.name}" ${!group.songs.length?'disabled':''}>${icon('play')}</button></div></article>`;
  }).join('') + `<article class="collection-card theme-night" style="--order:4"><button class="collection-art" data-collection="shuffle" aria-label="Escuchar en modo aleatorio"><div class="collection-symbol">${icon('shuffle')}<span>EN OTRO ORDEN</span></div><span class="art-label">Deja que tu lista te sorprenda</span></button><div class="collection-info"><button class="collection-name" data-collection="shuffle">Modo aleatorio</button><span>Tu cola, un nuevo ritmo</span><button class="collection-play" data-collection-play="shuffle" aria-label="Reproducir en modo aleatorio" ${!playlist.size?'disabled':''}>${icon('play')}</button></div></article><article class="collection-card theme-add" style="--order:5"><button class="collection-art" data-collection="upload" aria-label="Subir música a mi biblioteca"><div class="collection-symbol">${icon('upload')}<span>TU PRÓXIMA CANCIÓN</span></div><span class="art-label">MP3, WAV y tus otros audios</span></button><div class="collection-info"><button class="collection-name" data-collection="upload">Agregar música</button><span>Haz espacio para algo nuevo</span><button class="collection-play" data-collection="upload" aria-label="Agregar música">${icon('plus')}</button></div></article>`;
}
export function renderQueue(playlist: Playlist, filter: string, scope: QueueScope='all'): void {
  const songs = playlist.toArray();
  const current = playlist.getCurrent()?.id;
  const query = filter.trim().toLocaleLowerCase();
  const visible = songs.filter(song=>matchesScope(song,scope));
  element('nav-count').textContent = String(playlist.size);
  element('queue-count').textContent = String(visible.length);
  element('queue-title').textContent = {all:'Mi lista',favorites:'Favoritas',local:'Mis archivos',youtube:'YouTube Music'}[scope];
  const total = visible.reduce((sum,song)=>sum+(song.duration??0),0);
  element('queue-summary').textContent = visible.length ? `${visible.length} ${visible.length===1?'canción':'canciones'} · ${formatTime(total)}${visible.some(song=>song.duration===null)?' de duración conocida':''}` : 'Todo empieza con una canción.';
  element<HTMLButtonElement>('clear-queue').disabled = !playlist.size;
  element<HTMLInputElement>('insert-position').max = String(playlist.size);
  element('position-hint').textContent = `Entre 0 y ${playlist.size}`;
  let count=0;
  element('queue').innerHTML = songs.map((song,index)=>{
    if (!matchesScope(song,scope) || (query && !`${song.title} ${song.artist}`.toLocaleLowerCase().includes(query))) return '';
    count++;
    return `<div class="song-row ${song.id===current?'current':''}" draggable="true" data-song-id="${escape(song.id)}"><span class="row-number">${song.id===current?icon('wave'):index+1}</span><button class="song-main" data-action="play" data-id="${escape(song.id)}" aria-label="Reproducir ${escape(song.title)}">${artwork(song)}<span><strong>${escape(song.title)}</strong><small>${escape(song.artist)} <span class="row-source">· ${song.source==='local'?'Local':'YouTube'}</span></small></span></button><span class="row-duration">${formatTime(song.duration)}</span><div class="row-actions"><button class="icon-button ${song.favorite?'active':''}" data-action="favorite" data-id="${escape(song.id)}" aria-label="${song.favorite?'Quitar de favoritas':'Marcar favorita'} ${escape(song.title)}" aria-pressed="${!!song.favorite}">${icon('heart')}</button><button class="icon-button" data-action="up" data-id="${escape(song.id)}" aria-label="Subir ${escape(song.title)}" ${index===0?'disabled':''}>${icon('up')}</button><button class="icon-button" data-action="down" data-id="${escape(song.id)}" aria-label="Bajar ${escape(song.title)}" ${index===songs.length-1?'disabled':''}>${icon('down')}</button><button class="icon-button delete" data-action="remove" data-id="${escape(song.id)}" aria-label="Eliminar ${escape(song.title)}">${icon('trash')}</button></div></div>`;
  }).join('');
  if(!count) element('queue').innerHTML=`<div class="empty-state"><span class="empty-icon">${icon(scope==='favorites'?'heart':query?'search':'music')}</span><h3>${query?'No hay coincidencias':scope==='favorites'?'Aquí van tus favoritas':'Tu próxima canción está por llegar'}</h3><p>${query?'Prueba otro título o artista.':scope==='favorites'?'Pulsa el corazón de una canción para encontrarla aquí.':'Agrega un audio o explora YouTube Music para empezar.'}</p></div>`;
}
export function renderCatalog(songs: CatalogSong[]): void {
  element('catalog-results').innerHTML=songs.map((song,index)=>`<article class="result-card">${artwork(song)}<div><strong>${escape(song.title)}</strong><small>${escape(song.artist)}</small><span class="small muted">${formatTime(song.duration)}</span></div><div class="result-actions"><button class="icon-button result-listen" data-listen="${index}" aria-label="Escuchar ${escape(song.title)}">${icon('play')}</button><button class="icon-button result-add" data-result="${index}" aria-label="Agregar ${escape(song.title)}">${icon('plus')}</button></div></article>`).join('');
}
let displayedSong: Song|null=null;
let previousPlayIcon: string|null=null;
export function renderPlayer(playlist: Playlist, player: PlayerCoordinator): void {
  const song=playlist.getCurrent();
  if(song!==displayedSong || !element('current-art').firstChild){
    displayedSong=song;
    element('current-title').textContent=song?.title??'Tu próxima canción';
    element('current-artist').textContent=song?.artist??'Elige música para empezar';
    element('current-source').textContent=song?(song.source==='local'?'LOCAL':'YOUTUBE'):'';
    element('current-art').innerHTML=artwork(song??{},'current-cover');
    element('vinyl-art').innerHTML=song?.artwork?artwork(song,'vinyl-cover'):'<span class="record-monogram">DX<span>SOUND</span></span>';
  }
  element('app').classList.toggle('listening',player.playing);
  element('playback-status').textContent=player.loading?'Preparando tu canción…':player.error?'No se pudo iniciar esta canción.':player.playing?'Ahora suena a tu manera.':song?'Todo listo para darle play.':'Un espacio para tu música.';
  const favorite=element<HTMLButtonElement>('favorite-current');
  favorite.disabled=!song;
  favorite.classList.toggle('active',!!song?.favorite);
  favorite.setAttribute('aria-pressed',String(!!song?.favorite));
  favorite.setAttribute('aria-label',song?.favorite?'Quitar canción de favoritas':'Marcar canción como favorita');
  const playIcon=player.loading?'loading':player.playing?'pause':'play';
  if(playIcon!==previousPlayIcon){ previousPlayIcon=playIcon; element('play').innerHTML=playIcon==='loading'?'<span class="spinner"></span>':icon(playIcon); element('play').setAttribute('aria-label',player.playing?'Pausar':'Reproducir'); }
  element<HTMLButtonElement>('play').disabled=!song||player.loading;
  element<HTMLButtonElement>('next').disabled=!playlist.canNext;
  element<HTMLButtonElement>('previous').disabled=!playlist.canPrev;
  element('shuffle').classList.toggle('active',playlist.shuffle);
  element('shuffle').setAttribute('aria-pressed',String(playlist.shuffle));
  element('repeat').classList.toggle('active',playlist.repeat!=='off');
  element('repeat').setAttribute('aria-pressed',String(playlist.repeat!=='off'));
  element('repeat').setAttribute('aria-label',`Repetir: ${playlist.repeat==='off'?'desactivado':playlist.repeat==='all'?'todas':'una'}`);
  element('repeat-badge').textContent=playlist.repeat==='one'?'1':'';
  const duration=player.duration||song?.duration||0;
  element('elapsed').textContent=formatTime(player.time); element('duration').textContent=formatTime(duration);
  const progress=element<HTMLInputElement>('progress'); progress.max=String(duration);
  if(document.activeElement!==progress) progress.value=String(player.time);
  progress.style.setProperty('--progress',`${duration?Math.min(100,player.time/duration*100):0}%`);
  progress.disabled=!song||!duration||!player.ready;
  for(const id of ['back-ten','forward-ten']) element<HTMLButtonElement>(id).disabled=!song||!duration||!player.ready;
}
export function showNotice(message:string,error=false):void{
  element('notice-text').textContent=message; element('notice').hidden=false; element('notice').classList.toggle('error',error);
  if(element<HTMLDialogElement>('upload-drawer').open&&error){ element('upload-feedback').textContent=message; element('upload-feedback').hidden=false; }
}
