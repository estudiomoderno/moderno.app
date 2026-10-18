import {useCalendarPortal} from './portal';
import {PopoverContent as Original} from '../vendor/reui/popover';
export * from '../vendor/reui/popover';
export function PopoverContent(props:any){return <Original {...props} container={useCalendarPortal()}/>;}
