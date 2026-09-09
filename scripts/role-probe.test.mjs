import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const sql=execFileSync(process.execPath,[fileURLToPath(new URL('./build-role-probe.mjs',import.meta.url))],{encoding:'utf8'});
test('the generated probe preserves SQL dollar quoting verbatim',()=>{const fixture=fs.readFileSync(new URL('./sql/calendario-integracion.sql',import.meta.url),'utf8');assert.ok(sql.includes(fixture));assert.match(sql,/do \$\$ declare ok/);});
test('the generated probe cannot commit a candidate migration',()=>{assert.match(sql,/^begin;/);assert.doesNotMatch(sql,/^commit;\s*$/m);assert.match(sql,/rollback;\s*$/);});
