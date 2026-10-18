import {useCalendarPortal} from './portal';
import {DropdownMenuContent as Original} from '../vendor/reui/dropdown-menu';
export * from '../vendor/reui/dropdown-menu';
export function DropdownMenuContent(props:any){return <Original {...props} container={useCalendarPortal()}/>;}
