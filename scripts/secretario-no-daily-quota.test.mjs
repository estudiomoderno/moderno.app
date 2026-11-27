import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {buildSecretaryRuntimeChecks} from './build-secretary-runtime-checks.mjs';

const read=file=>fs.readFileSync(new URL(file,import.meta.url),'utf8');
const functionBody=sql=>sql.match(/as \$fn\$([\s\S]*?)\$fn\$;/)?.[1]??'';
const hash=sql=>createHash('md5').update(functionBody(sql)).digest('hex');

test('no-daily migration pins both predecessors and removes only the daily rejection',()=>{
 const migration=read('../SQL/secretario-sin-cuota-diaria.sql');
 const rollback=read('../SQL/secretario-sin-cuota-diaria.rollback.sql');
 const legacy=read('./fixtures/secretario-runtime-20.sql');
 const current=read('../SQL/secretario-runtime.sql');
 const forwardBody=functionBody(migration),rollbackBody=functionBody(rollback);
 assert.ok(migration.includes(`'${hash(legacy)}'`));
 assert.ok(migration.includes(`'${hash(current)}'`));
 assert.ok(rollback.includes(`'${hash(migration)}'`));
 assert.ok(migration.includes(`md5(candidate.prosrc)<>'${hash(migration)}'`));
 assert.ok(rollback.includes(`md5(candidate.prosrc)<>'${hash(rollback)}'`));
 assert.doesNotMatch(forwardBody,/used_user_day|Límite diario del Secretario alcanzado/);
 assert.match(forwardBody,/if used_month>=200/);
 assert.match(forwardBody,/if used_global_month>=200/);
 assert.match(forwardBody,/where moderno_secretary\.usage_daily\.requests<200/);
 assert.match(forwardBody,/'daily_remaining',null/);
 assert.match(rollbackBody,/if used_user_day>=20/);
 assert.match(rollbackBody,/if used_month>=200/);
 assert.match(rollbackBody,/if used_global_month>=200/);
 assert.match(rollbackBody,/where moderno_secretary\.usage_daily\.requests<200/);
 for(const sql of [migration,rollback])assert.doesNotMatch(sql,/\b(?:delete\s+from|truncate|drop\s+table)\s+moderno_secretary\.usage_daily\b/i);
});

test('generated PostgreSQL 17 fixture covers 20 and 100 predecessors, monthly 200, permissions and rollback',()=>{
 const sql=buildSecretaryRuntimeChecks();
 for(const expected of [
  '20: reservation 21 is accepted without a daily remainder',
  '100: reservation 101 is accepted without a daily remainder',
  '20: same-day reservation 200 reaches both monthly ceilings exactly',
  '100: same-day reservation 201 is blocked by the global monthly ceiling',
  '20: forward preserves every existing counter',
  '100: forward preserves owner ACL and function contract',
  '20: rollback blocks daily reservation 21',
  '100: rollback preserves all historical counters'
 ])assert.ok(sql.includes(expected),expected);
 assert.match(sql,/position\('ifused_month>=200'/);
 assert.match(sql,/position\('ifused_global_month>=200'/);
 assert.match(sql,/count\(\*\)>=3 from pg_locks/);
 assert.match(sql,/not has_table_privilege\('authenticated','moderno_secretary\.usage_daily'/);
});
