#!/usr/bin/env node
// Read-only catalog. It NEVER launches any engine or modifies a project.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const c=JSON.parse(fs.readFileSync(path.join(here,'research-catalog.json'),'utf8'));
const cmd=process.argv[2]||'help';
if(cmd==='catalog'){for(const e of c.engines)console.log(e.id.padEnd(15)+e.status.padEnd(17)+e.license.padEnd(18)+e.adapterRoute);console.log('Research candidates only. No engine adapters are currently qualified.');}
else if(cmd==='json')console.log(JSON.stringify(c,null,2));
else if(cmd==='help')console.log('Nomadic Game Studio (read-only research catalog): node studio/cli.mjs catalog | json');
else {console.error('UNKNOWN_COMMAND');process.exitCode=2;}
