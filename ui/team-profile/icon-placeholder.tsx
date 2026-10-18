import {CheckIcon,ChevronRightIcon,ChevronsUpDownIcon,XIcon,ChevronLeftIcon,ChevronDownIcon,ChevronUpIcon,CalendarIcon,RepeatIcon} from 'lucide-react';
// The original registry supports several icon libraries. This example selects Lucide.
export function IconPlaceholder({lucide,className}:any){const Icon=({CheckIcon,ChevronRightIcon,ChevronsUpDownIcon,XIcon,ChevronLeftIcon,ChevronDownIcon,ChevronUpIcon,CalendarIcon,RepeatIcon} as any)[lucide]||CheckIcon;return <Icon aria-hidden="true" className={className}/>;}
