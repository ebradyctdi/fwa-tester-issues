# FWA Tester Issues — Project Context

## Overview
Web-based tool for CTDI's FWA (Fixed Wireless Access) operation to track tester equipment issues, device/product issues, and cart management. Built with HTML/JS frontend + Google Sheets backend via Apps Script.

## Hosting
- **GitHub Pages:** https://ebradyctdi.github.io/fwa-tester-issues/
- **Repository:** https://github.com/ebradyctdi/fwa-tester-issues

## Google Sheet
- **Name:** FWA Data
- **URL:** https://docs.google.com/spreadsheets/d/1PPTCKPN3rqy5myeUny0lzy5bs4exb7KxyyU8nssQSNM/edit

### Tabs:
| Tab | Purpose |
|-----|---------|
| Tester Issue Log | Tester health issues (Reported By, Tester Type, Tester ID, Time of Issue, Severity, Issue Type, Issue Note, Resolved By, Time of Resolution, Resolution Note, Status) |
| FWA Testers | Tester equipment inventory (Tester ID, Tester Type, Status, Location, Notes) |
| FWA Tester Types | Dropdown values for tester types (Functional, RF, Firmware, CIC) |
| Email Schedules | Automated email report config (Email, Frequency, Time, Report Type) |
| Device Issues | Product/device issues logged during receipt (IMEI, Serial Number, Cart ID, Device Model, Reported By, Note, Timestamp, Status, Resolution Timestamp) |
| Carts | Cart registry (Cart ID, Location, Cart Status, Date Created, Date Removed, Note) |
| Device Location | Which devices are on which cart (Cart ID, IMEI, Serial Number, Device Model, Date Added, Date Removed, Status) |

## Current Apps Script URL
```
https://script.google.com/macros/s/AKfycbxZsfQSV6t5Fh9Et63p3EpNw28Fs1bNwQNPwnDhFsbl2YlwT_LPur3JrTCSDtICTuFBnQ/exec
```

## Pages

### Tester Health Section
| Page | File | Purpose |
|------|------|---------|
| Overview | index.html | Grid of testers (green/red), click to see issues or log new ones |
| Report An Issue | report-issue.html | 4-column layout by tester type, click to report |
| Open Issues | open-issues.html | All unresolved tester issues with resolve capability |
| Issue History | issue-history.html | Full history with timeline popup, filters, CSV export |

### Product/Device Issues Section
| Page | File | Purpose |
|------|------|---------|
| Issue Logger | receipt-issues.html | Log device issues with batch scan mode for barcode scanners |
| Issue History | receipt-history.html | Full device issue history with filters and CSV export |
| Carts | receipt-carts.html | Cart management — lookup devices, view/add/remove units, create/retire carts |
| Cart Label Maker | cart-label.html | Print 4×6 labels for Zebra ZD421 |

### System Section
| Page | File | Purpose |
|------|------|---------|
| Testers | testers.html | Manage tester equipment (add/edit/status) |
| Email Schedule | email-schedule.html | Configure automated email reports |
| Settings | settings.html | Apps Script URL config, Google Sheet link |

## Key Features

### Batch Scan Mode (Device Issue Logger)
- Pre-fill Cart, Device Model, Reported By, Note
- Scan IMEI (15 chars, must start with '3') → auto-advance
- Scan Serial (11 chars, must start with 'A') → auto-submit
- Audio beep on success/error
- Session counter + live log of last 10 scans
- Delete button per scanned record
- Anti-double-submission flag

### Cart Management
- Create/retire carts
- Batch add/remove units via scanning
- Device lookup by IMEI or Serial
- Cart notes (editable)
- Logging a device issue also adds unit to cart

### Cart Label Maker
- Zebra ZD421 with 4×6 labels
- CTDI logo, "FWA", Cart ID, barcode, description
- Cart dropdown auto-fills description from cart note
- Adjustable font sizes for Cart ID and description

### Email Reports
- Daily/Weekly/Monthly frequency with custom time
- Open issues only or full history
- HTML formatted table with color-coded status
- Test button per schedule
- Schedules stored in Google Sheet tab

## Validation Rules
- IMEI: 15 characters, must start with '3'
- Serial Number: 11 characters, must start with 'A'
- Cart ID: stored as text (preserves leading zeros)

## Architecture
```
Browser (HTML/JS)
    ↓ JSONP
Google Apps Script (doGet)
    ↓
Google Sheets (multiple tabs)
```

## Design Style
- Dark navy sidebar (#1a3a5c) with CTDI branding
- Responsive (mobile sidebar toggle)
- Status indicator (green/red/orange dot)
- Toast notifications
- Modal popups for detail/edit
- Same design language as AWAT Production Tracker
