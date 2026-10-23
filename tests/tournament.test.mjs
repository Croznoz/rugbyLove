import test from 'node:test';
import assert from 'node:assert/strict';
import {NATIONS} from '../dist/teams.mjs';
import {schedule,createTournament,nextOpponent,finishRound,standings,restoreTournament} from '../dist/tournament.mjs';
test('five rounds cover every pair once and every nation once per round',()=>{
 const rounds=schedule(),pairs=new Set();
 for(const round of rounds){assert.equal(new Set(round.flat()).size,6);for(const pair of round)pairs.add([...pair].sort().join('-'));}
 assert.equal(rounds.length,5);assert.equal(pairs.size,15);
 for(const n of NATIONS){
  const t=createTournament(n.id),opponents=[];
  for(let r=0;r<5;r++){opponents.push(nextOpponent(t));assert.equal(finishRound(t,[7,0],[1,0],r),true);assert.equal(finishRound(t,[7,0],[1,0],r),false);}
  assert.equal(new Set(opponents).size,5);assert.ok(!opponents.includes(n.id));assert.equal(nextOpponent(t),null);
  const row=standings(t).find(r=>r.id===n.id);assert.equal(row.points,23);assert.equal(row.wins,5);assert.equal(row.diff,35);
 }
});
test('draw, close loss, four tries and shared ranks follow the standings rules',()=>{
 const t=createTournament('ita');
 t.results=[{teams:['ita','fra'],score:[24,26],tries:[4,4]},{teams:['irl','eng'],score:[0,0],tries:[0,0]}];
 const rows=standings(t),get=id=>rows.find(r=>r.id===id);
 assert.equal(get('ita').points,2);assert.equal(get('fra').points,5);assert.equal(get('irl').points,2);
 assert.equal(get('irl').rank,get('eng').rank);
});
test('CPU fixtures are reproducible and independent from the human score',()=>{
 const a=createTournament('ita',{},99),b=createTournament('ita',{},99);
 finishRound(a,[0,0],[0,0]);finishRound(b,[14,0],[2,0]);
 assert.deepEqual(a.results.filter(g=>!g.teams.includes('ita')),b.results.filter(g=>!g.teams.includes('ita')));
});
test('save restores settings and next round; rejects invalid, partial or forged results',()=>{
 const t=createTournament('wal',{seconds:120,difficulty:'hard',scrums:true},7);
 finishRound(t,[7,5],[1,1]);const saved=JSON.stringify(t);
 assert.deepEqual(restoreTournament(saved),t);assert.equal(nextOpponent(restoreTournament(saved)),nextOpponent(t));
 for(const raw of ['bad','null','{}',JSON.stringify({...t,results:t.results.slice(1)}),saved.replace('"version":1','"version":2'),saved.replace('"score":[','"score":[999,')])assert.equal(restoreTournament(raw),null);
 assert.equal(finishRound(t,[1,0],[0,0]),false);
});
