// Run from backend (also usable over SSH stdin). No activity writes or pictures saved.
require('dotenv').config({ quiet: true });
const base = process.cwd();
const pool = require(base + '/database/db');
const { getAdapterForIntercom } = require(base + '/services/vohk_app/hikvision/adapterFactory');
const { jsonEventParts } = require(base + '/services/vohk_app/hikvision/eventStream');
(async () => {
 const devices = await require(base + '/repositories/accessEventRepository').findSyncableIntercoms(true);
 const device = devices.find(d => d.ip_address === '192.168.0.75');
 if (!device) throw new Error('Device not found');
 const adapter = await getAdapterForIntercom(device);
 const controller = new AbortController();
 const timeout = setTimeout(() => controller.abort(), 45000);
 let tail = Buffer.alloc(0), bytes = 0;
 const headers = new Set();
 try {
  const identity = await adapter.fetch('/ISAPI/System/deviceInfo', { signal: controller.signal }); await identity.text();
  const r = await adapter.fetch('/ISAPI/Event/notification/alertStream', { signal: controller.signal });
  console.log(JSON.stringify({status:r.status, contentType:r.headers.get('content-type')}));
  async function* chunks() {
   for await(const chunk of r.body){
    bytes += chunk.length; tail=Buffer.concat([tail,Buffer.from(chunk)]);
    for(const h of tail.toString('latin1').matchAll(/Content-Type:[^\r\n]+(?:\r?\n[^\r\n]+){0,4}/gi)) headers.add(h[0].slice(0,300).replace(/[^\x20-\x7E\r\n]/g,''));
    tail=Buffer.from(tail.subarray(Math.max(0,tail.length-4096))); yield chunk;
   }
  }
  for await(const m of jsonEventParts(chunks(),r.headers.get('content-type'))){
   const e=m.AccessControllerEvent||{};
   console.log(JSON.stringify({eventType:m.eventType,time:m.dateTime,major:e.majorEventType,minor:e.subEventType,currentEvent:e.currentEvent,unlockType:e.unlockType,fields:Object.keys(e)}));
  }
 } catch(e) {console.log(JSON.stringify({error:e.message,code:e.code,bytes,headers:[...headers]}));}
 finally {clearTimeout(timeout);controller.abort();await pool.end();}
})().catch(e=>{console.log(e.message);process.exit(1);});
