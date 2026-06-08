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

    // ---- SEND EMAIL REPORT ----
    if (action === 'sendemail') {
      var email = (e.parameter.email || '').toString().trim();
      var type = (e.parameter.type || 'open').toString().trim();
      if (!email) return _respond({ success: false, error: 'Email required' }, callback);

      var lastRow = sheet.getLastRow();
      var allData = [];
      if (lastRow >= 2) {
        var data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
        var headers = ['Reported By', 'Tester Type', 'Tester ID', 'Time of Issue', 'Severity', 'Issue Type', 'Issue Note', 'Resolved By', 'Time of Resolution', 'Resolution Note', 'Status'];
        allData = data.map(function(row) {
          var obj = {};
          headers.forEach(function(h, i) { obj[h] = row[i] ? row[i].toString() : ''; });
          return obj;
        });
      }

      var issues = type === 'open' ? allData.filter(function(i) { return (i['Status'] || '').trim() !== 'Resolved'; }) : allData;
      var subject = 'FWA Tester Issues Report — ' + (type === 'open' ? 'Open Issues' : 'Full History');
      var body = '';

      if (type === 'open' && issues.length === 0) {
        body = '<h2 style="color:#28a745;">All Clear — No Open Issues</h2><p>There are currently no unresolved tester issues. All testers are operational.</p>';
      } else {
        body = '<h2>' + (type === 'open' ? 'Open Issues (' + issues.length + ')' : 'Issue History (' + issues.length + ' total)') + '</h2>';
        body += '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">';
        body += '<tr style="background:#1a3a5c;color:white;"><th>Tester ID</th><th>Type</th><th>Severity</th><th>Issue Note</th><th>Reported By</th><th>Time of Issue</th><th>Resolved By</th><th>Resolution Note</th><th>Time of Resolution</th><th>Status</th></tr>';
        issues.forEach(function(i) {
          var sevColor = i['Severity'] === 'Critical' ? '#dc3545' : i['Severity'] === 'Major' ? '#fd7e14' : '#17a2b8';
          body += '<tr>';
          body += '<td style="font-weight:bold;">' + (i['Tester ID'] || '—') + '</td>';
          body += '<td>' + (i['Tester Type'] || '—') + '</td>';
          body += '<td style="color:' + sevColor + ';font-weight:bold;">' + (i['Severity'] || '—') + '</td>';
          body += '<td>' + (i['Issue Note'] || '—') + '</td>';
          body += '<td>' + (i['Reported By'] || '—') + '</td>';
          body += '<td>' + (i['Time of Issue'] || '—') + '</td>';
          body += '<td>' + (i['Resolved By'] || '—') + '</td>';
          body += '<td>' + (i['Resolution Note'] || '—') + '</td>';
          body += '<td>' + (i['Time of Resolution'] || '—') + '</td>';
          var statusColor = (i['Status'] || '').trim() === 'Resolved' ? '#28a745' : '#dc3545';
          body += '<td style="background:' + statusColor + ';color:white;font-weight:bold;text-align:center;">' + (i['Status'] || '—') + '</td>';
          body += '</tr>';
        });
        body += '</table>';
      }

      body += '<br><p style="font-size:11px;color:#888;">Generated by FWA Tester Issues — CTDI</p>';

      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: body
      });

      return _respond({ success: true, message: 'Email sent to ' + email }, callback);
    }

    // ---- SAVE SCHEDULES ----
    if (action === 'saveschedules') {
      var schedulesJson = (e.parameter.schedules || '[]').toString();
      var schedData = JSON.parse(schedulesJson);
      
      // Get or create Email Schedules tab
      var schedSheet = ss.getSheetByName('Email Schedules');
      if (!schedSheet) {
        schedSheet = ss.insertSheet('Email Schedules');
        schedSheet.getRange(1, 1, 1, 4).setValues([['Email', 'Frequency', 'Time', 'Report Type']]);
      }
      
      // Clear existing data (keep header)
      var lastRow = schedSheet.getLastRow();
      if (lastRow > 1) {
        schedSheet.getRange(2, 1, lastRow - 1, 4).clearContent();
      }
      
      // Write new schedules
      if (schedData.length > 0) {
        var rows = schedData.map(function(s) {
          return [s.email || '', s.frequency || '', s.time || '08:00', s.type || 'open'];
        });
        schedSheet.getRange(2, 1, rows.length, 4).setValues(rows);
      }
      
      return _respond({ success: true }, callback);
    }

    // ---- READ SCHEDULES ----
    if (action === 'readschedules') {
      var schedSheet = ss.getSheetByName('Email Schedules');
      if (!schedSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = schedSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = schedSheet.getRange(2, 1, lastRow - 1, 4).getValues();
      var rows = data.filter(function(row) { return row[0]; }).map(function(row) {
        return { email: row[0].toString(), frequency: row[1].toString(), time: row[2].toString(), type: row[3].toString() };
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- READ STANDARD CART NOTES ----
    if (action === 'readstandardnotes') {
      var snSheet = ss.getSheetByName('Cart - Standard Note');
      if (!snSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = snSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = snSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      var notes = data.map(function(row) { return row[0] ? row[0].toString().trim() : ''; }).filter(function(n) { return n; });
      return _respond({ success: true, data: notes }, callback);
    }

    // ---- Device Issues ----
    if (action === 'readreceiptissues') {
      var riSheet = ss.getSheetByName('Device Issues');
      if (!riSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = riSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var headers = ['IMEI', 'Serial Number', 'Cart ID', 'Device Model', 'Reported By', 'Note', 'Timestamp', 'Status', 'Resolution Timestamp'];
      var data = riSheet.getRange(2, 1, lastRow - 1, 9).getValues();
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i] ? row[i].toString() : ''; });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    if (action === 'logreceiptissue') {
      var riSheet = ss.getSheetByName('Device Issues');
      if (!riSheet) {
        riSheet = ss.insertSheet('Device Issues');
        riSheet.getRange(1, 1, 1, 9).setValues([['IMEI', 'Serial Number', 'Cart', 'Device Model', 'Reported By', 'Note', 'Timestamp', 'Status', 'Resolution Timestamp']]);
      }
      var imei = (e.parameter.imei || '').toString().trim();
      var serial = (e.parameter.serial || '').toString().trim();
      var cart = (e.parameter.cart || '').toString().trim();
      var deviceModel = (e.parameter.devicemodel || '').toString().trim();
      var reportedBy = (e.parameter.reportedby || '').toString().trim();
      var note = (e.parameter.note || '').toString().trim();

      if (!imei && !serial) return _respond({ success: false, error: 'IMEI or Serial required' }, callback);

      var now = new Date();
      var ts = Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy HH:mm:ss');

      riSheet.appendRow([imei, serial, cart, deviceModel, reportedBy, note, ts, 'Open', '']);
      // Force Cart column (C) to be plain text so leading zeros are preserved
      var lastRow = riSheet.getLastRow();
      riSheet.getRange(lastRow, 3).setNumberFormat('@');
      riSheet.getRange(lastRow, 3).setValue(cart);

      // Also add unit to Device Location sheet
      if (cart) {
        var dlSheet = ss.getSheetByName('Device Location');
        if (dlSheet) {
          dlSheet.appendRow([cart, imei, serial, deviceModel, ts, '', 'On Cart']);
          var dlLastRow = dlSheet.getLastRow();
          dlSheet.getRange(dlLastRow, 1).setNumberFormat('@');
          dlSheet.getRange(dlLastRow, 1).setValue(cart);
        }
      }

      return _respond({ success: true }, callback);
    }

    if (action === 'deletereceiptissue') {
      var riSheet = ss.getSheetByName('Device Issues');
      if (!riSheet) return _respond({ success: false, error: 'Sheet not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      riSheet.deleteRow(sheetRow);
      return _respond({ success: true }, callback);
    }

    if (action === 'resolvereceiptissue') {
      var riSheet = ss.getSheetByName('Device Issues');
      if (!riSheet) return _respond({ success: false, error: 'Sheet not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      riSheet.getRange(sheetRow, 8).setValue('Resolved');
      var now = new Date();
      riSheet.getRange(sheetRow, 9).setValue(Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy HH:mm:ss'));
      return _respond({ success: true }, callback);
    }

    // ---- CART INFORMATION ----
    if (action === 'readcartinfo') {
      var ciSheet = ss.getSheetByName('Device Location');
      if (!ciSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = ciSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = ciSheet.getRange(2, 1, lastRow - 1, 7).getValues();
      var headers = ['Cart ID', 'IMEI', 'Serial Number', 'Device Model', 'Date Added', 'Date Removed', 'Status'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i] ? row[i].toString() : ''; });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    if (action === 'readcarts') {
      var cartsSheet = ss.getSheetByName('Carts');
      if (!cartsSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = cartsSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = cartsSheet.getRange(2, 1, lastRow - 1, 7).getValues();
      var headers = ['Cart ID', 'Location', 'Cart Status', 'Date Created', 'Date Removed', 'Model Type', 'Note'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i] ? row[i].toString() : ''; });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    if (action === 'updatecartlocation') {
      var cartsSheet = ss.getSheetByName('Carts');
      if (!cartsSheet) return _respond({ success: false, error: 'Sheet not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var location = (e.parameter.location || '').toString().trim();
      var sheetRow = row + 2;
      cartsSheet.getRange(sheetRow, 2).setValue(location);
      return _respond({ success: true }, callback);
    }

    if (action === 'updatecartnote') {
      var cartsSheet = ss.getSheetByName('Carts');
      if (!cartsSheet) return _respond({ success: false, error: 'Sheet not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var note = (e.parameter.note || '').toString().trim();
      var sheetRow = row + 2;
      cartsSheet.getRange(sheetRow, 7).setValue(note);
      return _respond({ success: true }, callback);
    }

    if (action === 'updatecartmodeltype') {
      var cartsSheet = ss.getSheetByName('Carts');
      if (!cartsSheet) return _respond({ success: false, error: 'Sheet not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var modeltype = (e.parameter.modeltype || '').toString().trim();
      var sheetRow = row + 2;
      cartsSheet.getRange(sheetRow, 6).setValue(modeltype);
      return _respond({ success: true }, callback);
    }

    if (action === 'retirecart') {
      var cartsSheet = ss.getSheetByName('Carts');
      if (!cartsSheet) return _respond({ success: false, error: 'Sheet not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      cartsSheet.getRange(sheetRow, 3).setValue('Inactive');
      var now = new Date();
      cartsSheet.getRange(sheetRow, 5).setValue(Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy HH:mm:ss'));
      return _respond({ success: true }, callback);
    }

    if (action === 'createcart') {
      var cartsSheet = ss.getSheetByName('Carts');
      if (!cartsSheet) {
        cartsSheet = ss.insertSheet('Carts');
        cartsSheet.getRange(1, 1, 1, 7).setValues([['Cart ID', 'Location', 'Cart Status', 'Date Created', 'Date Removed', 'Note', 'Model Type']]);
      }
      var cartId = (e.parameter.cartid || '').toString().trim();
      var location = (e.parameter.location || '').toString().trim();
      var status = (e.parameter.status || 'Active').toString().trim();
      var note = (e.parameter.note || '').toString().trim();
      var modelType = (e.parameter.modeltype || '').toString().trim();
      if (!cartId) return _respond({ success: false, error: 'Cart ID required' }, callback);
      var now = new Date();
      var ts = Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy HH:mm:ss');
      cartsSheet.appendRow([cartId, location, status, ts, '', modelType, note]);
      var lastRow = cartsSheet.getLastRow();
      cartsSheet.getRange(lastRow, 1).setNumberFormat('@');
      cartsSheet.getRange(lastRow, 1).setValue(cartId);
      return _respond({ success: true }, callback);
    }

    if (action === 'addtocart') {
      var ciSheet = ss.getSheetByName('Device Location');
      if (!ciSheet) {
        ciSheet = ss.insertSheet('Device Location');
        ciSheet.getRange(1, 1, 1, 7).setValues([['Cart ID', 'IMEI', 'Serial Number', 'Device Model', 'Date Added', 'Date Removed', 'Status']]);
      }
      var cartId = (e.parameter.cartid || '').toString().trim();
      var imei = (e.parameter.imei || '').toString().trim();
      var serial = (e.parameter.serial || '').toString().trim();
      var deviceModel = (e.parameter.devicemodel || '').toString().trim();
      if (!cartId || (!imei && !serial)) return _respond({ success: false, error: 'Cart ID and IMEI or Serial required' }, callback);
      var now = new Date();
      var ts = Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy HH:mm:ss');
      ciSheet.appendRow([cartId, imei, serial, deviceModel, ts, '', 'On Cart']);
      // Force Cart ID column to text
      var lastRow = ciSheet.getLastRow();
      ciSheet.getRange(lastRow, 1).setNumberFormat('@');
      ciSheet.getRange(lastRow, 1).setValue(cartId);
      return _respond({ success: true }, callback);
    }

    if (action === 'removefromcart') {
      var ciSheet = ss.getSheetByName('Device Location');
      if (!ciSheet) return _respond({ success: false, error: 'Sheet not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      var now = new Date();
      ciSheet.getRange(sheetRow, 6).setValue(Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy HH:mm:ss'));
      ciSheet.getRange(sheetRow, 7).setValue('Removed');
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

    // ---- RESOLVE PALLET AUDIT ISSUE ----
    if (action === 'resolvepalletauditissue') {
      var paiSheet = ss.getSheetByName('Pallet Audit Issues');
      if (!paiSheet) return _respond({ success: false, error: 'Sheet not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var resolutionNote = (e.parameter.resolutionnote || '').toString().trim();
      var sheetRow = row + 2;
      paiSheet.getRange(sheetRow, 6).setValue('RESOLVED');
      paiSheet.getRange(sheetRow, 7).setValue(resolutionNote);
      return _respond({ success: true }, callback);
    }

    // ---- READ PALLET AUDIT ISSUES ----
    if (action === 'readpalletauditissues') {
      var paiSheet = ss.getSheetByName('Pallet Audit Issues');
      if (!paiSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = paiSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = paiSheet.getRange(2, 1, lastRow - 1, 7).getValues();
      var headers = ['Pallet ID', 'IMEI', 'Timestamp', 'Reported By', 'Issue', 'Status', 'Resolution Note'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i] ? row[i].toString() : ''; });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- LOG PALLET AUDIT ISSUE ----
    if (action === 'logpalletauditissue') {
      var paiSheet = ss.getSheetByName('Pallet Audit Issues');
      if (!paiSheet) {
        paiSheet = ss.insertSheet('Pallet Audit Issues');
        paiSheet.getRange(1, 1, 1, 6).setValues([['Pallet ID', 'IMEI', 'Timestamp', 'Reported By', 'Issue', 'Status']]);
      }
      var palletId = (e.parameter.palletid || '').toString().trim();
      var imei = (e.parameter.imei || '').toString().trim();
      var reportedBy = (e.parameter.reportedby || '').toString().trim();
      var issue = (e.parameter.issue || '').toString().trim();

      if (!palletId || !imei) return _respond({ success: false, error: 'Pallet ID and IMEI required' }, callback);
      if (!issue) return _respond({ success: false, error: 'Issue description required' }, callback);

      var now = new Date();
      var ts = Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy HH:mm:ss') + ' EST';

      paiSheet.appendRow([palletId, imei, ts, reportedBy, issue, 'OPEN']);
      return _respond({ success: true, message: 'Issue logged' }, callback);
    }

    // ---- READ PALLET AUDITS ----
    if (action === 'readpalletaudits') {
      var paSheet = ss.getSheetByName('Pallet Audits');
      if (!paSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = paSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = paSheet.getRange(2, 1, lastRow - 1, 23).getValues();
      var headers = ['Pallet ID', 'Part Number', 'Audit Start Timestamp', '# of IMEIs on Pallet', '# of IMEIs Scanned During Audit', 'Audit Result', 'Audit Performed By', 'Notes', 'IMEI Scan #1', 'IMEI Scan #2', 'IMEI Scan #3', 'IMEI Scan #4', 'IMEI Scan #5', 'IMEI Scan #6', 'IMEI Scan #7', 'IMEI Scan #8', 'IMEI Scan #9', 'IMEI Scan #10', 'IMEI Scan #11', 'IMEI Scan #12', 'IMEI Scan #13', 'IMEI Scan #14', 'IMEI Scan #15'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i] ? row[i].toString() : ''; });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- LOG PALLET AUDIT ----
    if (action === 'logpalletaudit') {
      var paSheet = ss.getSheetByName('Pallet Audits');
      if (!paSheet) {
        paSheet = ss.insertSheet('Pallet Audits');
        paSheet.getRange(1, 1, 1, 23).setValues([['Pallet ID', 'Part Number', 'Audit Start Timestamp', '# of IMEIs on Pallet', '# of IMEIs Scanned During Audit', 'Audit Result', 'Audit Performed By', 'Notes', 'IMEI Scan #1', 'IMEI Scan #2', 'IMEI Scan #3', 'IMEI Scan #4', 'IMEI Scan #5', 'IMEI Scan #6', 'IMEI Scan #7', 'IMEI Scan #8', 'IMEI Scan #9', 'IMEI Scan #10', 'IMEI Scan #11', 'IMEI Scan #12', 'IMEI Scan #13', 'IMEI Scan #14', 'IMEI Scan #15']]);
      }
      var palletId = (e.parameter.palletid || '').toString().trim();
      var partNumber = (e.parameter.partnumber || '').toString().trim();
      var timestamp = (e.parameter.timestamp || '').toString().trim();
      var totalImeis = (e.parameter.totalimeis || '0').toString().trim();
      var scannedImeis = (e.parameter.scannedimeis || '0').toString().trim();
      var result = (e.parameter.result || '').toString().trim();
      var auditor = (e.parameter.auditor || '').toString().trim();
      var notes = (e.parameter.notes || '').toString().trim();

      if (!palletId) return _respond({ success: false, error: 'Pallet ID required' }, callback);
      if (!auditor) return _respond({ success: false, error: 'Auditor name required' }, callback);

      var row = [palletId, partNumber, timestamp, parseInt(totalImeis), parseInt(scannedImeis), result, auditor, notes];

      // Add up to 15 IMEI scans (columns I-W)
      for (var i = 1; i <= 15; i++) {
        var imeiVal = (e.parameter['imei' + i] || '').toString().trim();
        row.push(imeiVal);
      }

      paSheet.appendRow(row);
      return _respond({ success: true, message: 'Audit logged' }, callback);
    }

    // ---- READ REPAIR PALLETS ----
    if (action === 'readrepairpallets') {
      var rpSheet = ss.getSheetByName('Repair - Pallets');
      if (!rpSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = rpSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = rpSheet.getRange(2, 1, lastRow - 1, 6).getValues();
      var headers = ['Pallet ID', 'Pallet PO #', 'SKU', 'Pallet Status', 'Pallet Open Date', 'Pallet Close Date'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i] ? row[i].toString() : ''; });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- CREATE REPAIR PALLET ----
    if (action === 'createrepairpallet') {
      var rpSheet = ss.getSheetByName('Repair - Pallets');
      if (!rpSheet) {
        rpSheet = ss.insertSheet('Repair - Pallets');
        rpSheet.getRange(1, 1, 1, 6).setValues([['Pallet ID', 'Pallet PO #', 'SKU', 'Pallet Status', 'Pallet Open Date', 'Pallet Close Date']]);
      }
      var palletId = (e.parameter.palletid || '').toString().trim();
      var palletPO = (e.parameter.palletpo || '').toString().trim();
      var sku = (e.parameter.sku || 'WNC-CR200A-CLR').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID required' }, callback);
      if (!palletPO) return _respond({ success: false, error: 'Pallet PO # required' }, callback);

      var now = new Date();
      var ts = Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy h:mm:ss a') + ' EST';

      rpSheet.appendRow([palletId, palletPO, sku, 'Open', ts, '']);
      return _respond({ success: true, message: 'Pallet created' }, callback);
    }

    // ---- READ REPAIR PALLET BUILD (units) ----
    if (action === 'readrepairpalletbuild') {
      var rpbSheet = ss.getSheetByName('Repair - Pallet Build');
      if (!rpbSheet) return _respond({ success: true, data: [] }, callback);
      var lastRow = rpbSheet.getLastRow();
      if (lastRow < 2) return _respond({ success: true, data: [] }, callback);
      var data = rpbSheet.getRange(2, 1, lastRow - 1, 5).getValues();
      var headers = ['Pallet ID', 'IMEI', 'Put to Pallet Date', 'Removed from Pallet Date', 'Status'];
      var rows = data.map(function(row) {
        var obj = {};
        headers.forEach(function(h, i) { obj[h] = row[i] ? row[i].toString() : ''; });
        return obj;
      });
      return _respond({ success: true, data: rows }, callback);
    }

    // ---- ADD UNIT TO REPAIR PALLET ----
    if (action === 'addtorepairpallet') {
      var rpbSheet = ss.getSheetByName('Repair - Pallet Build');
      if (!rpbSheet) {
        rpbSheet = ss.insertSheet('Repair - Pallet Build');
        rpbSheet.getRange(1, 1, 1, 5).setValues([['Pallet ID', 'IMEI', 'Put to Pallet Date', 'Removed from Pallet Date', 'Status']]);
      }
      var palletId = (e.parameter.palletid || '').toString().trim();
      var imei = (e.parameter.imei || '').toString().trim();
      if (!palletId) return _respond({ success: false, error: 'Pallet ID required' }, callback);
      if (!imei) return _respond({ success: false, error: 'IMEI required' }, callback);

      var now = new Date();
      var ts = Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy h:mm:ss a') + ' EST';

      rpbSheet.appendRow([palletId, imei, ts, '', 'On Pallet']);
      return _respond({ success: true, message: 'Unit added to pallet' }, callback);
    }

    // ---- REMOVE UNIT FROM REPAIR PALLET ----
    if (action === 'removefromrepairpallet') {
      var rpbSheet = ss.getSheetByName('Repair - Pallet Build');
      if (!rpbSheet) return _respond({ success: false, error: 'Sheet not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      var now = new Date();
      var ts = Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy h:mm:ss a') + ' EST';
      rpbSheet.getRange(sheetRow, 4).setValue(ts);
      rpbSheet.getRange(sheetRow, 5).setValue('Removed');
      return _respond({ success: true }, callback);
    }

    // ---- CLOSE REPAIR PALLET ----
    if (action === 'closerepairpallet') {
      var rpSheet = ss.getSheetByName('Repair - Pallets');
      if (!rpSheet) return _respond({ success: false, error: 'Sheet not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      var now = new Date();
      var ts = Utilities.formatDate(now, Session.getScriptTimeZone(), 'M/d/yyyy h:mm:ss a') + ' EST';
      rpSheet.getRange(sheetRow, 4).setValue('Closed');
      rpSheet.getRange(sheetRow, 6).setValue(ts);
      return _respond({ success: true }, callback);
    }

    // ---- RE-OPEN REPAIR PALLET ----
    if (action === 'reopenrepairpallet') {
      var rpSheet = ss.getSheetByName('Repair - Pallets');
      if (!rpSheet) return _respond({ success: false, error: 'Sheet not found' }, callback);
      var row = parseInt(e.parameter.row);
      if (isNaN(row)) return _respond({ success: false, error: 'Row required' }, callback);
      var sheetRow = row + 2;
      rpSheet.getRange(sheetRow, 4).setValue('Open');
      rpSheet.getRange(sheetRow, 6).setValue('');
      return _respond({ success: true }, callback);
    }

    // ---- DEFAULT ----
    return _respond({ success: false, error: 'Unknown action: ' + action }, callback);

  } catch(err) {
    return _respond({ success: false, error: err.toString() }, callback);
  }
}
