# RAN - Test & Repair Demo — Project Context

## Overview
Demo web tool for a Test & Repair revamp. Tracks repair **orders** as they move through the
process (received → diagnostics → repair → retest → QA → shipped). Built with an HTML/JS
frontend + Google Sheets backend via Apps Script — the same architecture as the FWA Tester
Issues tool.

## Hosting
- **GitHub Pages:** _(set once published, e.g. https://<user>.github.io/ran-test-repair-demo/)_
- **Repository:** _(set once created)_
- **Workspace:** `RAN - Test and Repair\RAN - Test & Repair Demo\`

## Configuration
- **Apps Script URL:** set on the Settings page; stored in `localStorage` under `ran_tr_script_url`.
- **Google Sheet URL:** set on the Settings page; stored under `ran_tr_sheet_url`.
  Defaults to the project's demo sheet if nothing is saved yet.

## Google Sheet
- **Sheet:** https://docs.google.com/spreadsheets/d/1rwuER1byA59jyu22nEvR7BGq9A_JXRoBV0LfvPTxJOs/edit
- **Sheet ID:** `1rwuER1byA59jyu22nEvR7BGq9A_JXRoBV0LfvPTxJOs`

### Tabs & Columns
| Tab | Columns |
|-----|---------|
| Orders | A: PO Number, B: Part Number, C: Serial Number, D: Process, E: Receive Date, F: Repair Code, G: Repair Date, H: Repair Note, I: Ship Date |
| Test - Types | A: Test Types (one per row, e.g. VISUAL, FUNCTIONAL, BURN, PROVISIONING) |
| Test - Transactions | A: Transaction #, B: Timestamp, C: PO Number, D: Part Number, E: Serial Number, F: Test Type, G: Test Result, H: Failure Code, I: Failure, J: Software Version |
| Repair - Actions | A: Repair Actions (one per row, e.g. PART REPLACEMENT, COMPONENT REPAIR, SOFTWARE) |
| Repair - Transactions | A: Transaction #, B: Timestamp, C: PO Number, D: Part Number, E: Serial Number, F: Repair Action, G: Component, H: Component Age, I: Repair Location, J: Repair Note |
| UNR - Types | A: Types (one per row, e.g. Environmental, Physical Damage, Infestation, Unavailable Parts, Tech Unable to Repair) |
| UNR - Transactions | A: Transaction #, B: Timestamp, C: PO Number, D: Part Number, E: Serial Number, F: UNR Type, G: UNR Comment |
| Part Numbers | A: Record ID, B: Part Number, C: Functional Test, D: Burn Test, E: Provisioning (C–E are Yes/No flags for which tests the part requires) |

`Receive Date` is auto-stamped on add if left blank. `Ship Date` is auto-stamped when an
order's Process is set to **Shipped** (if not already set). Test transactions get a `Timestamp`
+ `TESTxxxxxx` ID; repair transactions get a `Timestamp` + `RPRxxxxxx` ID; UNR transactions get
a `Timestamp` + `UNRxxxxxx` ID. Timestamps use `M/d/yyyy HH:mm:ss` in the script's timezone.
The Apps Script auto-creates the `Orders`, `Test - Transactions`, `Repair - Transactions`, and
`UNR - Transactions` tabs with headers if missing. The `Test - Types`, `Repair - Actions`, and `UNR - Types` tabs are expected to
already exist and are read-only lookup lists to the tool. The `Part Numbers` tab is
auto-created and is managed in-app on the Part Numbers page (add/edit).

## Pages & Files

### Sidebar Navigation (defined once in `nav.js`)
```
▶ Workflow
  - index.html (Overview)
  - receive.html (Receive)
  - test-record.html (Test Record)
  - repair-record.html (Repair Record)
  - unrepairable-record.html (Unrepairable Record)
  - repair-code-entry.html (Repair Code Entry)
  - ship.html (Ship)
  - orders.html (Order History)
▶ System
  - part-numbers.html (Part Numbers)
  - settings.html (Settings)
```

### Files
| File | Purpose |
|------|---------|
| index.html | Dashboard: KPI cards, orders-by-process, recent orders table |
| receive.html | Record an incoming order (PO / Part / Serial); Part Number is a dropdown from the `Part Numbers` tab; starts at process CNS-WIP |
| test-record.html | Pick a non-shipped PO + test type + Pass/Fail (Failure Code & Failure on Fail); writes to Test - Transactions. Test types the PO's part is not configured for are disabled/(N/A) — Visual always available |
| repair-record.html | Pick a non-shipped PO + repair action + Component + Repair Location + Repair Note; writes to Repair - Transactions |
| unrepairable-record.html | Pick a non-shipped PO + UNR type + UNR Comment; writes to UNR - Transactions |
| repair-code-entry.html | Pick a PO; view combined history (Receipt/Test/Repair/UNR), a Test Fails count per type, and latest test-status chips (Functional/Burn/Provisioning); see a Suggested Repair Code and enter/apply a Repair Code (saved to the Orders row) |
| ship.html | Pick a non-shipped PO, review it, and ship (sets Process → Shipped, auto-stamps Ship Date). Requires a Repair Code first — the button is disabled and a warning shows if one is missing |
| orders.html | Order History: read-only, searchable/filterable table of all orders (newest received first). Per-row **History** button opens a popup timeline (order milestones + Test/Repair/UNR transactions) with newest/oldest sort and category filter chips |
| part-numbers.html | System page to add/edit part numbers and their Functional/Burn/Provisioning Yes/No flags |
| settings.html | Configure Apps Script URL + Google Sheet URL; test connection |
| nav.js | Shared sidebar rendering (`renderNav(activePage)`) and collapsible groups |
| google-apps-script.js | Reference copy of the Apps Script backend (paste into the Sheet) |
| CONTEXT.md | This file |

## Apps Script Actions (`doGet` / `doPost`)
| Action | Params | Effect |
|--------|--------|--------|
| `readorders` | — | Returns all rows from `Orders` as objects keyed by header |
| `addorder` | ponumber, partnumber, serialnumber, process, repaircode, (receivedate, shipdate) | Appends a row; stamps Receive Date if blank; process defaults to CNS-WIP |
| `updateorder` | row, field, value | Updates one cell; auto-stamps Ship Date when Process → Shipped |
| `deleteorder` | row | Deletes the row |
| `readtesttypes` | — | Returns the list of test types from the `Test - Types` tab (column A) |
| `readtransactions` | — | Returns all rows from `Test - Transactions` keyed by header |
| `addtransaction` | ponumber, partnumber, serialnumber, testtype, testresult, (failurecode, failure, softwareversion) | Appends a test transaction; stamps Timestamp; auto-generates `TESTxxxxxx` ID. Software Version is stored only for a passing PROVISIONING test |
| `readrepairactions` | — | Returns the list of repair actions from the `Repair - Actions` tab (column A) |
| `readrepairtransactions` | — | Returns all rows from `Repair - Transactions` keyed by header |
| `addrepairtransaction` | ponumber, partnumber, serialnumber, repairaction, component, (componentage), repairlocation, repairnote | Appends a repair transaction; stamps Timestamp; auto-generates `RPRxxxxxx` ID. Component Age is stored only for a PART REPLACEMENT action |
| `readunrtypes` | — | Returns the list of UNR types from the `UNR - Types` tab (column A) |
| `readunrtransactions` | — | Returns all rows from `UNR - Transactions` keyed by header |
| `addunrtransaction` | ponumber, partnumber, serialnumber, unrtype, unrcomment | Appends a UNR transaction; stamps Timestamp; auto-generates `UNRxxxxxx` ID |
| `readpartnumbers` | — | Returns rows from the `Part Numbers` tab (part + Functional/Burn/Provisioning Yes/No flags) |
| `addpartnumber` | partnumber, functional, burn, provisioning | Appends a part number; auto-generates `Pxxxxxxxxx` Record ID; rejects duplicates |
| `updatepartnumber` | row, partnumber, functional, burn, provisioning | Updates a part number row (0-based index into `readpartnumbers`) |
| `updateorderbypo` | ponumber, field (`process`\|`repaircode`), value | Sets a field on the first non-shipped order matching the PO (used by Repair Code Entry) |

- `row` is the **0-based index** into the data returned by `readorders` (sheet row = `row + 2`).
- `updateorder` `field` accepts: `ponumber`, `partnumber`, `serialnumber`, `process`,
  `receivedate`, `repaircode`, `repairdate`, `repairnote`, `shipdate` (mapped to columns A–I).
- `updateorderbypo` targets by PO Number instead of row index; writable fields are `process`,
  `repaircode`, and `repairnote`. When `field=repaircode`, it also stamps **Repair Date** (G)
  and writes the `repairnote` param into **Repair Note** (H).

## Domain Values
| Field | Allowed values |
|-------|----------------|
| PO Number | Must match `^8000\d{6}$` — begins with 8000, 10 digits, all numeric (e.g. 8000123456). Must be unique (not already received). Both rules enforced on Receive and in `addorder` |
| Process | CNS-WIP (initial), Diagnostics, Repair, Retest, QA, Shipped |
| Repair Code | Free text (varies by defect) |
| Test Type | Sourced from the `Test - Types` tab (VISUAL, FUNCTIONAL, BURN, PROVISIONING, ...) |
| Test Result | PASS, FAIL |
| Software Version | Free text; captured only on a passing PROVISIONING test |
| Repair Action | Sourced from the `Repair - Actions` tab (PART REPLACEMENT, COMPONENT REPAIR, SOFTWARE, ...) |
| Component Age | New, Harvested; captured only when Repair Action is PART REPLACEMENT |
| UNR Type | Sourced from the `UNR - Types` tab (Environmental, Physical Damage, Infestation, Unavailable Parts, Tech Unable to Repair, ...) |
| Part test applicability | The `Part Numbers` tab flags (Functional Test / Burn Test / Provisioning = Yes/No) drive which tests apply per part. VISUAL always applies. Not-applicable tests are disabled on Test Record and shown as **N/A** on Repair Code Entry |

Process values live in each page's JS (`PROCESSES` / `PROCESS_ORDER`) and their colors in
`PROCESS_COLORS`. Add a process by updating those arrays. Test types are data-driven from
the sheet — add a row to `Test - Types` and it appears in the Test Record dropdown.

## Workflow
1. **Receive** — order enters at process **CNS-WIP** with a Receive Date.
2. **Test Record** — record PASS/FAIL test results (by test type) against any non-shipped PO;
   each result is a row in `Test - Transactions`.
3. **Repair Record** — record a repair action (with Component + Location + Note) against any
   non-shipped PO; each is a row in `Repair - Transactions`.
4. **Unrepairable Record** — record a UNR type + comment against a non-shipped PO; each is a
   row in `UNR - Transactions`.
5. **Repair Code Entry** — pick a PO to review its full combined history (Receipt, Test,
   Repair, UNR), a **Test Fails** count per test type (Visual/Functional/Burn/Provisioning;
   red when ≥1 fail), and the **latest test-status** chips for Functional/Burn/Provisioning
   (green = last PASS, red = last FAIL, grey = no test). A **Suggested Repair Code** is derived
   (precedence: `[UNR]` if any UNR record → else `[REPAIR]` if latest FUNCTIONAL PASS with
   ≥1 repair action → else `[NTF]` if latest FUNCTIONAL PASS with no repair action → else
   `[-]`), along with a **Suggested Repair Note** derived from the PO's actions ([REPAIR] →
   repair-action summary, [UNR] → unrepairable summary, [NTF]/[-] → no note). "Use Suggested"
   applies both. Saving writes the Repair Code, Repair Note (field below the code), and an
   auto-stamped Repair Date to the Orders row via `updateorderbypo`.
6. **Ship** — pick a non-shipped PO and ship it: sets Process → **Shipped** and auto-stamps
   the Ship Date. (Uses `updateorder` with the order's row index.) An order **must have a
   Repair Code** before it can ship — enforced on the page (button disabled + warning) and in
   the backend (both `updateorder` and `updateorderbypo` reject Shipped with a blank Repair Code).
7. **Order History** — read-only view of all orders (searchable/filterable) for reference.

## Technical Conventions
- **Architecture:** Browser (HTML/JS) → JSONP → Google Apps Script → Google Sheets.
- **JSONP:** Every request uses a `callback` param to sidestep CORS (identical helper on each page).
- **Timestamps:** Apps Script writes them; pages display via `fmtDate` using
  `toLocaleString('en-US', { timeZone: 'America/New_York' })`.
- **Anti-double-click:** Submit buttons disable themselves while a request is in flight.
- **PO / Serial as text:** Apps Script forces those columns to plain text to preserve leading zeros.

## Design Style
- Dark navy sidebar (#1a3a5c) with CTDI branding.
- Responsive (mobile sidebar toggle + overlay).
- Connection status dot (green/orange/red) in the header.
- Toast notifications; colored badges for process.

## Setup Checklist
1. Open the Google Sheet; add a tab named **Orders** (or let the script create it).
2. Extensions → Apps Script → paste `google-apps-script.js` → Deploy as Web App
   (Execute as: Me, Access: Anyone) → copy the `/exec` URL.
3. Open `settings.html`, paste the Apps Script URL (Sheet URL is pre-filled), click **Save & Test**.
4. Publish the folder to GitHub Pages and update the Hosting section above.
