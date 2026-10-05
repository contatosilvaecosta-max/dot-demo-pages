import { createGame, startGame, finishGame, playMove } from './engine.mjs';
const $=selector=>document.querySelector(selector);
const cells=[...document.querySelectorAll('.cell')];
let state=createGame();
const markSvg=mark=>mark==='X'
  ? '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 15L49 49" pathLength="1"/><path class="second" d="M49 15L15 49" pathLength="1"/></svg>'
  : '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22" pathLength="1" transform="rotate(-90 32 32)"/></svg>';
function render() {
  $('.game').dataset.phase=state.phase; $('.game').dataset.turn=state.turn;
  const active=state.phase==='playing', won=state.phase==='won';
  const text={ready:['A DISPUTA É DE VOCÊS','Pode começar.','Escolham seus lados. X joga primeiro.','O tabuleiro está pronto'],playing:['UMA CASA DE CADA VEZ',`Sua vez, ${state.turn}.`,'Toque em uma casa vazia.','Três em linha para vencer'],won:['TRÊS EM LINHA',`${state.winner} venceu!`,'Boa jogada. Quem leva a próxima?','Uma linha. Uma vitória.'],draw:['NENHUM LADO CEDEU','Deu velha.','Tudo igual. Que tal outra partida?','Nove jogadas. Empate.'],finished:['PAUSA NA DISPUTA','Partida encerrada.','O tabuleiro fica como vocês deixaram.','Finalizada sem resultado']}[state.phase];
  ['#eyebrow','#title','#subtitle','#board-caption'].forEach((id,i)=>{$(id).textContent=text[i]});
  ['X','O'].forEach(mark=>{const element=$(`#player-${mark.toLowerCase()}`);element.classList.toggle('active',(active&&state.turn===mark)||(won&&state.winner===mark));$(`#note-${mark.toLowerCase()}`).textContent=active?(state.turn===mark?'É a sua vez':'Aguarde sua vez'):won?(state.winner===mark?'Vitória!':'Até a próxima'):state.phase==='draw'?'Empate':state.phase==='finished'?'Partida finalizada':mark==='X'?'Primeiro a jogar':'Logo depois';});
  cells.forEach((cell,i)=>{
    const mark=state.board[i]||'';
    if(cell.dataset.mark!==mark){cell.dataset.mark=mark;cell.querySelector('svg')?.remove();if(mark)cell.insertAdjacentHTML('beforeend',markSvg(mark));}
    cell.classList.toggle('winner',!!state.line?.includes(i));
    cell.setAttribute('aria-disabled',String(!active||!!mark));
    cell.setAttribute('aria-label',`Linha ${Math.floor(i/3)+1}, coluna ${i%3+1}: ${mark||'vazia'}${state.line?.includes(i)?', linha vencedora':''}`);
  });
  $('#moves').textContent=String(state.moves).padStart(2,'0');
  $('#start').disabled=active; $('#start').firstChild.textContent=state.phase==='ready'?'Iniciar':active?'Em jogo':'Nova partida';
  $('#finish').disabled=!active;
  const overlay=$('#winning-line');overlay.classList.toggle('visible',won);
  if(won){const line=overlay.querySelector('line');const [first,,last]=state.line;[['x1',first%3*100+50],['y1',Math.floor(first/3)*100+50],['x2',last%3*100+50],['y2',Math.floor(last/3)*100+50]].forEach(([key,value])=>line.setAttribute(key,value));overlay.style.color=state.winner==='X'?'var(--x)':'var(--o)';}
}
function apply(next){const changed=next!==state;state=next;if(changed)render();return changed;}
function begin(){apply(startGame(state));}
function finish(){apply(finishGame(state));}
function move(index){return apply(playMove(state,index));}
$('#start').addEventListener('click',event=>{if(event.detail>1)return;begin();});
$('#finish').addEventListener('click',finish);
cells.forEach((cell,i)=>{
  cell.addEventListener('click',event=>{if(event.detail>1)return;move(i);});
  cell.addEventListener('keydown',event=>{
    if(event.repeat&&(event.key==='Enter'||event.key===' ')){event.preventDefault();return;}
    const directions={ArrowRight:1,ArrowLeft:-1,ArrowDown:3,ArrowUp:-3};
    if(event.key in directions){event.preventDefault();cells[(i+directions[event.key]+9)%9].focus();}
    if(event.key==='Home'){event.preventDefault();cells[0].focus();}
    if(event.key==='End'){event.preventDefault();cells[8].focus();}
  });
});
render();
// Optional browser-native tools use the same in-memory state and actions as the UI.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  const snapshot=()=>({board:[...state.board],turn:state.turn,phase:state.phase,moves:state.moves,winner:state.winner});
  const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'read_game',description:'Read the current local two-player game.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>snapshot()});
  register({name:'start_game',description:'Start a fresh local game only when no game is in progress.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:()=>{if(state.phase==='playing')throw new Error('A game is already in progress.');begin();return snapshot();}});
  register({name:'play_cell',description:'Play the current player in one empty cell, indexed 1 through 9 left to right, top to bottom. Consecutive moves must be at least 280 ms apart.',inputSchema:{type:'object',properties:{cell:{type:'integer',minimum:1,maximum:9}},required:['cell'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||Object.keys(input).length!==1||!Number.isInteger(input.cell)||input.cell<1||input.cell>9)throw new Error('Cell must be an integer from 1 through 9.');if(!move(input.cell-1))throw new Error('Move rejected: unavailable cell, inactive game, or input too soon.');return snapshot();}});
  register({name:'finish_game',description:'End and freeze the current game without choosing a winner.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:()=>{if(state.phase!=='playing')throw new Error('No active game.');finish();return snapshot();}});
  window.addEventListener('pagehide',event=>{if(!event.persisted)lifecycle.abort();},{once:true});
}
