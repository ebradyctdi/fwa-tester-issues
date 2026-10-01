// ============================================================
// RAN TEST & REPAIR DEMO — Google Apps Script
// Paste this into your Google Sheet: Extensions → Apps Script
// Deploy → New Deployment → Web App → Execute as: Me → Anyone
// ============================================================
// SETUP (tabs & row-1 headers):
// 1. "Orders":
//    A: PO Number | B: Part Number | C: Serial Number | D: Process
//    E: Receive Date | F: Repair Code | G: Repair Date | H: Repair Note | I: Ship Date
// 2. "Test - Types":
//    A: Test Types   (one test type per row, e.g. VISUAL, FUNCTIONAL, ...)
// 3. "Test - Transactions":
//    A: Transaction # | B: PO Number | C: Part Number | D: Serial Number
//    E: Test Type | F: Test Result | G: Failure Code | H: Failure
// ============================================================

var ORDERS_SHEET = 'Orders';
var ORDERS_HEADERS = ['PO Number', 'Part Number', 'Serial Number', 'Process', 'Receive Date', 'Repair Code', 'Repair Date', 'Repair Note', 'Ship Date'];

var TYPES_SHEET = 'Test - Types';
var TXN_SHEET = 'Test - Transactions';
var TXN_HEADERS = ['Transaction #', 'Timestamp', 'PO Number', 'Part Number', 'Serial Number', 'Test Type', 'Test Result', 'Failure Code', 'Failure', 'Software Version'];

var REPAIR_ACTIONS_SHEET = 'Repair - Actions';
var REPAIR_TXN_SHEET = 'Repair - Transactions';
var REPAIR_TXN_HEADERS = ['Transaction #', 'Timestamp', 'PO Number', 'Part Number', 'Serial Number', 'Repair Action', 'Component', 'Component Age', 'Repair Location', 'Repair Note'];

var UNR_TYPES_SHEET = 'UNR - Types';
var UNR_TXN_SHEET = 'UNR - Transactions';
var UNR_TXN_HEADERS = ['Transaction #', 'Timestamp', 'PO Number', 'Part Number', 'Serial Number', 'UNR Type', 'UNR Comment'];

var PART_NUMBERS_SHEET = 'Part Numbers';
var PART_NUMBERS_HEADERS = ['Record ID', 'Part Number', 'Functional Test', 'Burn Test', 'Provisioning'];

// Serve JSONP (callback) or plain JSON.
function _respond(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function _now() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'M/d/yyyy HH:mm:ss');
}

// Get the Orders sheet, creating it with headers if missing.
function _ordersSheet(ss) {
  var sheet = ss.getSheetByName(ORDERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ORDERS_SHEET);
    sheet.getRange(1, 1, 1, ORDERS_HEADERS.length).setValues([ORDERS_HEADERS]);
  }
  return sheet;
}

// Get the Test - Transactions sheet, creating it with headers if missing.
function _txnSheet(ss) {
  var sheet = ss.getSheetByName(TXN_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(TXN_SHEET);
    sheet.getRange(1, 1, 1, TXN_HEADERS.length).setValues([TXN_HEADERS]);
  }
  return sheet;
}

// Get the Repair - Transactions sheet, creating it with headers if missing.
function _repairTxnSheet(ss) {
  var sheet = ss.getSheetByName(REPAIR_TXN_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(REPAIR_TXN_SHEET);
    sheet.getRange(1, 1, 1, REPAIR_TXN_HEADERS.length).setValues([REPAIR_TXN_HEADERS]);
  }
  return sheet;
}

// Get the UNR - Transactions sheet, creating it with headers if missing.
function _unrTxnSheet(ss) {
  var sheet = ss.getSheetByName(UNR_TXN_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(UNR_TXN_SHEET);
    sheet.getRange(1, 1, 1, UNR_TXN_HEADERS.length).setValues([UNR_TXN_HEADERS]);
  }
  return sheet;
}

// Get the Part Numbers sheet, creating it with headers if missing.
function _partNumbersSheet(ss) {
  var sheet = ss.getSheetByName(PART_NUMBERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PART_NUMBERS_SHEET);
    sheet.getRange(1, 1, 1, PART_NUMBERS_HEADERS.length).setValues([PART_NUMBERS_HEADERS]);
  }
  return sheet;
}

// Generate the next sequential Record ID (P000000001) from column A.
function _nextPartId(pnSheet) {
  var lastRow = pnSheet.getLastRow();
  var maxNum = 0;
  if (lastRow >= 2) {
    var ids = pnSheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    for (var i = 0; i < ids.length; i++) {
      var m = (ids[i][0] || '').toString().trim().match(/^P(\d+)$/);
      if (m) { var n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
    }
  }
  return 'P' + ('00000000' + (maxNum + 1)).slice(-9);
}

// Normalize a flag param to 'Yes' or 'No'.
function _yesNo(v) {
  return (v || '').toString().trim().toLowerCase() === 'yes' ? 'Yes' : 'No';
}

// Read a sheet into an array of objects keyed by the given headers.
function _readRows(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return data.map(function (row) {
    var obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i] != null ? row[i].toString() : ''; });
    return obj;
  });
}

// Generate the next sequential Transaction # from column A, using the given
// prefix and zero-padded width (e.g. prefix "TEST", width 6 -> TEST000001).
// Existing IDs are matched against the prefix; any older prefix is ignored so
// numbering continues from the highest number seen for THIS prefix.
function _nextTxnId(txnSheet, prefix, width) {
  var lastRow = txnSheet.getLastRow();
  var maxNum = 0;
  var re = new RegExp('^' + prefix + '(\\d+)$');
  if (lastRow >= 2) {
    var ids = txnSheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    for (var i = 0; i < ids.length; i++) {
      var m = (ids[i][0] || '').toString().trim().match(re);
      if (m) { var n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
    }
  }
  var padded = ('0000000000' + (maxNum + 1)).slice(-width);
  return prefix + padded;
}

function doGet(e) {
  var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'readorders';

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ================= ORDERS =================
    if (action === 'readorders') {
      return _respond({ success: true, data: _readRows(_ordersSheet(ss), ORDERS_HEADERS) }, callback);
    }

    if (action === 'addorder') {
      var sheet = _ordersSheet(ss);
      var poNumber = (e.parameter.ponumber || '').toString().trim();
      var partNumber = (e.parameter.partnumber || '').toString().trim();
      var serialNumber = (e.parameter.serialnumber || '').toString().trim();
      var process = (e.parameter.process || 'CNS-WIP').toString().trim();
      var receiveDate = (e.parameter.receivedate || '').toString().trim();
      var repairCode = (e.parameter.repaircode || '').toString().trim();
      var shipDate = (e.parameter.shipdate || '').toString().trim();

      if (!poNumber) {
        return _respond({ success: false, error: 'PO Number required' }, callback);
      }
      // PO format: begins with 8000, 10 digits, all numeric.
      if (!/^8000\d{6}$/.test(poNumber)) {
        return _respond({ success: false, error: 'PO Number must be 10 digits starting with 8000' }, callback);
      }
      // Prevent receiving the same PO twice.
      var existingOrders = _readRows(sheet, ORDERS_HEADERS);
      for (var oi = 0; oi < existingOrders.length; oi++) {
        if ((existingOrders[oi]['PO Number'] || '').toString().trim() === poNumber) {
          return _respond({ success: false, error: 'PO ' + poNumber + ' has already been received' }, callback);
        }
      }
      if (!receiveDate) receiveDate = _now();

      // A: PO | B: Part | C: Serial | D: Process | E: Receive Date | F: Repair Code
      // G: Repair Date | H: Repair Note | I: Ship Date
      sheet.appendRow([poNumber, partNumber, serialNumber, process, receiveDate, repairCode, '', '', shipDate]);
      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 1).setNumberFormat('@');
      sheet.getRange(lastRow, 1).setValue(poNumber);
      sheet.getRange(lastRow, 3).setNumberFormat('@');
      sheet.getRange(lastRow, 3).setValue(serialNumber);
      return _respond({ success: true, message: 'Order added' }, callback);
    }

    if (action === 'updateorder') {
      var sheet = _ordersSheet(ss);
      var row = parseInt(e.parameter.row, 10);
      var field = (e.parameter.field || '').toString().trim().toLowerCase();
      var value = (e.parameter.value || '').toString().trim();
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);

      var colMap = { ponumber: 1, partnumber: 2, serialnumber: 3, process: 4, receivedate: 5, repaircode: 6, repairdate: 7, repairnote: 8, shipdate: 9 };
      var col = colMap[field];
      if (!col) return _respond({ success: false, error: 'Unknown field: ' + field }, callback);

      var sheetRow = row + 2;
      if (field === 'process' && value === 'Shipped') {
        // Require a Repair Code (column F) before an order can ship.
        var repairCodeVal = (sheet.getRange(sheetRow, 6).getValue() || '').toString().trim();
        if (!repairCodeVal) {
          return _respond({ success: false, error: 'A Repair Code is required before shipping.' }, callback);
        }
        var shipCell = sheet.getRange(sheetRow, 9);
        if (!shipCell.getValue()) shipCell.setValue(_now());
      }
      var cell = sheet.getRange(sheetRow, col);
      if (col === 1 || col === 3) cell.setNumberFormat('@');
      cell.setValue(value);
      return _respond({ success: true }, callback);
    }

    if (action === 'deleteorder') {
      var sheet = _ordersSheet(ss);
      var row = parseInt(e.parameter.row, 10);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      sheet.deleteRow(row + 2);
      return _respond({ success: true }, callback);
    }

    // ================= TEST TYPES =================
    if (action === 'readtesttypes') {
      var typesSheet = ss.getSheetByName(TYPES_SHEET);
      if (!typesSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = typesSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var vals = typesSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      var types = vals.map(function (r) { return r[0] ? r[0].toString().trim() : ''; }).filter(function (t) { return t; });
      return _respond({ success: true, data: types }, callback);
    }

    // ================= TEST TRANSACTIONS =================
    if (action === 'readtransactions') {
      return _respond({ success: true, data: _readRows(_txnSheet(ss), TXN_HEADERS) }, callback);
    }

    if (action === 'addtransaction') {
      var txnSheet = _txnSheet(ss);
      var poNumber = (e.parameter.ponumber || '').toString().trim();
      var partNumber = (e.parameter.partnumber || '').toString().trim();
      var serialNumber = (e.parameter.serialnumber || '').toString().trim();
      var testType = (e.parameter.testtype || '').toString().trim();
      var testResult = (e.parameter.testresult || '').toString().trim();
      var failureCode = (e.parameter.failurecode || '').toString().trim();
      var failure = (e.parameter.failure || '').toString().trim();
      var softwareVersion = (e.parameter.softwareversion || '').toString().trim();

      if (!poNumber) return _respond({ success: false, error: 'PO Number required' }, callback);
      if (!testType) return _respond({ success: false, error: 'Test Type required' }, callback);
      if (!testResult) return _respond({ success: false, error: 'Test Result required' }, callback);

      // Software Version only applies to a passing Provisioning test.
      var isProvisioningPass = (testType.toUpperCase() === 'PROVISIONING' && testResult.toUpperCase() === 'PASS');
      if (!isProvisioningPass) softwareVersion = '';

      var txnId = _nextTxnId(txnSheet, 'TEST', 6);
      var ts = _now();
      // A: Transaction # | B: Timestamp | C: PO Number | D: Part Number | E: Serial Number
      // F: Test Type | G: Test Result | H: Failure Code | I: Failure | J: Software Version
      txnSheet.appendRow([txnId, ts, poNumber, partNumber, serialNumber, testType, testResult, failureCode, failure, softwareVersion]);
      var lastRow = txnSheet.getLastRow();
      txnSheet.getRange(lastRow, 3).setNumberFormat('@'); // C: PO Number
      txnSheet.getRange(lastRow, 3).setValue(poNumber);
      txnSheet.getRange(lastRow, 5).setNumberFormat('@'); // E: Serial Number
      txnSheet.getRange(lastRow, 5).setValue(serialNumber);
      return _respond({ success: true, message: 'Test recorded', transaction: txnId }, callback);
    }

    // ================= REPAIR ACTIONS (lookup) =================
    if (action === 'readrepairactions') {
      var raSheet = ss.getSheetByName(REPAIR_ACTIONS_SHEET);
      if (!raSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = raSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var vals = raSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      var actions = vals.map(function (r) { return r[0] ? r[0].toString().trim() : ''; }).filter(function (a) { return a; });
      return _respond({ success: true, data: actions }, callback);
    }

    // ================= REPAIR TRANSACTIONS =================
    if (action === 'readrepairtransactions') {
      return _respond({ success: true, data: _readRows(_repairTxnSheet(ss), REPAIR_TXN_HEADERS) }, callback);
    }

    if (action === 'addrepairtransaction') {
      var rSheet = _repairTxnSheet(ss);
      var poNumber = (e.parameter.ponumber || '').toString().trim();
      var partNumber = (e.parameter.partnumber || '').toString().trim();
      var serialNumber = (e.parameter.serialnumber || '').toString().trim();
      var repairAction = (e.parameter.repairaction || '').toString().trim();
      var component = (e.parameter.component || '').toString().trim();
      var componentAge = (e.parameter.componentage || '').toString().trim();
      var repairLocation = (e.parameter.repairlocation || '').toString().trim();
      var repairNote = (e.parameter.repairnote || '').toString().trim();

      if (!poNumber) return _respond({ success: false, error: 'PO Number required' }, callback);
      if (!repairAction) return _respond({ success: false, error: 'Repair Action required' }, callback);

      // Component Age only applies to PART REPLACEMENT.
      if (repairAction.toUpperCase() !== 'PART REPLACEMENT') componentAge = '';

      var rTxnId = _nextTxnId(rSheet, 'RPR', 6);
      var rts = _now();
      // A: Transaction # | B: Timestamp | C: PO Number | D: Part Number | E: Serial Number
      // F: Repair Action | G: Component | H: Component Age | I: Repair Location | J: Repair Note
      rSheet.appendRow([rTxnId, rts, poNumber, partNumber, serialNumber, repairAction, component, componentAge, repairLocation, repairNote]);
      var rLastRow = rSheet.getLastRow();
      rSheet.getRange(rLastRow, 3).setNumberFormat('@'); // C: PO Number
      rSheet.getRange(rLastRow, 3).setValue(poNumber);
      rSheet.getRange(rLastRow, 5).setNumberFormat('@'); // E: Serial Number
      rSheet.getRange(rLastRow, 5).setValue(serialNumber);
      return _respond({ success: true, message: 'Repair recorded', transaction: rTxnId }, callback);
    }

    // ================= UNR TYPES (lookup) =================
    if (action === 'readunrtypes') {
      var utSheet = ss.getSheetByName(UNR_TYPES_SHEET);
      if (!utSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = utSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var vals = utSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      var types = vals.map(function (r) { return r[0] ? r[0].toString().trim() : ''; }).filter(function (t) { return t; });
      return _respond({ success: true, data: types }, callback);
    }

    // ================= UNR TRANSACTIONS =================
    if (action === 'readunrtransactions') {
      return _respond({ success: true, data: _readRows(_unrTxnSheet(ss), UNR_TXN_HEADERS) }, callback);
    }

    if (action === 'addunrtransaction') {
      var uSheet = _unrTxnSheet(ss);
      var poNumber = (e.parameter.ponumber || '').toString().trim();
      var partNumber = (e.parameter.partnumber || '').toString().trim();
      var serialNumber = (e.parameter.serialnumber || '').toString().trim();
      var unrType = (e.parameter.unrtype || '').toString().trim();
      var unrComment = (e.parameter.unrcomment || '').toString().trim();

      if (!poNumber) return _respond({ success: false, error: 'PO Number required' }, callback);
      if (!unrType) return _respond({ success: false, error: 'UNR Type required' }, callback);

      var uTxnId = _nextTxnId(uSheet, 'UNR', 6);
      var uts = _now();
      // A: Transaction # | B: Timestamp | C: PO Number | D: Part Number | E: Serial Number
      // F: UNR Type | G: UNR Comment
      uSheet.appendRow([uTxnId, uts, poNumber, partNumber, serialNumber, unrType, unrComment]);
      var uLastRow = uSheet.getLastRow();
      uSheet.getRange(uLastRow, 3).setNumberFormat('@'); // C: PO Number
      uSheet.getRange(uLastRow, 3).setValue(poNumber);
      uSheet.getRange(uLastRow, 5).setNumberFormat('@'); // E: Serial Number
      uSheet.getRange(uLastRow, 5).setValue(serialNumber);
      return _respond({ success: true, message: 'Unrepairable recorded', transaction: uTxnId }, callback);
    }

    // ================= UPDATE ORDER BY PO (e.g. Repair Code) =================
    // Sets a field on the first non-shipped order matching the given PO Number.
    if (action === 'updateorderbypo') {
      var sheet = _ordersSheet(ss);
      var poNumber = (e.parameter.ponumber || '').toString().trim();
      var field = (e.parameter.field || '').toString().trim().toLowerCase();
      var value = (e.parameter.value || '').toString().trim();
      var repairNote = (e.parameter.repairnote || '').toString().trim();
      if (!poNumber) return _respond({ success: false, error: 'PO Number required' }, callback);

      var colMap = { process: 4, repaircode: 6, repairnote: 8 };
      var col = colMap[field];
      if (!col) return _respond({ success: false, error: 'Unknown field: ' + field }, callback);

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return _respond({ success: false, error: 'PO not found' }, callback);
      var rows = sheet.getRange(2, 1, lastRow - 1, ORDERS_HEADERS.length).getValues();
      for (var i = 0; i < rows.length; i++) {
        var rowPo = (rows[i][0] || '').toString().trim();
        var rowProcess = (rows[i][3] || '').toString().trim();
        if (rowPo === poNumber && rowProcess !== 'Shipped') {
          var sheetRow = i + 2;
          // Require a Repair Code before shipping via this path too.
          if (field === 'process' && value === 'Shipped') {
            var rc = (rows[i][5] || '').toString().trim(); // column F
            if (!rc) return _respond({ success: false, error: 'A Repair Code is required before shipping.' }, callback);
          }
          sheet.getRange(sheetRow, col).setValue(value);
          // When setting the Repair Code, also stamp Repair Date (G) and write
          // the Repair Note (H) passed alongside it.
          if (field === 'repaircode') {
            sheet.getRange(sheetRow, 7).setValue(_now());
            sheet.getRange(sheetRow, 8).setValue(repairNote);
          }
          return _respond({ success: true }, callback);
        }
      }
      return _respond({ success: false, error: 'No non-shipped order found for PO ' + poNumber }, callback);
    }

    // ================= PART NUMBERS =================
    if (action === 'readpartnumbers') {
      return _respond({ success: true, data: _readRows(_partNumbersSheet(ss), PART_NUMBERS_HEADERS) }, callback);
    }

    if (action === 'addpartnumber') {
      var pnSheet = _partNumbersSheet(ss);
      var partNumber = (e.parameter.partnumber || '').toString().trim();
      if (!partNumber) return _respond({ success: false, error: 'Part Number required' }, callback);

      // Prevent duplicates (case-insensitive).
      var existing = _readRows(pnSheet, PART_NUMBERS_HEADERS);
      for (var i = 0; i < existing.length; i++) {
        if ((existing[i]['Part Number'] || '').toString().trim().toLowerCase() === partNumber.toLowerCase()) {
          return _respond({ success: false, error: 'Part Number already exists' }, callback);
        }
      }

      var recordId = _nextPartId(pnSheet);
      // A: Record ID | B: Part Number | C: Functional Test | D: Burn Test | E: Provisioning
      pnSheet.appendRow([recordId, partNumber, _yesNo(e.parameter.functional), _yesNo(e.parameter.burn), _yesNo(e.parameter.provisioning)]);
      var lastRow = pnSheet.getLastRow();
      pnSheet.getRange(lastRow, 2).setNumberFormat('@');
      pnSheet.getRange(lastRow, 2).setValue(partNumber);
      return _respond({ success: true, message: 'Part number added', record: recordId }, callback);
    }

    if (action === 'updatepartnumber') {
      var pnSheet = _partNumbersSheet(ss);
      var row = parseInt(e.parameter.row, 10); // 0-based index into readpartnumbers data
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var partNumber = (e.parameter.partnumber || '').toString().trim();
      if (!partNumber) return _respond({ success: false, error: 'Part Number required' }, callback);
      var sheetRow = row + 2;

      pnSheet.getRange(sheetRow, 2).setNumberFormat('@');
      pnSheet.getRange(sheetRow, 2).setValue(partNumber);       // B: Part Number
      pnSheet.getRange(sheetRow, 3).setValue(_yesNo(e.parameter.functional));    // C
      pnSheet.getRange(sheetRow, 4).setValue(_yesNo(e.parameter.burn));          // D
      pnSheet.getRange(sheetRow, 5).setValue(_yesNo(e.parameter.provisioning));  // E
      return _respond({ success: true }, callback);
    }

    return _respond({ success: false, error: 'Unknown action: ' + action }, callback);
  } catch (err) {
    return _respond({ success: false, error: err.message }, callback);
  }
}

// Optional: allow POST as well, routing through the same logic.
function doPost(e) {
  return doGet(e);
}

// ------------------------------------------------------------
// Run this ONCE from the editor (select "setup" → Run) to
// verify access and create the tabs with headers.
// Do NOT run the doGet/helper functions directly — they need a
// request/spreadsheet argument and will throw if run on their own.
// ------------------------------------------------------------
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var o = _ordersSheet(ss);
  var t = _txnSheet(ss);
  var r = _repairTxnSheet(ss);
  var u = _unrTxnSheet(ss);
  var types = ss.getSheetByName(TYPES_SHEET);
  var actions = ss.getSheetByName(REPAIR_ACTIONS_SHEET);
  var unrTypes = ss.getSheetByName(UNR_TYPES_SHEET);
  var pn = _partNumbersSheet(ss);
  Logger.log('Orders: ' + o.getLastRow() + ' row(s). Test Txns: ' + t.getLastRow()
    + '. Repair Txns: ' + r.getLastRow() + '. UNR Txns: ' + u.getLastRow()
    + '. Part Numbers: ' + pn.getLastRow()
    + '. Test Types: ' + (types ? 'found' : 'MISSING')
    + '. Repair Actions: ' + (actions ? 'found' : 'MISSING')
    + '. UNR Types: ' + (unrTypes ? 'found' : 'MISSING') + '.');
}
