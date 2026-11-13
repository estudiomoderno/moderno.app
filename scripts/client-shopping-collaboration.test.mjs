import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../app/client-portal-site.js',import.meta.url),'utf8');
function fixture(){
 const c={state:{portalAnon:'token-ficticio'},cliModeOf:room=>room.cliMode,fmt:value=>value+' EUR',fileImageAttrs:()=>'',crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'}};
 vm.createContext(c);vm.runInContext(source+';globalThis.portal=ClientPortalSite;',c);return c;
}
function project(enabled=false){return {id:1,clientShoppingCollaboration:enabled,rooms:[{id:2,name:'Salón',cliMode:'ver',sections:[{name:'General',items:[]}]}]};}

test('client add-product controls are disabled by default and require a portal session',()=>{
 const c=fixture(),p=project();assert.doesNotMatch(c.portal.shoppingHTML(p),/Añadir producto/);
 p.clientShoppingCollaboration=true;assert.match(c.portal.shoppingHTML(p),/data-room="2"[^>]*>\+ Añadir producto/);
 c.state.portalAnon='';assert.doesNotMatch(c.portal.shoppingHTML(p),/Añadir producto/);
});

test('client form submits only public product fields to the dedicated RPC',async()=>{
 const c=fixture(),p=project(true),calls=[];c.state.projects=[p];c.toast=()=>{};c.portalAnonBoot=()=>{};c.closeModal=()=>{};
 const controls={project:{value:'1'},room:{value:'2'},operation:{value:'00000000-0000-4000-8000-000000000001'},section:{selectedOptions:[{value:'0',dataset:{name:'General'}}]},name:{value:'Silla'},url:{value:'https://example.invalid/silla'},supplier:{value:'Tienda'},sku:{value:'REF'},price:{value:'25'},qty:{value:'2'},unit:{value:'ud'},dims:{value:''},material:{value:'Roble'},color:{value:'Natural'},plazo:{value:'2 semanas'}};
 const button={disabled:false,textContent:'Añadir producto'},error={textContent:''},form={isConnected:true,elements:controls,querySelector:selector=>selector==='[type=submit]'?button:error};
 c.sb={rpc:async(name,args)=>{calls.push({name,args});return {data:{created:true},error:null};}};await c.portal.saveProduct(form);
 assert.equal(calls[0].name,'portal_cliente_producto_anadir');assert.deepEqual(Object.keys(calls[0].args.p_producto),['name','url','supplier','sku','price','qty','unit','dims','material','color','plazo']);
 for(const forbidden of ['cost','margin','files','permissions','order'])assert.equal(calls[0].args.p_producto[forbidden],undefined);
});

test('SQL contract only appends to an authorized shared list and rejects private fields',()=>{
 const sql=fs.readFileSync(new URL('../SQL/portal-colaboracion-compras.sql',import.meta.url),'utf8');
 assert.match(sql,/clientShoppingCollaboration/);assert.match(sql,/entry\.value->>'cliMode' is distinct from 'off'/);assert.match(sql,/key not in \('name','url','supplier','sku','price','qty','unit','dims','material','color','plazo'\)/);
 assert.match(sql,/\(block#>path\)\|\|jsonb_build_array\(item\)/);assert.match(sql,/clientAdded',true/);assert.match(sql,/grant execute on function public\.portal_cliente_producto_anadir[^;]+to anon,authenticated/);
 assert.doesNotMatch(sql,/grant execute on function public\.portal_cliente_producto_anadir[^;]+to public/);
});
