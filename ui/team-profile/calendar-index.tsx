import {mountComponent} from './index';
import {CalendarPattern} from './calendar-pattern';
export function mount(host:HTMLElement,onError?:()=>void,onReady?:()=>void){return mountComponent(host,CalendarPattern,onError,onReady);}
