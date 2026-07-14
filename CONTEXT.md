# FWA Tester Issues — Project Context

## Overview
Web-based tool for CTDI's FWA (Fixed Wireless Access) operation to track tester equipment issues, device/product issues, cart management, pallet audits, and WNC repair pallet builds. Built with HTML/JS frontend + Google Sheets backend via Apps Script.

## Hosting
- **GitHub Pages:** https://ebradyctdi.github.io/fwa-tester-issues/
- **Repository:** https://github.com/ebradyctdi/fwa-tester-issues
- **Workspace:** `c:\Users\ebrady\OneDrive - Communications Test Design, Inc\Desktop\Kiro\FWA\Tester Issues\`

## Current Apps Script URL
```
https://script.google.com/macros/s/AKfycbxw2n3gCiyOysmGGzFLtyREtogLcze2nau5S43YGjZjASv9kDE2pYcBbeDtFrUSzl8upQ/exec
```

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
| Repair - Pallets | A-F (Pallet ID, Pallet PO #, SKU, Pallet Status, Pallet Open Date, Pallet Close Date) |
| Repair - Pallet Build | A-F (Pallet ID, IMEI, Serial Number, Put to Pallet Date, Removed from Pallet Date, Status) |

## Pages & Files

### Sidebar Navigation Structure (all pages share this)
```
▶ Tester Health
  - index.html (Overview)
  - report-issue.html (Report An Issue)
  - open-issues.html (Open Issues)
  - issue-history.html (Issue History)
▶ Product/Device Issues
  - receipt-issues.html (Issue Logger)
  - receipt-history.html (Issue History)
  - receipt-carts.html (Carts)
  - cart-label.html (Cart Label Maker)
  - wip-status.html (WIP Status by Carts)
▶ Audit Tools
  - pallet-audit.html (Pallet Audit Tool)
  - pallet-issues.html (Open Pallet Issues)
  - pallet-audit-log.html (Audit Log)
▶ WNC Repair Tools
  - repaired-pallet-build.html (Repaired Pallet Build)
  - repair-pallet-label.html (Repair Pallet Label Re-Print)
▶ System
  - testers.html (Testers)
  - email-schedule.html (Email Schedule)
  - settings.html (Settings)
```

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
