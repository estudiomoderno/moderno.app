import {useCalendarPortal} from './portal';
import {TooltipContent as Original} from '../vendor/reui/tooltip';
export * from '../vendor/reui/tooltip';
export function TooltipContent(props:any){return <Original {...props} container={useCalendarPortal()}/>;}
