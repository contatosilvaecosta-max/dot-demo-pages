export const LINES = Object.freeze([[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].map(Object.freeze));
export function createGame(phase='ready') { return { board:Array(9).fill(null), turn:'X', phase, winner:null, line:null, moves:0, lastMoveAt:-Infinity }; }
export function startGame(state) { return state.phase==='playing' ? state : createGame('playing'); }
export function finishGame(state) { return state.phase==='playing' ? {...state,phase:'finished'} : state; }
export function playMove(state,index,now=performance.now()) {
  if(state.phase!=='playing' || !Number.isInteger(index) || index<0 || index>8 || state.board[index] || !Number.isFinite(now) || now-state.lastMoveAt<280) return state;
  const board=[...state.board]; board[index]=state.turn;
  const moves=state.moves+1;
  const line=LINES.find(cells=>cells.every(i=>board[i]===state.turn));
  if(line) return {...state,board,moves,line:[...line],winner:state.turn,phase:'won',lastMoveAt:now};
  if(moves===9) return {...state,board,moves,phase:'draw',lastMoveAt:now};
  return {...state,board,moves,turn:state.turn==='X'?'O':'X',lastMoveAt:now};
}
