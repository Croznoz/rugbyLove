import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const files=readdirSync(new URL('tests/',root)).filter(n=>n.endsWith('.test.mjs')&&n!=='ui.test.mjs').sort().map(n=>'tests/'+n);
const result=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit'});
process.exit(result.status??1);
