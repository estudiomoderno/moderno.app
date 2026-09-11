import test from 'node:test';import assert from 'node:assert/strict';
import {parseHttpResponse,denoRequestPinned} from '../supabase/functions/product-clipper/deno-transport.mjs';
test('HTTP parser rejects truncation, ambiguity, oversized chunks and executable encodings',()=>{
 const parse=s=>parseHttpResponse(Buffer.from(s),100);
 assert.equal(parse('HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\nabc').bytes.toString(),'abc');
 assert.equal(parse('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nabc\r\n0\r\n\r\n').bytes.toString(),'abc');
 for(const s of ['HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\nabc','HTTP/1.1 200 OK\r\nContent-Length: 3\r\nContent-Length: 3\r\n\r\nabc','HTTP/1.1 200 OK\r\nContent-Length: 3\r\nTransfer-Encoding: chunked\r\n\r\nabc','HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\nfffffff\r\nx','HTTP/1.1 200 OK\r\nContent-Encoding: gzip\r\n\r\nabc'])assert.throws(()=>parse(s));
});
test('Deno connection pins IP while TLS verifies original host and sends safe path',async()=>{
 let connect,tls,wire='',read=false,closed=0;const bytes=Buffer.from('HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok');
 const conn={close(){closed++;},async write(b){wire+=Buffer.from(b).toString();return b.length;},async read(b){if(read)return null;read=true;b.set(bytes);return bytes.length;}};
 const runtime={async connect(v){connect=v;return conn;},async startTls(c,v){assert.equal(c,conn);tls=v;return conn;}};
 const result=await denoRequestPinned(new URL('https://shop.example.com/item?v=2'),{address:'93.184.216.34',family:4},{maxBytes:100,signal:new AbortController().signal},runtime);
 assert.equal(connect.hostname,'93.184.216.34');assert.equal(tls.hostname,'shop.example.com');assert.deepEqual(tls.alpnProtocols,['http/1.1']);assert.match(wire,/GET \/item\?v=2 HTTP\/1.1/);assert.match(wire,/Host: shop.example.com/);assert.equal(result.bytes.toString(),'ok');assert.ok(closed>0);
});
