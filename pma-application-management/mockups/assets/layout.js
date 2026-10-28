/* Shared chrome for the PMA Autopilot static mockups. Injects the topbar +
   sidebar and wires the theme / font-scale controls. Pure presentation — these
   pages are drafts and are not connected to a backend. */
(function () {
  var NAV = [
    { page: 'dashboard', href: 'dashboard.html', icon: '▦', label: 'Dashboard' },
    { page: 'cases', href: 'archive.html', icon: '🗂', label: 'Cases' },
    { page: 'library', href: 'library.html', icon: '📚', label: 'Library' },
    { page: 'registry', href: 'registry.html', icon: '🛡', label: 'Registry' },
    { page: 'settings', href: 'settings.html', icon: '⚙', label: 'Settings' },
  ];

  function applySettings() {
    var t = localStorage.getItem('ce-theme') || 'dark';
    var f = localStorage.getItem('ce-font') || 'default';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-font', f);
  }
  window.setFont = function (s) {
    document.documentElement.setAttribute('data-font', s);
    localStorage.setItem('ce-font', s);
  };
  window.toggleTheme = function () {
    var n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    localStorage.setItem('ce-theme', n);
  };

  function topbar() {
    var el = document.createElement('header');
    el.className = 'topbar';
    el.innerHTML =
      '<div class="brand">CONFORM<em>-</em>EDGE <span class="brand-tool">· PMA Autopilot</span></div>' +
      '<div class="tsep"></div>' +
      '<div class="tstat"><div class="tdot ok"></div><span>Online</span></div>' +
      '<div class="tsp"></div>' +
      '<span class="small muted" style="margin-right:10px">Ada Admin · ADMIN</span>' +
      '<div class="tctrl">' +
      '<button class="ib" onclick="setFont(\'compact\')" title="Compact">A−</button>' +
      '<button class="ib on" onclick="setFont(\'default\')" title="Default">A</button>' +
      '<button class="ib" onclick="setFont(\'large\')" title="Large">A+</button>' +
      '<div class="tsep"></div>' +
      '<button class="ib" onclick="toggleTheme()" title="Toggle theme">◑</button>' +
      '</div>';
    return el;
  }

  function sidebar(active) {
    var el = document.createElement('nav');
    el.className = 'sidebar';
    el.innerHTML =
      NAV.map(function (n) {
        return (
          '<a class="nav-item ' + (n.page === active ? 'active' : '') + '" href="' + n.href + '">' +
          '<span class="nav-ico">' + n.icon + '</span> ' + n.label + '</a>'
        );
      }).join('') +
      '<div style="margin-top:20px"><a class="nav-item" href="login.html"><span class="nav-ico">⏻</span> Sign out</a></div>' +
      '<div class="wm"><div class="wm-note">Drafts only — never for FAA submission</div></div>';
    return el;
  }

  document.addEventListener('DOMContentLoaded', function () {
    applySettings();
    var layout = document.querySelector('.layout');
    if (layout) {
      document.body.insertBefore(topbar(), document.body.firstChild);
      layout.insertBefore(sidebar(document.body.dataset.page || ''), layout.firstChild);
    }
    var flag = document.createElement('div');
    flag.className = 'mock-flag';
    flag.textContent = 'Draft mockup';
    document.body.appendChild(flag);
  });
})();
