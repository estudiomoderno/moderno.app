/* Modal keyboard navigation never closes a draft on Escape or outside click. */
var ModernoDialog=(()=>{
 let returnTo=null;
 function open(box){const active=document.activeElement;if(!box.contains(active))returnTo=active;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',box.querySelector('h3,h2,h1')?.textContent||'Formulario');box.tabIndex=-1;box.focus({preventScroll:true});}
 function close(){if(returnTo?.isConnected)returnTo.focus({preventScroll:true});returnTo=null;}
 function trap(event,box){if(event.key!=='Tab')return;const items=[...box.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')].filter(e=>e.getClientRects().length);const first=items[0],last=items.at(-1),active=document.activeElement;if(!first){event.preventDefault();box.focus();return;}if(event.shiftKey&&(active===first||active===box||!box.contains(active))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(active===last||!box.contains(active))){event.preventDefault();first.focus();}}
 return {open,close,trap};
})();
if(typeof module!=='undefined')module.exports=ModernoDialog;
