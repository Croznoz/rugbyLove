import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../dist/engine.mjs';
function setup(team=0){const m=new Match();m.reset();m.phase='live';m.lineup(team);m.passCooldown=0;m.guard=999;for(const p of m.players){p.x=430;p.y=700;p.down=10;}Object.assign(m.carrier,{x:240,y:440,down:0,vx:0,vy:0});return m;}
test('direction selects a long or short receiver without changing buttons, in both halves',()=>{
 for(const dir of [-1,1]){const m=setup();m.attackDir=dir;const near=m.players[1],far=m.players[2];Object.assign(near,{x:280,y:440-dir*75,down:0});Object.assign(far,{x:420,y:440-dir*20,down:0});
 assert.equal(m.target({x:1,y:0}).id,far.id);assert.equal(m.target({x:.4,y:-dir}).id,near.id);
 assert.equal(m.pass({x:1,y:0}),true);assert.equal(m.ball.to,far.id);assert.ok((m.ball.ty-m.ball.sy)*dir<=0);
 }
});
test('a crowded requested side never silently passes to the opposite side',()=>{const m=setup();Object.assign(m.players[1],{x:160,y:470,down:0});Object.assign(m.players[2],{x:320,y:470,down:0});Object.assign(m.players[7],{x:200,y:455,down:0});assert.equal(m.target({x:-1,y:0}).id,1);m.players[1].down=1;assert.equal(m.target({x:-1,y:0}),null);assert.equal(m.pass({x:-1,y:0}),false);assert.equal(m.ball,null);});
test('small thumb jitter keeps the highlighted receiver, deliberate direction changes it',()=>{const m=setup();Object.assign(m.players[1],{x:320,y:480,down:0});Object.assign(m.players[2],{x:330,y:510,down:0});const chosen=m.target({x:1,y:.5}).id;for(const y of [.49,.51,.48,.52])assert.equal(m.target({x:1,y}).id,chosen);Object.assign(m.players[3],{x:150,y:470,down:0});assert.equal(m.target({x:-1,y:0}).id,3);});
test('defense chooses cover ahead of a fast carrier instead of the closer beaten chaser',()=>{for(const dir of [-1,1]){const m=setup(1);m.attackDir=-dir;m.carrier.vy=dir*80;Object.assign(m.players[0],{x:240,y:440-dir*28,down:0});Object.assign(m.players[1],{x:248,y:440+dir*65,down:0});m.selected=0;assert.equal(m.bestDefender().id,1);m.pass();assert.equal(m.selected,1);const pos={x:m.controlled.x,y:m.controlled.y};m.pass();assert.equal(m.selected,1);assert.deepEqual({x:m.controlled.x,y:m.controlled.y},pos);}});
test('switch skips grounded and diving defenders; no eligible player is safe',()=>{const m=setup(1);Object.assign(m.players[0],{x:245,y:440,down:0,dive:.2});Object.assign(m.players[1],{x:270,y:440,down:0});m.selected=0;assert.equal(m.bestDefender().id,1);m.players[1].down=1;assert.equal(m.bestDefender(),null);m.pass();assert.equal(m.selected,0);});
test('switch uses the receiving opponent while an opposition pass is airborne',()=>{const m=setup(1);Object.assign(m.players[8],{x:80,y:410,down:0});Object.assign(m.players[0],{x:230,y:440,down:0});Object.assign(m.players[1],{x:85,y:400,down:0});m.selected=0;assert.ok(m.throwBall(m.players[8]));m.pass();assert.equal(m.selected,1);});
