import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../dist/engine.mjs';
const tick=(m,n)=>{for(let i=0;i<n;i++)m.step(1/60);};
test('opening kick crosses halfway before possession can be recovered',()=>{
 const m=new Match();m.reset();
 const d=m.dir(0);
 for(const p of m.players)assert.ok(p.team===0?(p.y-440)*d<=0:(p.y-440)*d>=71);
 assert.equal(m.pass(),false);tick(m,127);
 assert.equal(m.phase,'live');assert.equal(m.ball.kind,'kick');assert.equal(m.ball.kickoff,true);
 assert.equal(m.ball.sy,440);assert.ok((m.ball.ty-440)*d>=71);assert.equal(m.stats.kicks[0],1);
 tick(m,40);assert.ok(m.loose,'ball stays airborne before reception');
 let recovered=false;
 for(let i=0;i<600;i++){m.step(1/60);if(!m.ball){recovered=true;break;}}
 assert.ok(recovered,'either team can recover the kick');assert.equal(m.phase,'live');
});
test('second half starts with an opponent kick in the reversed direction',()=>{
 const m=new Match();m.reset();m.phase='halftime';m.phaseTime=.01;m.step(.02);
 assert.equal(m.half,2);assert.equal(m.ball.team,1);assert.equal(m.ball.sy,440);
 assert.ok((m.ball.ty-440)*m.dir(1)>71);assert.equal(m.stats.kicks[1],1);
});
