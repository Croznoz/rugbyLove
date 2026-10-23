import {NATIONS} from './teams.mjs';
const ids=NATIONS.map(n=>n.id);
const valid=id=>ids.includes(id);
export const STORAGE_KEY='rugbylove-six-nations-v1';
export function schedule(){
  const rotation=[...ids],rounds=[];
  for(let r=0;r<5;r++){
    rounds.push(Array.from({length:3},(_,i)=>[rotation[i],rotation[5-i]]));
    rotation.splice(1,0,rotation.pop());
  }
  return rounds;
}
export function createTournament(team,settings={},seed=Date.now()){
  if(!valid(team))throw new Error('Nazionale non valida');
  return {version:1,team,settings:{seconds:settings.seconds===120?120:60,difficulty:['easy','normal','hard'].includes(settings.difficulty)?settings.difficulty:'normal',scrums:!!settings.scrums},seed:seed>>>0,results:[]};
}
export const roundOf=t=>t.results.length/3;
export function nextOpponent(t){
  const fixture=schedule()[roundOf(t)]?.find(f=>f.includes(t.team));
  return fixture?.find(id=>id!==t.team)||null;
}
function rng(seed){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function validScore(score,tries){
  return Array.isArray(score)&&Array.isArray(tries)&&score.length===2&&tries.length===2&&score.every((n,i)=>Number.isInteger(n)&&Number.isInteger(tries[i])&&tries[i]>=0&&tries[i]<=100&&n>=tries[i]*5&&n<=tries[i]*7&&(n-tries[i]*5)%2===0);
}
export function finishRound(t,score,tries,expectedRound=roundOf(t)){
  const r=roundOf(t);if(r!==expectedRound||r>=5||!validScore(score,tries))return false;
  const random=rng(t.seed+r*7919);
  for(const teams of schedule()[r]){
    let points,metas;
    if(teams.includes(t.team)){
      const order=teams[0]===t.team?[0,1]:[1,0];points=order.map(i=>score[i]);metas=order.map(i=>tries[i]);
    }else{
      // Low-scoring arcade fixtures, independent of the user's score and nation.
      metas=teams.map(()=>Math.floor(random()*3));
      points=metas.map(n=>n*5+Array.from({length:n},()=>random()<.7?2:0).reduce((a,b)=>a+b,0));
    }
    t.results.push({round:r,teams:[...teams],score:points,tries:metas});
  }
  return true;
}
export function standings(t){
  const rows=ids.map(id=>({id,played:0,wins:0,points:0,diff:0,tries:0}));
  for(const game of t.results)game.teams.forEach((id,i)=>{
    const row=rows.find(r=>r.id===id),diff=game.score[i]-game.score[1-i];
    row.played++;row.diff+=diff;row.tries+=game.tries[i];
    row.wins+=diff>0?1:0;row.points+=diff>0?4:diff===0?2:0;
    if(game.tries[i]>=4)row.points++;
    if(diff<0&&diff>=-7)row.points++;
  });
  for(const row of rows)if(row.wins===5)row.points+=3;
  rows.sort((a,b)=>b.points-a.points||b.diff-a.diff||b.tries-a.tries||ids.indexOf(a.id)-ids.indexOf(b.id));
  rows.forEach((row,i)=>{row.rank=i&&row.points===rows[i-1].points&&row.diff===rows[i-1].diff&&row.tries===rows[i-1].tries?rows[i-1].rank:i+1;});
  return rows;
}
export function restoreTournament(raw){
  try{
    const t=JSON.parse(raw);
    if(t?.version!==1||!valid(t.team)||!Number.isInteger(t.seed)||t.seed<0||t.seed>4294967295||
      ![60,120].includes(t.settings?.seconds)||!['easy','normal','hard'].includes(t.settings?.difficulty)||typeof t.settings?.scrums!=='boolean'||
      !Array.isArray(t.results)||t.results.length>15||t.results.length%3)return null;
    const fixtures=schedule().flat();
    if(!t.results.every((g,i)=>g.round===Math.floor(i/3)&&Array.isArray(g.teams)&&g.teams.length===2&&g.teams.every((id,j)=>id===fixtures[i][j])&&validScore(g.score,g.tries)))return null;
    return t;
  }catch{return null;}
}
