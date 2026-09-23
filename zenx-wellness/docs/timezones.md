# Automatic local times

Calls, booking dates, call history and messages use the viewer's device IANA time
zone automatically. For example, a call at `2026-09-22T00:30:00Z` appears on
September 22 at 6:00 AM in India and September 21 at 8:30 PM in New York.
US offsets are calculated for the appointment date, including daylight saving.
The portal header and call cards label the zone. The device/OS zone must be correct.

After sign-in (including existing sessions), the app saves `detectedTimezone`
through the authenticated self-profile endpoint. Notifications and other-party
booking previews use that last-known zone. It is re-detected when the app regains
focus; there is no IP/location lookup. Other users cannot set this detected field.

`timezone` remains the home/working-hours zone. Travel does not change established
weekly availability or recurring schedules. On first detection only, a legacy UTC
default is initialized to the device zone. Legacy explicit UTC is indistinguishable
from the former unset default; an explicit zone supplied with detection wins, and
UTC saved after detection remains stable. Manual working-hours changes still use
the existing preferences/availability controls. Existing booked UTC instants and
calendar-only meal-plan dates are not rewritten.

## Deployment

Run the normal database migration before restarting the API. The only schema
addition for this change is:

```sql
ALTER TABLE users ADD COLUMN detected_timezone VARCHAR(64) NULL AFTER timezone;
```

The normal migrator skips duplicate columns. Do not run this raw statement twice.
Build/redeploy the client and restart the API so both use the new behavior. Existing
users can reload; no manual timezone entry is needed for local display.

Database connections now set the MySQL session time zone to `+00:00` as well as
using mysql2's UTC Date conversion. This prevents future database-generated message
timestamps from being misread as UTC when the database host uses local time.
Historical timestamps are not bulk-shifted: mixed past writers cannot safely be
corrected without auditing the affected rows first.

## Checks

```sh
# In client
node --test src/lib/timezone.test.js
npm run build
# In server
npm run test:unit
```

Regression cases cover India, New York, Chicago and Los Angeles; summer/winter,
previous-day rollover, the two fall-back offsets, viewer-local dashboard days,
first detection versus travel, account switching, and simultaneous profile edits.
