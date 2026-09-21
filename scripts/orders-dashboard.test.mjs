import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../app/orders-dashboard.js',import.meta.url),'utf8'),context);
const api=context.OrdersDashboard;
test('orders dashboard only counts actual live order records',()=>{
 const rows=[{tipo:'pedido',estado:'borrador'},{tipo:'pedido',estado:'confirmado'},{tipo:'pedido',estado:'parcial'},{tipo:'pedido',estado:'recibido'},{tipo:'pedido',estado:'cancelada'},{tipo:'aprobacion',estado:'aprobada'},{tipo:'solicitud',estado:'preparada'},{status:'Instalado'}];
 assert.equal(api.project(rows).length,4);
 assert.deepEqual(Array.from(api.project(rows),api.stage),['prepare','ordered','ordered','received']);
});
