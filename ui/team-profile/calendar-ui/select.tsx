import {useCalendarPortal} from './portal';
import {SelectContent as Original} from '../vendor/reui/select';
export * from '../vendor/reui/select';
export function SelectContent(props:any){return <Original {...props} container={useCalendarPortal()}/>;}
