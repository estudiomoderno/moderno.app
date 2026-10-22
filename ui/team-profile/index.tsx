import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Pattern} from './pattern';
import {Notifications} from './notifications';
import {ProjectSettings} from './project-settings';
import {ProjectWindows} from './project-windows';
import {PageBreadcrumbs} from './page-breadcrumbs';
import {ShoppingDelete} from './shopping-delete';
import {ShoppingAdd} from './shopping-add';

export function mountComponent(host:HTMLElement,Component:React.ComponentType<any>,onError?:()=>void,onReady?:()=>void){
 const shadow=host.attachShadow({mode:'open'});
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/brand/reui/team-profile.css?v=365112';
 const frame=document.createElement('div');frame.className='style-nova';
 const content=document.createElement('div'),portals=document.createElement('div');portals.className='reui-portals';frame.append(content,portals);
 shadow.append(sheet,frame);host.style.visibility='hidden';sheet.addEventListener('load',()=>{host.style.visibility='';host.dataset.reuiReady='true';onReady?.();});
 sheet.addEventListener('error',()=>onError?.());
 const root=createRoot(content,{onUncaughtError:()=>{console.warn('Perfil ReUI no disponible; se recupera el menú anterior.');onError?.();}});
 const theme=()=>{const dark=document.body.classList.contains('dark');host.classList.toggle('dark',dark);frame.classList.toggle('dark',dark);};
 const observer=new MutationObserver(theme);observer.observe(document.body,{attributes:true,attributeFilter:['class']});theme();
 return {update(props:any){flushSync(()=>root.render(<Component {...props} container={portals}/>));},unmount(){observer.disconnect();flushSync(()=>root.unmount());}};
}
export function mount(host:HTMLElement,onError?:()=>void){return mountComponent(host,Pattern,onError);}
export function mountNotifications(host:HTMLElement,onError?:()=>void){return mountComponent(host,Notifications,onError);}
export function mountProjectSettings(host:HTMLElement,onError?:()=>void){return mountComponent(host,ProjectSettings,onError);}
export function mountProjectWindows(host:HTMLElement,onError?:()=>void,onReady?:()=>void){return mountComponent(host,ProjectWindows,onError,onReady);}

export function mountBreadcrumbs(host:HTMLElement,onError?:()=>void,onReady?:()=>void){return mountComponent(host,PageBreadcrumbs,onError,onReady);}
export function mountShoppingDelete(host:HTMLElement,onError?:()=>void,onReady?:()=>void){return mountComponent(host,ShoppingDelete,onError,onReady);}
export function mountShoppingAdd(host:HTMLElement,onError?:()=>void,onReady?:()=>void){return mountComponent(host,ShoppingAdd,onError,onReady);}
