import { expect,it,vi } from 'vitest';
import { findPlaybackAlternatives, rankAlternatives } from '../src/services/playbackAlternatives';
const song = {videoId:'u8vLc0JlK9s',title:'Por Amarte Así',artist:'Natanael Cano',duration:203};
it('elige misma canción/artista, deduplica y descarta otras canciones e interpretaciones', () => {
  const match = {...song,videoId:'abcdefghijk',title:'Natanael Cano - Por Amarte Asi (Letra)'};
  expect(rankAlternatives(song,[song,match,match,{...song,videoId:'lmnopqrstuv',artist:'Cristian Castro'},
    {...match,videoId:'01234567890',title:'Natanael Cano - Madrid'},
    {...match,videoId:'98765432100',title:'Por Amarte Así - Natanael Cano (Karaoke)'},
    {...match,videoId:'abcdef12345',duration:30}])).toEqual([match]);
});

it('prioriza versiones con letra y conserva más de tres alternativas', () => {
  const official = {...song,videoId:'abcdefghijk'};
  const lyric = {...song,videoId:'lmnopqrstuv',artist:'Canal de letras',title:'Natanael Cano - Por Amarte Así (Letra)'};
  const candidates = [official,lyric,...['01234567890','01234567891','01234567892','01234567893'].map(videoId=>({...official,videoId}))];
  expect(rankAlternatives(song,candidates)[0]).toEqual(lyric);
  expect(rankAlternatives(song,candidates)).toHaveLength(6);
});

it('usa artista principal y tolera créditos feat sin perder la identidad del tema', () => {
  const recording = {...song,title:'Sin Tu Amor (feat. Alex Pro)',artist:'Nigga, Alex Pro'};
  const alternative = {...recording,videoId:'abcdefghijk',title:'Nigga - Sin Tu Amor (Letra)',artist:'Canal de letras'};
  expect(rankAlternatives(recording,[alternative])).toEqual([alternative]);
  const multi = {...song,title:'Chococono',artist:'Kris R., Prodmonja'};
  const lyric = {...multi,videoId:'lmnopqrstuv',title:'Kris R - Chococono (Letra)',artist:'Canal de letras'};
  expect(rankAlternatives(multi,[lyric,{...lyric,videoId:'01234567890',title:'Kris R - Chococono (Villancico)'}])).toEqual([lyric]);
});

it('no confunde un type beat con la canción que se quiere escuchar', () => {
  const recording = {...song,title:'Chococono',artist:'Kris R., Prodmonja',duration:216};
  expect(rankAlternatives(recording,[{...recording,videoId:'abcdefghijk',title:'(FREE) Kris R - CHOCOCONO - Trap Type Beat 2024',artist:'Productor',duration:175}])).toEqual([]);
});

vi.mock('../src/services/catalogClient',()=>({searchCatalog:vi.fn()}));
import { searchCatalog } from '../src/services/catalogClient';
it('busca letra aunque la consulta general llene los ocho intentos', async () => {
  const general = Array.from({length:8},(_,index)=>({...song,videoId:`general000${index}`}));
  const lyric = {...song,videoId:'lyric000001',title:'Natanael Cano - Por Amarte Así (Letra)',artist:'Canal de letras'};
  vi.mocked(searchCatalog).mockImplementation(async query=>query.endsWith(' letra') ? [lyric] : general);
  const alternatives = await findPlaybackAlternatives(song,new AbortController().signal);
  expect(alternatives).toHaveLength(8); expect(alternatives[0]).toEqual(lyric);
  expect(searchCatalog).toHaveBeenCalledWith('Por Amarte Así Natanael Cano letra',expect.any(AbortSignal),'videos');
});
it('conserva alternativas válidas aunque otra consulta falle', async () => {
  const lyric = {...song,videoId:'lyric000001',title:'Natanael Cano - Por Amarte Así (Letra)'};
  vi.mocked(searchCatalog).mockImplementation(async query=>{if(query.endsWith(' letra'))return [lyric];throw new Error('red');});
  expect(await findPlaybackAlternatives(song,new AbortController().signal)).toEqual([lyric]);
});
it('no devuelve alternativas cuando el usuario cancela la búsqueda', async () => {
  const controller=new AbortController(); controller.abort();
  vi.mocked(searchCatalog).mockResolvedValue([]);
  await expect(findPlaybackAlternatives(song,controller.signal)).rejects.toMatchObject({name:'AbortError'});
});
