import assert from 'node:assert/strict';
import esbuild from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'iq-cert-token-'));
try {
 const file=path.join(temporary,'test.cjs');
 await esbuild.build({stdin:{contents:`export * from './src/engine/payload'; export * from './src/shared/token';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:file});
 const m=createRequire(import.meta.url)(file);
 const reference={model:'n20261015a',kind:'age-adjusted',mode:'complete',sampleSize:2993,period:['2026-09-26','2026-10-11'],percentile:88.5,ageGroup:'18_34',ageSampleSize:1456,gender:'woman'};
 const data={score:118,date:'2026.10.15',attemptId:'12345678-1234-1234-1234-123456789012',dimensions:[70,65,80,72,60,75,82],lang:'en',reference,verifyBaseUrl:'https://qe2.arealme.com/iq/cert-preview.20261015a/index.html?d='};
 for(const publish of [false,true]) {
  const built=await m.buildCertificatePayload({...data,publishAgeGroup:publish},'QA TEST');
  const decoded=await m.decodeCertificateToken(built.token);
  assert.equal(decoded.valid,true);assert.equal(decoded.payload.v,4);
  assert.equal(decoded.payload.r.ageGroup,publish?'18_34':undefined);
  assert.equal(decoded.payload.r.ageSampleSize,undefined);assert.equal(decoded.payload.r.gender,undefined);
  assert.equal(built.verifyUrl.endsWith('?d='+built.token),true);
  const bytes=m.base64UrlToBytes(built.token);bytes[1]=119;
  assert.equal((await m.decodeCertificateToken(m.bytesToBase64Url(bytes))).valid,false);
  assert.equal((await m.decodeCertificateToken(built.token.slice(0,-5))).valid,false);
 }
 const old=await m.buildCertificatePayload({...data,reference:undefined},'QA TEST');
 const legacy=await m.decodeCertificateToken(old.token);assert.equal(legacy.valid,true);assert.equal(legacy.payload.v,3);assert.equal(legacy.payload.r,undefined);assert.equal(legacy.payload.s,118);
 const oldJson={id:'legacy',n:'QA',s:118,d:'2026.10.15',m:[70,70,70,70,70,70,70],l:'en',v:2};
 oldJson.sig=await m.computeSignature(oldJson);
 assert.equal((await m.decodeCertificateToken(m.base64UrlEncode(JSON.stringify(oldJson)))).valid,true);
 assert.equal((await m.decodeCertificateToken(m.base64UrlEncode(JSON.stringify({...oldJson,r:reference})))).valid,false);
 console.log('PASS certificate v4: private default, explicit public age, field whitelist, checksum, truncation, v3 compatibility');
} finally {await fs.rm(temporary,{recursive:true,force:true});}
