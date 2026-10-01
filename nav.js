// ============================================================
// RAN Test & Repair Demo — Shared Sidebar Navigation
// renderNav(activePage) injects the sidebar nav into #sidebarNav
// and wires up collapsible groups. Keeps every page in sync.
// ============================================================
(function () {
  var NAV = [
    {
      section: 'Workflow',
      links: [
        { href: 'index.html', icon: '\uD83C\uDFE0', label: 'Overview' },
        { href: 'receive.html', icon: '\uD83D\uDCE5', label: 'Receive' },
        { href: 'test-record.html', icon: '\uD83E\uDDEA', label: 'Test Record' },
        { href: 'repair-record.html', icon: '\uD83D\uDD27', label: 'Repair Record' },
        { href: 'unrepairable-record.html', icon: '\u26D4', label: 'Unrepairable Record' },
        { href: 'repair-code-entry.html', icon: '\uD83C\uDFF7\uFE0F', label: 'Repair Code Entry' },
        { href: 'ship.html', icon: '\uD83D\uDE9A', label: 'Ship' },
        { href: 'orders.html', icon: '\uD83D\uDCCB', label: 'Order History' }
      ]
    },
    {
      section: 'System',
      links: [
        { href: 'part-numbers.html', icon: '\uD83D\uDD22', label: 'Part Numbers' },
        { href: 'settings.html', icon: '\u2699\uFE0F', label: 'Settings' }
      ]
    }
  ];

  window.renderNav = function (activePage) {
    var nav = document.getElementById('sidebarNav');
    if (!nav) return;
    var html = '';
    NAV.forEach(function (group) {
      var hasActive = group.links.some(function (l) { return l.href === activePage; });
      html += '<div class="nav-section" onclick="toggleNavGroup(this)">' + (hasActive ? '\u25BC ' : '\u25B6 ') + group.section + '</div>';
      html += '<div class="nav-group' + (hasActive ? ' open' : '') + '">';
      group.links.forEach(function (l) {
        html += '<a href="' + l.href + '"' + (l.href === activePage ? ' class="active"' : '') + '>'
          + '<span class="icon">' + l.icon + '</span> ' + l.label + '</a>';
      });
      html += '</div>';
    });
    nav.innerHTML = html;
  };

  window.toggleNavGroup = function (el) {
    var group = el.nextElementSibling;
    if (group && group.classList.contains('nav-group')) {
      group.classList.toggle('open');
      el.textContent = (group.classList.contains('open') ? '\u25BC ' : '\u25B6 ') + el.textContent.replace(/^[\u25B6\u25BC] /, '');
    }
  };
})();
