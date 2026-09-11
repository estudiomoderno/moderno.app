(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./phone-vendor.js'):root.libphonenumber);
  if(typeof module==='object'&&module.exports) module.exports=api; else root.ModernoPhone=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(lib){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const supported=c=>lib.isSupportedCountry(c)?c:'ES';
  function parse(value,country){try{return lib.parsePhoneNumberFromString(String(value).replace(/^00/,'+'),supported(country));}catch{return undefined;}}
  function countryFor(value,fallback){
    const v=String(value||'').trim();
    if(/^(\+|00)/.test(v)){const p=parse(v,fallback);if(p?.country)return p.country;
      const a=new lib.AsYouType();a.input(v.replace(/^00/,'+'));if(a.getCountry())return a.getCountry();
      const code=a.getCallingCode();if(code){if(lib.getCountryCallingCode(supported(fallback))===code)return supported(fallback);return lib.getCountries().find(c=>lib.getCountryCallingCode(c)===code)||supported(fallback);}}
    return supported(fallback);
  }
  function format(value,country){
    const v=String(value||'').trim();if(!v)return '';
    country=supported(country);
    // Preserve extensions and unsupported legacy text rather than silently dropping information.
    if(/[^\d\s()+.\-]/.test(v)){const p=parse(v,country);return p?.ext?p.formatInternational():v;}
    const international=/^(\+|00)/.test(v), p=parse(v,country);
    const code=lib.getCountryCallingCode(country);
    let result=p?p.formatInternational():new lib.AsYouType(country).input(international?v.replace(/^00/,'+'):'+'+code+v.replace(/\D/g,''));
    const match=result.match(/^\+34\s*(.*)$/);
    if(match){const digits=match[1].replace(/\D/g,'');if(digits.length<=9)result='+34'+(digits?' '+[digits.slice(0,3),digits.slice(3,5),digits.slice(5,7),digits.slice(7,9)].filter(Boolean).join(' '):'');}
    return result;
  }
  function changeCountry(value,from,to){
    if(!String(value||'').trim())return '';
    const p=parse(value,from);
    if(p?.ext)return '+'+lib.getCountryCallingCode(to)+' '+p.nationalNumber+' ext. '+p.ext;
    if(/[^\d\s()+.\-]/.test(value))return value;
    let digits=p?.nationalNumber;
    if(!digits){digits=String(value).replace(/\D/g,'');if(/^(\+|00)/.test(value)){if(value.startsWith('00'))digits=digits.slice(2);const old=lib.getCountryCallingCode(from);if(digits.startsWith(old))digits=digits.slice(old.length);}}
    return format('+'+lib.getCountryCallingCode(to)+digits,to);
  }
  function field(value,countries,fiscalCountry,attrs=''){
    const country=countryFor(value,countries[fiscalCountry]||'ES');
    const options=Object.entries(countries).filter(([,iso])=>lib.isSupportedCountry(iso)).map(([name,iso])=>`<option value="${iso}" ${iso===country?'selected':''}>${esc(name)} (+${lib.getCountryCallingCode(iso)})</option>`).join('');
    return `<span class="phone-control" data-country="${country}"><span class="phone-country"><img alt="" src="/phone-flags/${country.toLowerCase()}.svg"><select aria-label="País y prefijo del teléfono" onchange="ModernoPhone.select(this)">${options}</select></span><input type="tel" inputmode="tel" autocomplete="tel" aria-label="Número de teléfono" ${attrs} value="${esc(value)}" placeholder="+${lib.getCountryCallingCode(country)}" oninput="ModernoPhone.edit(this)"></span>`;
  }
  function sync(box,country){box.dataset.country=country;box.querySelector('select').value=country;box.querySelector('img').src='/phone-flags/'+country.toLowerCase()+'.svg';box.querySelector('input').placeholder='+'+lib.getCountryCallingCode(country);}
  function edit(input){
    const box=input.closest('.phone-control');if(!box||input.readOnly||input.disabled)return;
    const old=input.value, pos=input.selectionStart, atEnd=pos===old.length;
    const digitsBefore=old.slice(0,pos).replace(/\D/g,'').length;
    const country=countryFor(old,box.dataset.country);sync(box,country);input.value=format(old,country);
    if(atEnd)input.setSelectionRange(input.value.length,input.value.length);
    else {let i=0,n=0;while(i<input.value.length&&n<digitsBefore){if(/\d/.test(input.value[i]))n++;i++;}input.setSelectionRange(i,i);}
  }
  function select(select){const box=select.closest('.phone-control'),input=box.querySelector('input');if(input.readOnly||input.disabled){select.value=box.dataset.country;return;}const next=select.value;input.value=changeCountry(input.value,box.dataset.country,next);sync(box,next);input.dispatchEvent(new Event('change',{bubbles:true}));input.focus();}
  return {format,countryFor,changeCountry,field,edit,select};
});
