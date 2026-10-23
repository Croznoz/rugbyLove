// Arcade identities, not real-world rankings. No nation modifies ordinary running.
const base={recovery:1,charge:1,pass:1,kick:1,agility:1,tackle:1,scrum:1};
function nation(id,name,short,style,detail,colors,stats){
  const [body,light,shade,trim,shorts]=colors;
  return Object.freeze({id,name,short,style,detail,stats:Object.freeze({...base,...stats}),kit:Object.freeze({body,light,shade,trim,shorts,shortLight:trim,shortShade:shade,socks:body,sockLight:light,number:'#fff4cc',patch:'#21383d'})});
}
export const NATIONS=Object.freeze([
  nation('ita','ITALIA','ITA','RESISTENZA','Recupero +6% · Sfondamento −6%',['#386d87','#6195a4','#295267','#f5ecc7','#eee5b9'],{recovery:1.06,charge:.94}),
  nation('fra','FRANCIA','FRA','ATTACCO','Sfondamento +6% · Recupero −6%',['#374f78','#60769b','#293b5a','#e6cbb0','#eee5cf'],{charge:1.06,recovery:.94}),
  nation('irl','IRLANDA','IRL','PASSAGGI','Passaggi +6% · Sfondamento −6%',['#327258','#5b9576','#25513f','#f1dfb5','#eee5cf'],{pass:1.06,charge:.94}),
  nation('eng','INGHILTERRA','ENG','TERRITORIO','Calci e mischia +4% · Schivata −8%',['#eee6ce','#fff6e3','#bbb5a1','#a76050','#344653'],{kick:1.04,scrum:1.04,agility:.92}),
  nation('sco','SCOZIA','SCO','AGILITÀ','Schivata +6% · Placcaggio −6%',['#343d56','#626d87','#252f44','#c7ac83','#eee5cf'],{agility:1.06,tackle:.94}),
  nation('wal','GALLES','WAL','DIFESA','Placcaggio +6% · Calci −6%',['#a65148','#c77b67','#783c37','#eddbba','#eee5cf'],{tackle:1.06,kick:.94})
]);
export const getNation=id=>NATIONS.find(n=>n.id===id)||NATIONS[0];
export function teamPair(home='ita',away='irl'){
  const a=getNation(home);let b=getNation(away);
  if(a===b)b=NATIONS.find(n=>n!==a);
  return [a,b];
}
const changeKit=Object.freeze({...NATIONS[3].kit,trim:'#6b776e',shorts:'#344653'});
export function matchKits(teams){
  // France, Italy and Scotland share blue hues: the CPU wears ivory in these pairings.
  const blue=new Set(['ita','fra','sco']);
  return [teams[0].kit,blue.has(teams[0].id)&&blue.has(teams[1].id)?changeKit:teams[1].kit];
}
