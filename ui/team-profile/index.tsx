import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Pattern} from './pattern';
import {Notifications} from './notifications';
import {ProjectSettings} from './project-settings';

function mountComponent(host:HTMLElement,Component:React.ComponentType<any>,onError?:()=>void){
 const shadow=host.attachShadow({mode:'open'});
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/brand/reui/team-profile.css?v=36549';
 const frame=document.createElement('div');frame.className='style-nova';
 const content=document.createElement('div'),portals=document.createElement('div');portals.className='reui-portals';frame.append(content,portals);
 shadow.append(sheet,frame);host.style.visibility='hidden';sheet.addEventListener('load',()=>{host.style.visibility='';host.dataset.reuiReady='true';});
 sheet.addEventListener('error',()=>onError?.());
 const root=createRoot(content,{onUncaughtError:()=>{console.warn('Perfil ReUI no disponible; se recupera el menú anterior.');onError?.();}});
 const theme=()=>{const dark=document.body.classList.contains('dark');host.classList.toggle('dark',dark);frame.classList.toggle('dark',dark);};
 const observer=new MutationObserver(theme);observer.observe(document.body,{attributes:true,attributeFilter:['class']});theme();
 return {update(props:any){flushSync(()=>root.render(<Component {...props} container={portals}/>));},unmount(){observer.disconnect();flushSync(()=>root.unmount());}};
}
export function mount(host:HTMLElement,onError?:()=>void){return mountComponent(host,Pattern,onError);}
export function mountNotifications(host:HTMLElement,onError?:()=>void){return mountComponent(host,Notifications,onError);}
export function mountProjectSettings(host:HTMLElement,onError?:()=>void){return mountComponent(host,ProjectSettings,onError);}
