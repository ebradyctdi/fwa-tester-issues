// ============================================================
// FWA TESTER ISSUES — Google Apps Script
// Paste this into your Google Sheet: Extensions → Apps Script
// Deploy → New Deployment → Web App → Execute as: Me → Anyone
// ============================================================
// SETUP:
// 1. Google Sheet with tabs: "Tester Issue Log", "FWA Testers", "FWA Tester Types"
// 2. "Tester Issue Log" headers (row 1):
//    A: Reported By | B: Tester Type | C: Tester ID | D: Time of Issue | E: Severity
//    F: Issue Type | G: Issue Note | H: Resolved By | I: Time of Resolution | J: Resolution Note | K: Status
// 3. "FWA Testers" headers: Tester ID | Tester Type | Status | Location | Notes
// 4. "FWA Tester Types" headers: Tester Type
// ============================================================

var ISSUES_SHEET = 'Tester Issue Log';

function _respond(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'read';

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(ISSUES_SHEET);
    if (!sheet) return _respond({ success: false, error: 'Sheet "' + ISSUES_SHEET + '" not found' }, callback);

    // ---- READ ALL ISSUES ----
    if (action === 'read') {
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
      var headers = ['Reported By', 'Tester Type', 'Tester ID', 'Time of Issue', 'Severity', 'Issue Type', 'Issue Note', 'Resolved By', 'Time of Resolution', 'Resolution Note', 'Status'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i] ? row[i].toString() : ''; });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- LOG NEW ISSUE ----
    if (action === 'logissue') {
      var reportedBy = (e.parameter.reportedby || '').toString().trim();
      var testerType = (e.parameter.testertype || '').toString().trim();
      var testerID = (e.parameter.testerid || '').toString().trim();
      var severity = (e.parameter.severity || '').toString().trim();
      var issueType = (e.parameter.type || '').toString().trim();
      var issueNote = (e.parameter.description || '').toString().trim();
      var issueStart = (e.parameter.issuestart || '').toString().trim();

      if (!reportedBy || !severity || !issueNote) {
        return _respond({ success: false, error: 'Missing required fields' }, callback);
      }

      if (!issueStart) {
        var now = new Date();
        issueStart = Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy HH:mm:ss');
      }

      // A: Reported By, B: Tester Type, C: Tester ID, D: Time of Issue, E: Severity,
      // F: Issue Type, G: Issue Note, H: Resolved By, I: Time of Resolution, J: Resolution Note, K: Status
      sheet.appendRow([reportedBy, testerType, testerID, issueStart, severity, issueType, issueNote, '', '', '', 'Open']);
      return _respond({ success: true, message: 'Issue logged' }, callback);
    }

    // ---- UPDATE STATUS ----
    if (action === 'updatestatus') {
      var row = parseInt(e.parameter.row);
      var newStatus = (e.parameter.status || '').toString().trim();
      if (isNaN(row) || !newStatus) return _respond({ success: false, error: 'Row and status required' }, callback);
      var sheetRow = row + 2;
      sheet.getRange(sheetRow, 11).setValue(newStatus); // K = Status
      return _respond({ success: true }, callback);
    }

    // ---- RESOLVE ISSUE ----
    if (action === 'resolveissue') {
      var row = parseInt(e.parameter.row);
      var resolvedBy = (e.parameter.resolvedby || '').toString().trim();
      var resolution = (e.parameter.resolution || '').toString().trim();
      var issueStop = (e.parameter.issuestop || '').toString().trim();
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;

      // H: Resolved By
      sheet.getRange(sheetRow, 8).setValue(resolvedBy);

      // I: Time of Resolution
      if (issueStop) {
        sheet.getRange(sheetRow, 9).setValue(issueStop);
      } else {
        var now = new Date();
        sheet.getRange(sheetRow, 9).setValue(Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy HH:mm:ss'));
      }

      // J: Resolution Note
      sheet.getRange(sheetRow, 10).setValue(resolution);

      // K: Status = Resolved
      sheet.getRange(sheetRow, 11).setValue('Resolved');

      return _respond({ success: true }, callback);
    }

    // ---- READ TESTER TYPES ----
    if (action === 'readtestertypes') {
      var typesSheet = ss.getSheetByName('FWA Tester Types');
      if (!typesSheet) return _respond({ success: false, error: 'Sheet "FWA Tester Types" not found' }, callback);
      var lastRow = typesSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = typesSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      var types = data.map(function(row) { return row[0] ? row[0].toString().trim() : ''; }).filter(function(t) { return t; });
      return _respond({ success: true, data: types }, callback);
    }

    // ---- READ TESTERS ----
    if (action === 'readtesters') {
      var testerSheet = ss.getSheetByName('FWA Testers');
      if (!testerSheet) return _respond({ success: false, error: 'Sheet "FWA Testers" not found' }, callback);
      var lastRow = testerSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = testerSheet.getRange(2, 1, lastRow - 1, 5).getValues();
      var headers = ['Tester ID', 'Tester Type', 'Status', 'Location', 'Notes'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i] ? row[i].toString() : ''; });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- ADD TESTER ----
    if (action === 'addtester') {
      var testerSheet = ss.getSheetByName('FWA Testers');
      if (!testerSheet) return _respond({ success: false, error: 'Sheet "FWA Testers" not found' }, callback);
      var testerID = (e.parameter.testerid || '').toString().trim();
      var testerType = (e.parameter.testertype || '').toString().trim();
      var status = (e.parameter.status || 'Active').toString().trim();
      var location = (e.parameter.location || '').toString().trim();
      var notes = (e.parameter.notes || '').toString().trim();
      if (!testerID) return _respond({ success: false, error: 'Tester ID required' }, callback);
      testerSheet.appendRow([testerID, testerType, status, location, notes]);
      return _respond({ success: true }, callback);
    }

    // ---- UPDATE TESTER ----
    if (action === 'updatetester') {
      var testerSheet = ss.getSheetByName('FWA Testers');
      if (!testerSheet) return _respond({ success: false, error: 'Sheet "FWA Testers" not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      testerSheet.getRange(sheetRow, 1).setValue((e.parameter.testerid || '').toString().trim());
      testerSheet.getRange(sheetRow, 2).setValue((e.parameter.testertype || '').toString().trim());
      testerSheet.getRange(sheetRow, 3).setValue((e.parameter.status || '').toString().trim());
      testerSheet.getRange(sheetRow, 4).setValue((e.parameter.location || '').toString().trim());
      testerSheet.getRange(sheetRow, 5).setValue((e.parameter.notes || '').toString().trim());
      return _respond({ success: true }, callback);
    }

    // ---- DEFAULT ----
    return _respond({ success: false, error: 'Unknown action: ' + action }, callback);

  } catch(err) {
    return _respond({ success: false, error: err.toString() }, callback);
  }
}
