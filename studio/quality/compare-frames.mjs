#!/usr/bin/env node
/** CLI for evidence-only frame comparison; no generated result implies that art improved.
 * Usage:
 *   node compare-frames.mjs BEFORE.png BEFORE.capture.json AFTER.png AFTER.capture.json
 * Produces JSON on stdout and exits 2 for untrusted/incomparable frames.
 */
import {readFile} from 'node:fs/promises';
import {compareVisualEvidence} from './visual-gate.mjs';
const args=process.argv.slice(2);
if(args.length!==4){
 console.error('Usage: node compare-frames.mjs BEFORE.png BEFORE.capture.json AFTER.png AFTER.capture.json');
 process.exitCode=64;
}else{
 try{
  const [beforePng,rawBefore,afterPng,rawAfter]=await Promise.all(args.map(p=>readFile(p)));
  const before=JSON.parse(rawBefore.toString('utf8')),after=JSON.parse(rawAfter.toString('utf8'));
  const result=compareVisualEvidence({beforePng,afterPng,before,after});
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(result.status==='BLOCKED_COMPARABILITY')process.exitCode=2;
 }catch(err){
  console.error(JSON.stringify({status:'ERROR',reason:String(err.message||err)}));
  process.exitCode=1;
 }
}
