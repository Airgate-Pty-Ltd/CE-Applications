// EDCAT: Runtime bootstrap. Injects tenant context into UI and wiring points.

(async () => {
  const runtimeContext = await window.EdcatTenantContext.loadTenantContext();

  if (runtimeContext) {
    window.__edcatContext = runtimeContext;
    const originalFetch = window.fetch;
    window.fetch = function edcatFetch(resource, init = {}) {
      const options = { ...init };
      options.headers = options.headers ? { ...options.headers } : {};
      options.headers['x-tenant-id'] = runtimeContext.tenant_id;
      return originalFetch(resource, options);
    };
  }

  // EDCAT RULE:
  // Requirement packs are atomic (e.g., Part 21 vs Part 145). Profiles compose packs.
  // On load we resolve the tenant, list configured packs, then verify them via RequirementsSync.

  document.addEventListener('DOMContentLoaded', async () => {
    const ctx = window.__edcatContext || runtimeContext;

    if (!ctx) {
      const errorEl = document.getElementById('edcat-error');
      if (errorEl) {
        errorEl.textContent = 'EDCAT configuration error: unable to load tenant environment.';
        errorEl.style.display = 'block';
      }
      return;
    }

  const tenantLabel = document.getElementById('edcat-tenant-label');
  const profileLabel = document.getElementById('edcat-profile-label');
  const heroCard = document.getElementById('edcat-hero-card');
  const runtimeMain = document.getElementById('edcat-runtime-main');
  const runtimePlaceholder = document.getElementById('edcat-runtime-placeholder');
  const profileListEl = document.getElementById('edcat-profile-list');
  const packsList = document.getElementById('edcat-packs-list');
  const packsStatus = document.getElementById('edcat-packs-status');

  const profiles = Array.isArray(ctx.profiles) ? ctx.profiles : [];
  const primaryProfile =
    (ctx.primaryProfileId && profiles.find((profile) => profile.profile_id === ctx.primaryProfileId)) ||
    profiles[0] ||
    null;

  if (tenantLabel) {
    tenantLabel.textContent = ctx.tenant.branding?.display_name || ctx.tenant.tenant_name;
  }

  if (profileLabel) {
    if (primaryProfile) {
      const extraCount = profiles.length > 1 ? ` (+${profiles.length - 1} more)` : '';
      profileLabel.textContent = primaryProfile.label + extraCount;
    } else {
      profileLabel.textContent = 'Profiles not configured';
    }
  }

  if (heroCard) {
    heroCard.classList.remove('deferred-hidden');
  }

  if (runtimeMain) {
    runtimeMain.classList.remove('deferred-hidden');
  }
  if (runtimePlaceholder) {
    runtimePlaceholder.style.display = 'none';
  }

  if (profileListEl) {
    profileListEl.innerHTML = '';
    if (!profiles.length) {
      profileListEl.innerHTML = '<li>No compliance profiles configured for this tenant.</li>';
    } else {
      profiles.forEach((profile) => {
        const li = document.createElement('li');
        const tenantTypes = Array.isArray(profile.tenant_types_allowed) && profile.tenant_types_allowed.length
          ? profile.tenant_types_allowed.join(', ')
          : 'All tenant types';
        li.innerHTML = `<strong>${profile.label}</strong><br /><small>${profile.profile_id} • ${tenantTypes}</small>`;
        if (ctx.primaryProfileId && profile.profile_id === ctx.primaryProfileId) {
          li.classList.add('edcat-profile-primary');
        }
        profileListEl.appendChild(li);
      });
    }
  }

  if (packsList) {
    packsList.innerHTML = '';
    if (!Array.isArray(ctx.requirementPacks) || !ctx.requirementPacks.length) {
      packsList.innerHTML = '<li>No requirement packs available for the configured profiles.</li>';
    } else {
      ctx.requirementPacks.forEach((pack) => {
        const item = document.createElement('li');
        const metaPieces = [];
        if (pack.authority) metaPieces.push(pack.authority);
        if (pack.country) metaPieces.push(pack.country);
        if (pack.sector) metaPieces.push(pack.sector);
        item.innerHTML = `<strong>${pack.label}</strong><br /><small>${metaPieces.join(' • ') || pack.type || ''}</small>`;
        packsList.appendChild(item);
      });
    }
  }

  const errorEl = document.getElementById('edcat-error');
  if (errorEl) {
    errorEl.style.display = 'none';
  }

  if (packsStatus) {
    packsStatus.innerHTML = '<div class="edcat-pack-status-row pending">Checking requirement packs…</div>';
    if (window.RequirementsSync) {
      try {
        const results = await window.RequirementsSync.syncPacks(ctx);
        if (!results.length) {
          packsStatus.innerHTML = '<div class="edcat-pack-status-row">No requirement packs configured for this profile.</div>';
        } else {
          packsStatus.innerHTML = '';
          results.forEach((result) => {
            const pack = ctx.requirementPacks.find((item) => item.id === result.pack_id);
            if (!pack) return;
            const row = document.createElement('div');
            row.className = 'edcat-pack-status-row';

            const label = document.createElement('div');
            label.className = 'edcat-pack-status-label';
            label.textContent = pack.label;

            const state = document.createElement('span');
            state.className = 'edcat-pack-status-state';
            if (result.changed) {
              state.textContent = 'UPDATED – Review changes';
              state.classList.add('edcat-pack-status-updated');
            } else {
              state.textContent = 'Up to date';
              state.classList.add('edcat-pack-status-ok');
            }

            const meta = document.createElement('span');
            meta.className = 'edcat-pack-status-meta';
            const checked = result.last_checked ? new Date(result.last_checked).toLocaleString() : 'Unknown';
            meta.textContent = `Last checked: ${checked}`;

            row.appendChild(label);
            row.appendChild(state);
            row.appendChild(meta);

            if (result.change_summary) {
              const summary = document.createElement('div');
              summary.className = 'edcat-pack-status-summary';
              summary.textContent = result.change_summary;
              row.appendChild(summary);
            }

            packsStatus.appendChild(row);
          });
        }
      } catch (error) {
        console.error('Requirements sync failed:', error);
        packsStatus.innerHTML = `<div class="edcat-pack-status-row error">Failed to verify requirement packs: ${error.message}</div>`;
      }
    } else {
      packsStatus.innerHTML = '<div class="edcat-pack-status-row">RequirementsSync module unavailable.</div>';
    }
  }
});

})();
