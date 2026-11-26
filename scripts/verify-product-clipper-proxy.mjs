const fakeJwt='eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.'+'x'.repeat(15870)+'.'+'y'.repeat(86);
const session64=Buffer.from(fakeJwt).toString('base64');
const fixtureId='11111111-1111-4111-8111-111111111111';
for(const payload of [
 {action:'read',id:fixtureId},
 {action:'prices',studyId:fixtureId,projectId:'fixture-project',roomId:'fixture-room',ids:['fixture-product']}
]){
 const response=await fetch('https://app.moderno.app/api/product-clipper.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session64,payload}),cache:'no-store',signal:AbortSignal.timeout(15000)});
 let data;try{data=await response.json();}catch{throw Error(`El puente devolvió una respuesta no JSON para ${payload.action} (${response.status})`);}
 if(response.status!==401||typeof data?.error!=='string')throw Error(`El puente no alcanzó la validación del importador para ${payload.action} (${response.status})`);
}
console.log('El importador y la consulta de precios rechazaron la sesión ficticia antes de acceder a datos.');
