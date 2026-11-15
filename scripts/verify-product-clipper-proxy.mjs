const fakeJwt='eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.'+'x'.repeat(15870)+'.'+'y'.repeat(86);
const response=await fetch('https://app.moderno.app/api/product-clipper.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session64:Buffer.from(fakeJwt).toString('base64'),payload:{action:'read',id:'11111111-1111-4111-8111-111111111111'}}),cache:'no-store'});
let data;try{data=await response.json();}catch{throw Error(`El puente devolvió una respuesta no JSON (${response.status})`);}
if(response.status!==401||typeof data?.error!=='string')throw Error(`El puente no alcanzó la validación del importador (${response.status})`);
console.log('Puente del importador verificado: sesión ficticia rechazada por el backend.');
