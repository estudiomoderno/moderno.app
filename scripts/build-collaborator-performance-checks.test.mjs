import test from 'node:test';import assert from 'node:assert/strict';import {buildPerformanceChecks} from './build-collaborator-performance-checks.mjs';
test('optimized combiner fixture is isolated and rolls back all generated records by default',()=>{
 const sql=buildPerformanceChecks();assert.match(sql,/Requires an empty isolated database/);assert.match(sql,/rollback;\s*$/);assert.doesNotMatch(sql,/^commit;\s*$/mi);
 assert.match(sql,/same value or exception 1240/);assert.match(sql,/SQL null object contract/);assert.match(sql,/numeric IDs with equal scale/);
 assert.match(sql,/trusted-view helper internal only/);assert.match(sql,/large save keeps real private amounts/);
 assert.match(sql,/set local statement_timeout='8s'/);assert.match(sql,/El combinador ha cambiado/);
});
test('persistent browser setup still requires the empty isolated fixture',()=>{
 const sql=buildPerformanceChecks({persist:true});assert.match(sql,/commit;\s*$/);assert.match(sql,/Requires an empty isolated database/);
});
