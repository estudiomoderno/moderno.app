import {createContext,useContext} from 'react';
export const CalendarPortal=createContext<HTMLElement|undefined>(undefined);
export const useCalendarPortal=()=>useContext(CalendarPortal);
