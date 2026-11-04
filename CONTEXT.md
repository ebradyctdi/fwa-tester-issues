# FWA Tester Issues — Project Context

## Overview
Web-based tool for CTDI's FWA (Fixed Wireless Access) operation to track tester equipment issues, device/product issues, cart management, pallet audits, and WNC repair pallet builds. Built with HTML/JS frontend + Google Sheets backend via Apps Script.

## Hosting
- **GitHub Pages:** https://ebradyctdi.github.io/fwa-tester-issues/
- **Repository:** https://github.com/ebradyctdi/fwa-tester-issues
- **Workspace:** `c:\Users\ebrady\OneDrive - Communications Test Design, Inc\Desktop\Kiro\FWA\Tester Issues\`

## Current Apps Script URL
```
https://script.google.com/macros/s/AKfycbwqr8dK4qLqn_To5f3fcn9yqoM6qciRVy9ukuaReGupogq8GAF53SriCLdy7oxND7Pgpg/exec
```

### Redeploy rule
After every Apps Script redeploy, replace the web app URL in ALL html files (including settings.html) and update the "Last updated" line on settings.html (currently **November 4, 2026**). Do not redeploy or change URLs unless the user asks.

### Left menu rule
Every page's left menu must be identical. Group order:
Tester Health | Non-Conforming Inventory | Audit Tools | WNC Repair Tools | System | X - Product/Device Issues
(Cart/Product-Device pages now live under "X - Product/Device Issues" at the bottom.)

## Google Sheet
- **Name:** FWA Data
- **URL:** https://docs.google.com/spreadsheets/d/1PPTCKPN3rqy5myeUny0lzy5bs4exb7KxyyU8nssQSNM/edit

### Tabs & Columns:
| Tab | Columns |
|-----|---------|
| Tester Issue Log | A-K (Reported By, Tester Type, Tester ID, Time of Issue, Severity, Issue Type, Issue Note, Resolved By, Time of Resolution, Resolution Note, Status) |
| FWA Testers | A-E (Tester ID, Tester Type, Status, Location, Notes) |
| FWA Tester Types | A (Tester Type) |
| Email Schedules | A-D (Email, Frequency, Time, Report Type) |
| Device Issues | A-I (IMEI, Serial Number, Cart, Device Model, Reported By, Note, Timestamp, Status, Resolution Timestamp) |
| Carts | A-G (Cart ID, Location, Cart Status, Date Created, Date Removed, Model Type, Note) |
| Device Location | A-G (Cart ID, IMEI, Serial Number, Device Model, Date Added, Date Removed, Status) |
| Cart - Standard Note | A (Note text) |
| Pallet Audits | A-ER: A-H headers (Pallet ID, Part Number, Audit Start Timestamp, # of IMEIs on Pallet, # of IMEIs Scanned During Audit, Audit Result, Audit Performed By, Notes), I-DX = IMEI Scan #1-120, DY-ER = Quality IMEI #1-20 |
| Pallet Audit Issues | A-I (Pallet ID, IMEI, Timestamp, Reported By, Issue, Status, Resolved By, Resolution Timestamp, Resolution Note) |
| Repair - Pallets | A-J (Pallet ID, Pallet PO #, SKU, Pallet Status, Pallet Open Date, Pallet Close Date, Ship To, Firmware Version, Ship Date, BOL). Pallet Status is Open / Closed / Shipped. |
| Repair - Pallet Build | A-F (Pallet ID, IMEI, Serial Number, Put to Pallet Date, Removed from Pallet Date, Status) |

### Additional tabs (added since the table above)
| Tab | Notes |
|-----|-------|
| Cycle Counts TXN | One row per unit transaction: IMEI, Serial, Device Model, Bin ID, Timestamp, User, Txn Type (default "At Bin"). A unit's location = its LATEST row; it is "in" a bin only if that latest row is "At Bin". |
| Cycle Count Bins | Bin ID, Description, Location, (blank), Creation Timestamp, Status (Active/Inactive), Bin Group. Only Active bins appear in dropdowns and scans. |
| Cycle Count History | Completed cycle count records |
| DD - Bin Groups | Bin group names (dropdown source) |
| Audit Locations | Audit location list |
| Repair - Ship To Addresses | Ship-to addresses for repair pallets |
| Pallet Audits (updated) | Column A is now Audit ID (AUD00000001 sequential), B Pallet ID, C Part Number, D Start Timestamp, E # IMEIs on Pallet, F # Scanned, G Result, H Performed By, I Notes, J Location, K Disposition..., then "# Units Audited" and IMEI scan columns. Verify exact column letters against google-apps-script.js (~lines 584-640) before changing anything. |

## Pages & Files

### Sidebar Navigation Structure (all pages share this)
```
▶ Tester Health
  - index.html (Overview)
  - report-issue.html (Report An Issue)
  - open-issues.html (Open Issues)
  - issue-history.html (Issue History)
▶ Non-Conforming Inventory
  - add-to-bin.html (Add/Remove Units to Bin)
  - bin-cycle-count.html (Bin Cycle Count)
  - bin-review.html (Bin Review)
  - unit-lookup.html (Unit Lookup)
  - wip-status-bins.html (WIP Status by Bins)
▶ Audit Tools
  - audit-dashboard.html (Audit Dashboard)
  - device-audit-review.html (Device Audit Review)
  - pallet-audit.html (Pallet Audit Tool)
  - pallet-issues.html (Open Pallet Issues)
  - pallet-audit-log.html (Audit Log)
▶ WNC Repair Tools
  - repaired-pallet-build.html (Repaired Pallet Build)
  - repair-pallet-label.html (Repair Pallet Label Re-Print)
  - repair-pallet-audit.html (Repair Pallet Audit)
▶ System
  - testers.html (Testers)
  - email-schedule.html (Email Schedule)
  - settings.html (Settings)
▶ X - Product/Device Issues
  - receipt-issues.html (Issue Logger)
  - receipt-history.html (Issue History)
  - receipt-carts.html (Carts)
  - cart-label.html (Cart Label Maker)
  - wip-status.html (WIP Status by Carts)
```

### Close-pallet duplicate check - added Nov 4, 2026 (frontend only)
- When closing a repair pallet, before confirming, the page checks each On-Pallet IMEI against all other repair pallets that are Closed or Shipped. If any were previously palletized, a warning modal lists IMEI/Serial, Previous Pallet, and Previous Add Date (most recent prior pallet per unit). User can Close Pallet Anyway or Cancel. Prior pallets still Open are ignored. Uses existing in-browser data (allPallets, allPalletBuildUnits); no backend change.

### Ship a repair pallet - added Nov 4, 2026 (NEEDS APPS SCRIPT REDEPLOY)
- Repair pallets now have a third status: Open / Closed / Shipped (Pallet Status, column D on Repair - Pallets).
- repaired-pallet-build.html Closed Pallets table shows both Closed and Shipped pallets, with a Status column (badge + BOL + ship date). "Print Label" and "Print IMEI Label" were merged into one "Print Labels" button that opens a chooser popup.
- Each closed (not yet shipped) pallet has a green "Ship Pallet" button. It opens a popup where the user enters a BOL # and clicks Ship. The backend sets Status="Shipped", Ship Date (column I) to now, and BOL (column J).
- Backend: new `shiprepairpallet` action (row + bol); `readrepairpallets` now reads 10 columns (adds Ship Date, BOL). Requires a redeploy of google-apps-script.js. No new URL needed if you edit the existing deployment.

### Repair Pallet Audit (repair-pallet-audit.html) - added Nov 4, 2026
- Menu: WNC Repair Tools > Repair Pallet Audit (after Repair Pallet Label Re-Print); added to the menu of all 24 pages.
- Copy of pallet-audit.html with a different load phase: scan an RPR pallet ID, and the manifest loads from `readrepairpallets` + `readrepairpalletbuild` (units with Status "On Pallet"). No part number / IMEI manifest scanning. Pallet must exist and be Closed.
- Audit scan accepts IMEI, unit QR code, or serial number (mapped to IMEI). Quality Check / IMEI Record modes, issues, PASS/FAIL, and label printing work as in the Pallet Audit Tool.
- Saves through the existing `logpalletaudit` / `logpalletauditissue` actions (no Apps Script change, no redeploy). Results appear in Audit Log, Audit Dashboard and Open Pallet Issues with RPR pallet IDs. Part Number is saved as the base part (e.g. WNC-CR200A) from the pallet SKU.
- Not yet tested against live data.

### Non-Conforming Inventory (bins)
- Units are located by their latest "At Bin" row in "Cycle Counts TXN". Moving/removing a unit writes a newer row.
- Only Active bins appear in dropdowns and scans. Bins are created/updated/retired via createcyclecountbin / updatecyclecountbin / retirecyclecountbin.
- add-to-bin.html: add/remove units to a bin (logcyclecount). bin-cycle-count.html: count a bin vs expected units (readbinexpectedunits, completebincyclecount). bin-review.html: review bins and their units (readbindetails, readbinunitcounts, readallbinunits). unit-lookup.html: transaction history for an IMEI/Serial (lookupunittransactions). wip-status-bins.html: WIP file cross-reference by bin.
- Bin groups managed with addbingroup / renamebingroup / deletebingroup / readbingroups.

### Audit Dashboard / Device Audit Review
- audit-dashboard.html: KPIs from Pallet Audits, including "By Unit - Units Audited" (sums the "# Units Audited" column).
- device-audit-review.html: per-device audit review.

## Open Issue (as of Nov 4, 2026)
Audit Dashboard "By Unit - Units Audited" KPI shows 357,473,879,073,521. It sums the "# Units Audited" column (user says column M) on Pallet Audits. The value looks like an IMEI, so one or more rows probably have a shifted/bad value in that column. Row not found yet. Planned: find and fix the row, and add a guard in audit-dashboard.html and device-audit-review.html that ignores implausible values and logs the Audit IDs. Note: a backfill function in google-apps-script.js (~line 1523) refers to "# Units Audited" as col L, so confirm the real column letter against the sheet header first.

### Supporting Files (not in nav)
| File | Purpose |
|------|---------|
| google-apps-script.js | Reference copy of all Apps Script actions |
| pallet-build-guidelines.html | Printable pallet build guidelines (8.5×11) |
| work-instruction-pallet-audit.html | Printable audit work instruction |
| work-instruction-issue-logger.html | Printable issue logger work instruction |

## Key Features

### Issue Logger (receipt-issues.html)
- Individual entry and batch scan modes
- Batch scan toggle: "Scan Values Individually" (IMEI + Serial) or "Scan QR Code"
- QR code parsing: extracts IMEI from `;E:(\d{15})`, Serial from `;S:(A[A-Za-z0-9]{10})`, Model from `M:(ASK-NCM1100|WNC-CR200A)`
- Device Model swappable during batch scan
- Fire-and-forget queue (no wait between scans)
- Delete removes from both Device Issues and Device Location sheets
- Cart note auto-fills issue note; standard notes dropdown
- Work instruction popup accessible from page

### Cart Management (receipt-carts.html)
- Create carts (sequential FWA-xxxx IDs, duplicate prevention)
- Cart ID filter, Show Inactive toggle
- Cart detail popup: edit location, model type, note; batch add/remove units; retire/activate
- Retire with units confirmation (removes all units first)
- Export CSV per cart

### WIP Status by Carts (wip-status.html)
- Upload WIP Excel file (SheetJS), cross-reference IMEI/PROCESS with active carts
- DIS-PHOLD and DIS-RHOLD = "Awaiting Dis-Association"; others = "Dis-Associated"
- Green threshold input (default 85%) for Dis-Association % coloring
- Cart detail modal with process breakdown, Export CSV
- Table: Cart ID, Model Type, Note, Units, Dis-Associated, Awaiting, Not in WIP, Dis-Association %

### Pallet Audit Tool (pallet-audit.html)
- Multi-phase: Scan Pallet ID → Part Number → IMEI manifest → Begin Audit → Scan units → Complete
- Scan mode toggle: "Quality Check & IMEI Record" (green, default) vs "Just IMEI Record" (light blue)
- Quality checked = green chip ✅; IMEI only = light blue chip ☑️
- 5 KPI cards: IMEIs on Pallet, Quality Checked, Matched, Remaining, Issues Logged
- QR code support in audit scan field (auto-detects long strings)
- Open issues check before beginning audit
- Audit results: "OK To Ship" / "Hold for Action" (cannot ship with open issues)
- Print 4×6 label with barcode, quality audit count, IMEI verified count
- Work instruction popup (loads work-instruction-pallet-audit.html in iframe)
- Up to 120 IMEIs + 20 Quality IMEIs saved to sheet

### Open Pallet Issues (pallet-issues.html)
- Open issues table with clickable detail popup
- Mark as Resolved (requires Resolved By + Resolution Note)
- Resolved Pallets table (toggle to show, with Latest Resolution timestamp)

### Audit Log (pallet-audit-log.html)
- Filters: date range, result (PASS/FAIL), Pallet ID text filter
- Record count display
- Detail popup: shows quality validated + scanned IMEIs (up to 120), issues
- Export CSV (overview of filtered records)
- Per-audit Export CSV (includes quality validated + all IMEIs + issues)
- Reprint label button

### Repaired Pallet Build (repaired-pallet-build.html)
- Create pallets (RPR + 8 sequential digits, 11 chars, PO# defaults to "-", SKU defaults to "WNC-CR200A-CLR")
- Open Pallets table + Closed Pallets table (separate, with filters and sortable headers)
- Add Units popup: toggle QR Code / Barcode (IMEI + Serial); fire-and-forget queue
- SKU-aware capacity: 120 for Titan 3 (WNC-CR200A), 90 for Titan 4 (ASK-NCM1100)
- Edit/Close Pallet popup: review units, IMEI filter, remove units, close pallet
- Close pallet → prompt to print label
- Reopen pallet from closed state
- Print label popup with preview (Current style)
- Scrollable tables (max 10 rows visible)

### Repair Pallet Label (repair-pallet-label.html)
- Combo search + dropdown for closed pallets
- Title style: "Current" (Pallet ID as title + barcode) or "Old" (Packing Slip)
- PDF417 barcode at bottom encoding: PO,SKU,SKU,Units,1,Units,Units
- JsBarcode for CODE128; bwip-js for PDF417
- 4×6 B&W label with CTDI logo

### Cart Label Maker (cart-label.html)
- Label types: 6×4 Label or 8.5×11 Sheet (Landscape)
- Model Type shown on label
- B&W optimized for Zebra ZD421

## Validation Rules
| Field | Rule | Example |
|-------|------|---------|
| IMEI | 15 numeric chars, starts with '3' | 351010695593399 |
| Serial Number | 11 chars, starts with 'A' | ACR52500808 |
| Pallet ID (audit) | 11 chars, starts with "PLB" | PLB00002624 |
| Pallet ID (repair) | 11 chars, "RPR" + 8 digits | RPR00000001 |
| Cart ID | "FWA-xxxx" sequential | FWA-0001 |
| Part Number | WNC-CR200A or ASK-NCM1100 | WNC-CR200A |

## Technical Conventions
- **Architecture:** Browser (HTML/JS) → JSONP → Google Apps Script → Google Sheets
- **Timestamps:** Apps Script writes "M/d/yyyy h:mm:ss a EST"; pages detect EST/EDT and display raw (minus seconds), otherwise use `toLocaleString('en-US', {timeZone:'America/New_York'})`
- **fmtDate pattern:** All pages strip seconds from display; detect EST/EDT strings to avoid timezone shift
- **Anti-double-click:** All submit buttons use disabled + flag guards
- **Batch scan:** Fire-and-forget queue pattern (immediate UI feedback, background network save)
- **Sidebar:** Collapsible groups (start collapsed, active section auto-expands)
- **Scrollbar:** Slim white-on-transparent custom scrollbar styling
- **QR parsing:** `WIFI:S:...;ROUTER:M:[model];S:[serial];...;E:[imei];...`

## Design Style
- Dark navy sidebar (#1a3a5c) with CTDI branding
- Responsive (mobile sidebar toggle)
- Status indicator (green/red/orange dot)
- Toast notifications
- Modal popups for detail/edit
- Labels: B&W only (Zebra ZD421 for 4×6, standard printer for 8.5×11)
