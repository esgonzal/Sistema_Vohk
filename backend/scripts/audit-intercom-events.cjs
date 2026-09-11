// Read-only device audit: no door commands or configuration changes.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { Pool } = require('pg');
const out = path.resolve(__dirname, '../../artifacts/intercom-event-audit');
fs.mkdirSync(out, { recursive: true });
const pool = new Pool({host:process.env.DB_HOST,port:process.env.DB_PORT,database:process.env.DB_NAME,user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000});
function redact(s) { return s.replace(/<(serialNumber|macAddress|deviceID)>[^<]*<\//gi, '<$1>[redacted]</').replace(/"(name|employeeNoString|employeeNo|cardNo|userName|remoteHostAddr|pictureURL)"\s*:\s*("[^"]*"|\d+)/gi, '"$1":"[redacted]"'); }
(async()=>{
 const DigestFetch = (await import('digest-fetch')).default;
 const {rows} = await pool.query("SELECT model,ip_address,port,username,password_encrypted FROM device WHERE ip_address IN ('192.168.0.75','192.168.0.76')");
 await pool.end();
 for(const d of rows){
  const client = new DigestFetch(d.username,d.password_encrypted);
  const extra = process.argv.includes('--extended');
  const results=[];
  async function query(endpoint, body){
   const method=body?'POST':'GET';
   try { const r=await client.fetch(`http://${d.ip_address}:${d.port}${endpoint}`,{method,signal:AbortSignal.timeout(12000),headers:body?{'Content-Type':typeof body==='string'?'application/xml':'application/json'}:{},body:body?(typeof body==='string'?body:JSON.stringify(body)):undefined});
    const t=redact(await r.text()); results.push({endpoint,method,status:r.status,body:t});
    console.log(JSON.stringify({ip:d.ip_address,endpoint,status:r.status,body:t.length<1800?t:t.slice(0,400),length:t.length}));
   }catch(e){results.push({endpoint,error:e.message});console.log(d.ip_address,endpoint,e.message);}
  }
  await query('/ISAPI/System/deviceInfo');
  if(process.argv.includes('--live')){
   if(!d.ip_address.endsWith('.75'))continue;
   await query('/ISAPI/System/time');
   await query('/ISAPI/System/logServer');
   for(const subscribe of [false]){
    const endpoint=subscribe?'/ISAPI/Event/notification/subscribeEvent':'/ISAPI/Event/notification/alertStream';
    let buffer='',status,contentType,error; const start=Date.now();
    try{const r=await client.fetch(`http://${d.ip_address}:${d.port}${endpoint}`,{method:subscribe?'POST':'GET',headers:subscribe?{'Content-Type':'application/xml'}:{},body:subscribe?'<SubscribeEvent version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema"><heartbeat>5</heartbeat><eventMode>all</eventMode></SubscribeEvent>':undefined,signal:AbortSignal.timeout(60000)});status=r.status;contentType=r.headers.get('content-type');
     for await(const chunk of r.body){buffer+=Buffer.from(chunk).toString('utf8');if(buffer.length>8000000)break;}
    }catch(e){error=e.name;}
    const types=[...buffer.matchAll(/(?:<eventType>([^<]+)<\/eventType>|"eventType"\s*:\s*"([^"]+)")/g)].map(x=>x[1]||x[2]);
    const fields=[...buffer.matchAll(/"(majorEventType|subEventType|major|minor|dateTime|time|currentVerifyMode|eventState)"\s*:\s*("[^"\r\n]*"|\d+)/g)].map(x=>({field:x[1],value:x[2]}));
    const events=[];
    for(const part of buffer.split('--MIME_boundary')){
     if(!/Content-Type:\s*application\/json/i.test(part))continue;
     const first=part.indexOf('{'),last=part.lastIndexOf('}');if(first<0||last<first)continue;
     try{const obj=JSON.parse(part.slice(first,last+1));const ev=obj.AccessControllerEvent||{};
      const safe={dateTime:obj.dateTime,eventType:obj.eventType,eventState:obj.eventState,availableFields:Object.keys(ev)};
      for(const k of ['majorEventType','subEventType','inductiveEventType','currentVerifyMode','serialNo','doorNo','cardReaderNo','attendanceStatus','statusValue','eventDescription','remoteCheck','userType','currentEvent'])if(ev[k]!==undefined)safe[k]=ev[k];
      events.push(safe);
     }catch{}
    }
    const result={endpoint,status,contentType,durationMs:Date.now()-start,bytes:buffer.length,error,eventTypes:types,fields,events,errorBody:status!==200?redact(buffer):undefined};
    results.push(result);console.log(JSON.stringify({endpoint,status,bytes:buffer.length,events}));
   }
   fs.writeFileSync(path.join(out,d.ip_address+'-live-'+Date.now()+'.json'),JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));continue;
  }
  if(extra){
   await query('/ISAPI/AccessControl/AcsEvent/StorageCfg/capabilities?format=json');
   await query('/ISAPI/Event/notification/subscribeEventCap');
   await query('/ISAPI/Event/notification/httpHosts/capabilities');
   if(d.ip_address.endsWith('.75')) {
    const xml = `<?xml version="1.0" encoding="utf-8"?><CMSearchDescription xmlns="http://www.isapi.org/ver20/XMLScheme"><searchID>codex-security-audit</searchID><metaId>log.std-cgi.com</metaId><timeSpanList><timeSpan><startTime>2000-01-01T00:00:00Z</startTime><endTime>2037-12-31T23:59:59Z</endTime></timeSpan></timeSpanList><maxResults>100</maxResults><searchResultPostion>0</searchResultPostion></CMSearchDescription>`;
    await query('/ISAPI/ContentMgmt/security/logSearch',xml);
    await query('/ISAPI/ContentMgmt/logSearch',xml);
    const endpoint='/ISAPI/Event/notification/alertStream';
    const started=Date.now(); let buffer=''; let status;
    try {const r=await client.fetch(`http://${d.ip_address}:${d.port}${endpoint}`,{signal:AbortSignal.timeout(25000)});status=r.status;
     for await(const chunk of r.body){buffer+=Buffer.from(chunk).toString('utf8');if(buffer.length>100000)break;}
    }catch(e){console.log('Live stream finished:',e.name);}
    const types=[...buffer.matchAll(/(?:<eventType>([^<]+)<\/eventType>|"eventType"\s*:\s*"([^"]+)")/g)].map(x=>x[1]||x[2]);
    const fields=[...buffer.matchAll(/"(majorEventType|subEventType|major|minor|dateTime|time|currentVerifyMode|eventState)"\s*:\s*("[^"\r\n]*"|\d+)/g)].map(x=>({field:x[1],value:x[2]}));
    results.push({endpoint,status,durationMs:Date.now()-started,bytes:buffer.length,eventTypes:types,fields});
    console.log(JSON.stringify(results[results.length-1]));
   }
   fs.writeFileSync(path.join(out,d.ip_address+'-extended.json'),JSON.stringify({checkedAt:new Date().toISOString(),model:d.model,ip:d.ip_address,results},null,2));
   continue;
  }
  await query('/ISAPI/System/capabilities');
  await query('/ISAPI/AccessControl/capabilities');
  await query('/ISAPI/AccessControl/AcsEvent/capabilities?format=json');
  await query('/ISAPI/AccessControl/AcsEventTotalNum/capabilities?format=json');
  await query('/ISAPI/AccessControl/AcsEvent?format=json',{AcsEventCond:{searchID:'codex-readonly-audit',searchResultPosition:0,maxResults:5,major:0,minor:0,picEnable:false,timeReverseOrder:true}});
  await query('/ISAPI/VideoIntercom/capabilities');
  await query('/ISAPI/Event/capabilities');
  await query('/ISAPI/System/Log/capabilities');
  fs.writeFileSync(path.join(out,d.ip_address+'.json'),JSON.stringify({checkedAt:new Date().toISOString(),model:d.model,ip:d.ip_address,results},null,2));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;pool.end().catch(()=>{});});
