import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),phone=require('../app/phone-controls.js');
test('Spanish national and pasted international numbers use 3-2-2-2 without duplicate prefix',()=>{
 for(const value of ['609518398','+34609518398','0034 609 51 83 98']) assert.equal(phone.format(value,'ES'),'+34 609 51 83 98');
 assert.equal(phone.format('','ES'),'');
});
test('country defaults apply only when an existing international number does not specify one',()=>{
 assert.equal(phone.countryFor('','PT'),'PT');
 assert.equal(phone.countryFor('+33 6 12 34 56 78','ES'),'FR');
 assert.equal(phone.countryFor('0044 20 7946 0018','ES'),'GB');
 assert.equal(phone.format('020 7946 0018','GB'),'+44 20 7946 0018');
 assert.equal(phone.format('+39 02 12345678','ES'),'+39 02 1234 5678');
});
test('country changes replace only calling code and preserve blank fields and extensions',()=>{
 assert.equal(phone.changeCountry('+34 609 51 83 98','ES','PT'),'+351 609 518 398');
 assert.equal(phone.changeCountry('','ES','FR'),'');
 assert.match(phone.changeCountry('+34 912345678 ext. 123','ES','PT'),/912345678 ext\. 123$/);
});
test('legacy text and long numbers are never silently truncated',()=>{
 const legacy='Oficina 912345678 / 600123456';
 assert.equal(phone.format(legacy,'ES'),legacy);
 assert.equal(phone.changeCountry(legacy,'ES','PT'),legacy);
 const long='+349123456789012345';assert.equal(phone.format(long,'ES').replace(/\D/g,''),long.replace(/\D/g,''));
});
test('rendering preserves saved value, escapes attributes and supplies fiscal country',()=>{
 const html=phone.field('912 345 678',{España:'ES',Portugal:'PT'},'Portugal','id="test"');
 assert.match(html,/value="912 345 678"/);assert.match(html,/data-country="PT"/);
  assert.match(phone.field('" onfocus="evil',{España:'ES'},'España'),/value="&quot; onfocus=&quot;evil"/);
 assert.match(phone.field('+852 5123 4567',{España:'ES'},'España'),/value="HK" selected/);
});
