"""Actual task modal, mock RPC and synthetic identities; no external network."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
repo=Path(__file__).resolve().parents[1];source=(repo/'app/index.html').read_text()
def function(name):
 s=re.search(r'^function '+name+r'\(',source,re.M).start();e=re.search(r'^function ',source[s+1:],re.M);return source[s:s+1+e.start()]
fixture="""window.state={sessionUser:{id:'me',mail:'me@example.invalid'},users:[{name:'Ghost'}],_invs:[{email:'invited@example.invalid'}],projects:[{id:1,tasks:[{id:11,title:'Tarea ficticia',col:'pend',type:'Diseño',assignees:['Historical']}]}]};window.ESTUDIO_ID='fictitious-study';window._accessRole='admin';window._accessLoading=false;window.tk=null;window.modal=s=>document.querySelector('#modalBox').innerHTML=s;window.ensureTaskIds=()=>{};window.KCOLS=[['pend','Pendiente']];window.meName=()=> 'Me';window.meMail=()=> 'me@example.invalid';window.ico=()=>'';window.pills=()=>{};window.tkDrawSubs=()=>{};window.tkDrawFiles=()=>{};window.tkDrawComments=()=>{};window.toast=()=>{};window.sb={rpc:(name,args)=>new Promise(r=>window.finish=()=>r({data:[{id:'verified',email:'verified@example.invalid',name:'Verified user'}]}))};"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [1280,390]:
  page=b.new_page(viewport={'width':width,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/*',lambda r:r.abort());page.set_content('<div id="modalBox"></div>');page.add_script_tag(content=fixture)
  for name in ['taskAssignees','taskSetAssignees','tkToggleWho','taskModal']:page.add_script_tag(content=function(name))
  page.add_script_tag(path=str(repo/'app/task-members.js'));page.evaluate('original=JSON.stringify(state.projects);taskModal(1,0)')
  assert page.get_by_role('button',name='Ghost',exact=True).count()==0
  assert page.get_by_role('button',name='Historical · asignación anterior',exact=True).count()==1
  page.locator('#tkTitle').fill('Borrador conservado');page.evaluate('finish()');page.wait_for_function("TaskMembers.has('Verified user')")
  assert page.locator('#tkTitle').input_value()=='Borrador conservado'
  assert page.get_by_role('button',name='Ghost',exact=True).count()==0
  page.get_by_role('button',name='Verified user',exact=True).click();assert page.evaluate('state._tk.assignees')==['Historical','Verified user']
  page.get_by_role('button',name=re.compile('^Historical · asignación anterior')).click();assert page.evaluate('state._tk.assignees')==['Verified user']
  page.evaluate("tkToggleWho({dataset:{who:'Ghost'}})");assert page.evaluate('state._tk.assignees')==['Verified user']
  assert page.evaluate('JSON.stringify(state.projects)===original');assert not errors,errors
  print(width,'PASS: real modal shows only verified choices, preserves drafts and historical assignments, rejects phantom additions, original task intact')
  page.close()
 b.close()
