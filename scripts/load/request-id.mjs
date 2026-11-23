function hash32(text,seed){
  let value=seed>>>0;
  for(let i=0;i<text.length;i++){value^=text.charCodeAt(i);value=Math.imul(value,16777619);}
  return (value>>>0).toString(16).padStart(8,'0');
}

export function stableRequestUuid(runId,userId,kind,iteration){
  const source=`${runId}|${userId}|${kind}|${iteration}`;
  let raw=hash32(source,2166136261)+hash32(source,2246822519)+hash32(source,3266489917)+hash32(source,668265263);
  raw=raw.slice(0,12)+'4'+raw.slice(13);
  raw=raw.slice(0,16)+(((parseInt(raw[16],16)&3)|8).toString(16))+raw.slice(17);
  return `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20,32)}`;
}
