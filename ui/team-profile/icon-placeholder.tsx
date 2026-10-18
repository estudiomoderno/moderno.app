import {CheckIcon,ChevronRightIcon,ChevronsUpDownIcon,XIcon} from 'lucide-react';
// The original registry supports several icon libraries. This example selects Lucide.
export function IconPlaceholder({lucide,className}:any){const Icon=({CheckIcon,ChevronRightIcon,ChevronsUpDownIcon,XIcon} as any)[lucide]||CheckIcon;return <Icon aria-hidden="true" className={className}/>;}
