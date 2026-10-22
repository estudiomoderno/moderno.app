import test from 'node:test';import assert from 'node:assert/strict';import {buildCollaboratorChecks} from './build-collaborator-checks.mjs';
test('collaborator fixture rejects real databases, reproduces the incident and rolls back by default',()=>{
 const sql=buildCollaboratorChecks();
 assert.match(sql,/Requires an empty isolated database/);
 assert.match(sql,/reproduces legacy shopping form permission failure/);
 assert.match(sql,/actual private cost preserved while public price changes/);
 assert.match(sql,/normalizer not a callable public RPC/);
 assert.match(sql,/El contrato de permisos ha cambiado/);
 assert.match(sql,/do \$\$declare e uuid/,'SQL dollar quoting survives assembly');
 assert.match(sql,/rollback;\s*$/);assert.doesNotMatch(sql,/^commit;\s*$/mi);
});
test('persistent browser fixture still requires empty isolated database and explicit option',()=>{
 const sql=buildCollaboratorChecks({persist:true});assert.match(sql,/commit;\s*$/);assert.match(sql,/Requires an empty isolated database/);
});
