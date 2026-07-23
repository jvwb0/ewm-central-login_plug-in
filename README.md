# ewm central login (plug-in)
SAP UI5 FLP plug-in for centralized EWM login and session handling. Designed to share warehouse, work center, and resource data across applications.

## CURRENT STATUS (23-07-2026)

### Goal
Develop a production-ready SAP UI5 FLP plug-in for centralized EWM login and session management.

Purpose:
- Persist warehouse, work center and resource selections.
- Automatically restore user context.
- Provide centralized login across all FLP applications.
- Prevent warehouse workers/resources remaining logged in after PC crashes, browser closes or end of shift.
- APC/WebSocket notifies all open FLP sessions when login information changes.

---

## Backend Status

✔ Transparent table implemented
ZBRO_FIORI_USER

✔ CDS Views completed
- Interface Views
- Consumption Views
- Composite Views

✔ RAP Service Definition completed

✔ OData V4 Service Binding created

✔ Service successfully published

✔ APC Extension implemented

✔ WebSocket communication implemented

---

## Frontend Status

✔ SAPUI5 FLP Plug-in implemented

✔ Popover UI complete

✔ Warehouse / Workcenter / Resource loading works

✔ User preference persistence implemented

✔ EventBus integration implemented

✔ FLP Header integration implemented

✔ WebSocket client implemented

---

## Current Blocking Issue

The project currently only runs through the local Fiori Tools preview (localhost).

The plug-in has NOT yet been deployed into the ABAP repository and therefore has not yet been tested inside the real SAP Fiori Launchpad.

Because of this:

- WebSocket currently attempts to connect from localhost.
- Browser reports Cross-Origin / WebSocket related issues.
- It is currently unknown whether these issues disappear once running inside the real FLP (same origin).

Deployment is therefore the next major milestone before debugging any remaining runtime issues.

---

## Deployment Investigation

Current observations:

- Deployment Configuration Generator was executed.
- Deployment wizard completed successfully.
- Transport selected:
PKDK900634

However:

- VS Code does not detect any deployment configuration afterwards.
- "npm run deploy" reports:

No deployment configuration has been detected.

Possible cause:
Deployment configuration was never written into the project (ui5-deploy.yaml / package scripts missing or generator malfunction).

---

## Next Tasks

1. Verify deployment configuration files exist.
2. Successfully deploy UI5 plug-in into ABAP repository.
3. Open plug-in from the real SAP Fiori Launchpad.
4. Test WebSocket connection from deployed application.
5. Verify whether Cross-Origin issues disappear under same-origin execution.
6. Continue debugging only if issue still exists after deployment.

---

## Important Note

Do NOT continue investigating browser CORS/WebSocket errors before deployment.

Those errors may simply be caused by running the plug-in from localhost instead of the actual SAP Fiori Launchpad.

Deployment is currently the highest priority blocker.



## Application Details
|               |
| ------------- |
|**Generation Date and Time**<br>Mon Jul 06 2026 12:00:22 GMT+0200 (Central European Summer Time)|
|**App Generator**<br>SAP Fiori Application Generator|
|**App Generator Version**<br>1.20.0|
|**Generation Platform**<br>Visual Studio Code|
|**Template Used**<br>Basic|
|**Service Type**<br>None|
|**Service URL**<br>N/A|
|**Module Name**<br>brown.centralewmlogin|
|**Application Title**<br>EWM Central Login|
|**Namespace**<br>|
|**UI5 Theme**<br>sap_horizon|
|**UI5 Version**<br>1.149.1|
|**Enable Code Assist Libraries**<br>False|
|**Enable TypeScript**<br>True|
|**Add Eslint configuration**<br>False|

## brown.centralewmlogin

Central SAP Fiori Launchpad plug-in for EWM user context and session management.

### Starting the generated app

-   This app has been generated using the SAP Fiori tools - App Generator, as part of the SAP Fiori tools suite.  To launch the generated application, run the following from the generated application root folder:

```
    npm start
```

#### Pre-requisites:

1. Active NodeJS LTS (Long Term Support) version and associated supported NPM version.  (See https://nodejs.org)


