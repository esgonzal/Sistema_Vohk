# Hikvision access-event audit — 10 September 2026

## Conclusion

The statement “DS-KV9503-WBE1 saves no access events whatsoever” is too broad and is not supported by the observed device behavior. This unit has no supported ISAPI searchable access-event history, but its notification stream returns earlier AccessControllerEvent messages, including records explicitly marked `currentEvent: false`.

This is evidence of retained/offline event data. It does not establish the storage medium, retention capacity, completeness, reboot persistence, or recoverability of successful PIN/face unlock history.

## Devices verified directly

| Check | 192.168.0.75 | 192.168.0.76 |
|---|---|---|
| Model | DS-KV9503-WBE1 | DS-K1T343MWX |
| Firmware | V2.3.13 build 250407 | V4.48.40 build 260629 |
| AcsEvent capabilities | HTTP 404, notSupport | HTTP 200 |
| AcsEventTotalNum capabilities | HTTP 404, notSupport | HTTP 200, maximum 150000 |
| POST AcsEvent history search | HTTP 400, notSupport | HTTP 200, 9700 total matches at initial check |
| AcsEvent/StorageCfg capabilities | HTTP 404, notSupport | HTTP 200 |
| Notification subscription capabilities | AccessControllerEvent supported | AccessControllerEvent supported |

Both history searches used the same condition: major 0, minor 0, position 0, maximum 5 results, reverse time order, no pictures, no time restriction. Device-info requests established working Digest authentication first. Thus the KV9503 result was an explicit unsupported-operation response, not an empty result caused by a narrow date filter or a general authentication failure.

The KV9503 AccessControl capability response omits isSupportAcsEvent and isSupportAcsEventTotalNum; it does not explicitly return these as false. The K1T343 advertises both as true. The negative endpoint responses independently corroborate the omission.

## Notification stream findings

GET /ISAPI/Event/notification/alertStream returned HTTP 200 and multipart/mixed data from the KV9503. AccessControllerEvent payloads are JSON; a parser looking only for XML eventType tags will miss them. The stream also carries binary images, which were not retained.

An initial afternoon sample returned majorEventType 5 / subEventType 76 (0x4c), corresponding to failed face authentication. It also returned unclassified 0/0 events with earlier timestamps. That initial sample was recorded in task tool output; its local filename was overwritten by a later sample before timestamped output names were introduced.

After reconnection in the evening, a 20-second sample returned older events in descending timestamp order. The following 60-second sample saved in 192.168.0.75-live-1789090694949.json contained 55 AccessControllerEvent messages explicitly marked currentEvent false. Their timestamps ranged from 18:37:04 to 16:46:00 while heartbeat timestamps ran from 21:37:14 to 21:38:13, all on the same device-reported date and offset. This establishes offline replay without relying on agreement between the PC and device clocks.

Those 55 messages contain only deviceName, majorEventType, subEventType, deviceNo and currentEvent. Their major/minor values are both zero. They cannot be safely labeled as successful door access, PIN use, or face use, nor attributed to a person.

The final 60-second capture, 192.168.0.75-live-1789090789710.json, returned 44 further unclassified offline messages and one identifiable failed face-authentication record: dateTime 2026-09-10T16:03:22-04:00, majorEventType 5, subEventType 76, currentEvent false. This arrived more than five hours later by the device's heartbeat clock. Its available field names also included employeeNoString and picturesNumber; their values and the image were not retained. Thus retained authentication-event data is directly demonstrated, not merely inferred from generic 0/0 messages. No successful face or PIN unlock was observed in the bounded samples.

The subscription capability list includes 0x4b (successful face authentication), 0x4c (failed face authentication), and 0xb5. Existing application code interprets decimal 181 (0xb5) as successful personal-PIN use for MinMoe; that interpretation has not been independently demonstrated on the KV9503. Do not treat capability declarations as proof of end-to-end successful PIN logging.

One repeated GET returned HTTP 404 and an explicit POST subscription attempt returned badAuthorization. Subsequent GET streams worked. These failures are not evidence that live notifications are unsupported, but connection/authentication handling needs verification before production use.

## Security audit uploads and droplet

The device's GET /ISAPI/System/logServer confirms uploads enabled to 167.71.250.26:514, transmission encryption disabled, interval 1, matching the supplied screenshot.

Read-only SSH inspection found rsyslog active on the droplet, but no TCP or UDP listener on port 514. The imudp/imtcp module and port-514 input lines in /etc/rsyslog.conf are commented out. Therefore the configured destination is not currently receiving logs through a normal host port-514 listener. This does not prove that no historical receiver ever existed.

POST /ISAPI/ContentMgmt/security/logSearch and POST /ISAPI/ContentMgmt/logSearch both returned notSupport on the KV9503. Their request format and paths were cross-checked against this firmware's own web-interface JavaScript. Security-log upload support must not be equated with searchable access history or assumed to include PIN/face access.

## Application implication

The local backend hard-codes supportsStoredAccessEvents false for KV9503 and skips it in accessEventSyncService. That is consistent with the unsupported AcsEvent API. No alertStream consumer was found in the searched backend source. A persistent live collector is a viable avenue to investigate for future access logging; simply enabling the K1T343 history poller for KV9503 will not solve this.

Validate successful PIN and face unlock payloads during a controlled office test before implementing method/user attribution. Determine offline replay behavior and loss/reconnection handling separately. The user is away from the devices, so this physical test was not performed.

## Limits and changes

No door was opened, user or credential changed, device rebooted, firmware upgraded, service restarted, database record written, or syslog configuration changed. Work added a local audit script and evidence files only. Reboot survival and maximum retention were deliberately not tested on operational access devices.

The device time endpoint reports an inconsistent offset relative to its event payloads. No time settings were changed. Use device-relative heartbeat comparisons for the replay evidence above.

## Manufacturer references

- KV9503 datasheet lists Event capacity as '/': https://us-legacy.hikvision.com/sites/default/files/data_sheet/ds-kv9503-wbe1_videointercomfacerecognitiondoor_datasheet_v1.0.pdf
- K1T343MWX datasheet lists 150,000 event capacity: https://assets.hikvision.com/prd/normal/all/doc/m000048812/DS-K1T343MWX_Datasheet_20260507.pdf
- Hikvision event-code definitions, including 0x4b and 0x4c: https://open.hikvision.com/hardware/structures/NET_DVR_ACS_ALARM_INFO.html

Manufacturer specification tables describe supported product features; they cannot override direct evidence of offline message replay or establish undocumented retention behavior.
