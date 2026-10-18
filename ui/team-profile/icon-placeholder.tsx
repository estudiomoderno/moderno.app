import {CheckIcon,ChevronRightIcon} from 'lucide-react';
// The original registry supports several icon libraries. This example selects Lucide.
export function IconPlaceholder({lucide,className}:any){const Icon=lucide==='ChevronRightIcon'?ChevronRightIcon:CheckIcon;return <Icon aria-hidden="true" className={className}/>;}
