(function () {
  const API_BASE = '/api/edcat';
  const COUNTRY_OPTIONS = [
    'United States',
    'Australia',
    'European Union',
    'United Kingdom',
    'Canada',
    'Brazil',
    'China',
    'India',
    'United Arab Emirates',
    'Singapore',
    'New Zealand'
  ];

  const state = {
    tenants: [],
    activeTenantId: null,
    profiles: [],
    requirementPacks: []
  };

  function byId(id) {
    return document.getElementById(id);
  }

  const els = {
    runtimeView: byId('runtimeView'),
    adminConsole: byId('adminConsole'),
    toggleBtn: byId('toggleAdminViewBtn'),
    adminThemeToggle: byId('adminThemeToggle'),
    adminCreateTenant: byId('adminCreateTenant'),
    adminRunVerification: byId('adminRunVerification'),
    adminTenantSidebar: byId('adminTenantStack'),
    adminTenantPanel: byId('adminTenantPanel'),
    adminTenantClose: byId('adminTenantClose'),
    adminTenantForm: byId('adminTenantForm'),
    adminTenantTitle: byId('adminTenantTitle'),
    adminTenantId: byId('adminTenantId'),
    adminTenantHiddenId: byId('adminTenantHiddenId'),
    adminTenantName: byId('adminTenantName'),
    adminTenantType: byId('adminTenantType'),
    adminTenantCountry: byId('adminTenantCountry'),
    adminBrandDisplay: byId('adminBrandDisplay'),
    adminBrandLogo: byId('adminBrandLogo'),
    adminBasePath: byId('adminBasePath'),
    adminDbInstance: byId('adminDbInstance'),
    adminProfileSelector: byId('adminProfileSelector'),
    adminStandardsOptions: byId('adminStandardsOptions'),
    adminRegPacksOptions: byId('adminRegPacksOptions'),
    adminStandardsHidden: byId('adminStandardsHidden'),
    adminRegPacksHidden: byId('adminRegPacksHidden'),
    adminPrimaryAdminEmail: byId('adminPrimaryAdminEmail'),
    adminTechnicalEmail: byId('adminTechnicalEmail'),
    adminSubscriptionPlan: byId('adminSubscriptionPlan'),
    adminSubscriptionStatus: byId('adminSubscriptionStatus'),
    adminHealthStatus: byId('adminHealthStatus'),
    adminLastHealthCheck: byId('adminLastHealthCheck'),
    adminInternalNotes: byId('adminInternalNotes'),
    adminSaveTenant: byId('adminSaveTenant'),
    adminDeleteTenant: byId('adminDeleteTenant'),
    adminProvisionTenant: byId('adminProvisionTenant'),
    adminVerificationLog: byId('adminVerificationLog'),
    adminProfileCatalog: byId('adminProfileCatalog'),
    adminProfileForm: byId('adminProfileForm'),
    adminProfileHiddenId: byId('adminProfileHiddenId'),
    adminProfileId: byId('adminProfileId'),
    adminProfileLabel: byId('adminProfileLabel'),
    adminProfileDescription: byId('adminProfileDescription'),
    adminProfileTenantTypes: byId('adminProfileTenantTypes'),
    adminProfileStandardsOptions: byId('adminProfileStandardsOptions'),
    adminProfileRegPacksOptions: byId('adminProfileRegPacksOptions'),
    adminProfileRegulatorLinks: byId('adminProfileRegulatorLinks'),
    adminProfileAllowCustomer: byId('adminProfileAllowCustomer'),
    adminProfileDelete: byId('adminProfileDelete'),
    adminProfileReset: byId('adminProfileReset'),
    adminRefreshFeeds: byId('adminRefreshFeeds'),
    adminRegulatoryFeeds: byId('adminRegulatoryFeeds')
  };

  function toggleView() {
    if (!els.runtimeView || !els.adminConsole) return;
    const showingAdmin = !els.adminConsole.classList.contains('hidden');
    if (showingAdmin) {
      els.adminConsole.classList.add('hidden');
      els.adminConsole.setAttribute('aria-hidden', 'true');
      els.runtimeView.classList.remove('hidden');
      if (els.toggleBtn) {
        els.toggleBtn.textContent = '🛠️ Provisioning Console';
      }
    } else {
      els.runtimeView.classList.add('hidden');
      els.adminConsole.classList.remove('hidden');
      els.adminConsole.setAttribute('aria-hidden', 'false');
      if (els.toggleBtn) {
        els.toggleBtn.textContent = '⬅️ Back to Assessments';
      }
    }
  }

  function setTheme(mode) {
    const theme = mode === 'light' ? 'light' : 'dark';
    document.body.dataset.theme = theme;
    window.localStorage.setItem('edcat-admin-theme', theme);
  }

  function toggleTheme() {
    const current = document.body.dataset.theme || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function readThemePreference() {
    return window.localStorage.getItem('edcat-admin-theme') || 'dark';
  }

  async function fetchTenants() {
    try {
      if (window.TenantService && typeof window.TenantService.listTenants === 'function') {
        state.tenants = await window.TenantService.listTenants({ force: true });
      } else {
        const response = await fetch(`${API_BASE}/tenants-list`);
        const payload = await response.json();
        state.tenants = Array.isArray(payload.tenants) ? payload.tenants : [];
      }
      if (window.TenantService && typeof window.TenantService.hydrate === 'function') {
        window.TenantService.hydrate(state.tenants);
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
      state.tenants = [];
    }
    renderTenantSidebar();
  }

  function renderTenantSidebar() {
    if (!els.adminTenantSidebar) return;
    if (!state.tenants.length) {
      els.adminTenantSidebar.innerHTML = '<div class="empty-state">No customers yet.</div>';
      return;
    }

    els.adminTenantSidebar.innerHTML = '';
    state.tenants.forEach((tenant) => {
      const item = document.createElement('button');
      item.className = 'tenant-item';
      if (tenant.tenant_id === state.activeTenantId) {
        item.classList.add('active');
      }
      const status = document.createElement('span');
      status.className = `status-dot status-${tenant.health_status || 'good'}`;
      item.appendChild(status);
      const label = document.createElement('span');
      label.className = 'tenant-name';
      label.textContent = tenant.tenant_name || tenant.tenant_id;
      item.appendChild(label);
      item.addEventListener('click', () => openTenant(tenant.tenant_id));
      els.adminTenantSidebar.appendChild(item);
    });
  }

  async function openTenant(tenantId) {
    try {
      let tenant = null;
      if (window.TenantService && typeof window.TenantService.getTenant === 'function') {
        tenant = await window.TenantService.getTenant(tenantId, { force: true });
      } else {
        const response = await fetch(`${API_BASE}/tenants/${tenantId}`);
        if (!response.ok) throw new Error('Unable to fetch tenant');
        const payload = await response.json();
        tenant = payload.tenant;
      }
      if (tenant) {
        state.activeTenantId = tenantId;
        renderTenantSidebar();
        populateTenantForm(tenant);
      }
    } catch (error) {
      console.error('Failed to load tenant', error);
    }
  }

  function applyAutoPacks(config) {
    const type = (config.tenant_type || '').toLowerCase();
    const country = (config.country || '').toLowerCase();
    const regPacks = new Set(config.reg_packs_enabled || []);
    const standards = new Set(config.standards_enabled || []);

    const addReg = (id) => id && regPacks.add(id);
    const addStd = (id) => id && standards.add(id);

    const countryMap = {
      'united states': ['REGPACK_FAA_PART21', 'REGPACK_FAA_PART145'],
      usa: ['REGPACK_FAA_PART21', 'REGPACK_FAA_PART145'],
      australia: ['REGPACK_CASA_PART21', 'REGPACK_CASA_PART145'],
      'european union': ['REGPACK_EASA_PART21', 'REGPACK_EASA_PART145'],
      'united kingdom': ['REGPACK_UKCAA_PART21', 'REGPACK_UKCAA_PART145'],
      uk: ['REGPACK_UKCAA_PART21', 'REGPACK_UKCAA_PART145'],
      canada: ['REGPACK_TCCA_PART21', 'REGPACK_TCCA_PART145'],
      brazil: ['REGPACK_ANAC_PART21', 'REGPACK_ANAC_PART145'],
      china: ['REGPACK_CAAC_PART21', 'REGPACK_CAAC_PART145'],
      india: ['REGPACK_DGCA_PART21', 'REGPACK_DGCA_PART145'],
      'united arab emirates': ['REGPACK_GCAA_PART21', 'REGPACK_GCAA_PART145'],
      singapore: ['REGPACK_CAAS_PART21', 'REGPACK_CAAS_PART145'],
      'new zealand': ['REGPACK_CAANZ_PART21', 'REGPACK_CAANZ_PART145']
    };

    const packsForCountry = countryMap[country];
    if (packsForCountry) packsForCountry.forEach(addReg);

    if (type === 'oem' || type === 'oem_mro') addStd('STANDARD_AS9100');
    if (type === 'mro' || type === 'oem_mro') addStd('STANDARD_AS9110');

    return {
      ...config,
      reg_packs_enabled: Array.from(regPacks),
      standards_enabled: Array.from(standards)
    };
  }

  function readTenantForm() {
    const tenantIdInput = (els.adminTenantId.value || '').trim();
    const existingId = (els.adminTenantHiddenId.value || '').trim();
    const tenantId = tenantIdInput || existingId || undefined;

    const allowedProfiles = Array.from(
      els.adminProfileSelector?.querySelectorAll('input[type="checkbox"][data-role="profile-include"]:checked') || []
    ).map((input) => input.value);

    const primaryProfile =
      (els.adminProfileSelector?.querySelector('input[type="radio"][name="profilePrimary"]:checked') || {}).value ||
      null;

    if (primaryProfile && !allowedProfiles.includes(primaryProfile)) {
      allowedProfiles.unshift(primaryProfile);
    }

    const standardsEnabled = els.adminStandardsHidden.value
      ? els.adminStandardsHidden.value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

    const regPacksEnabled = els.adminRegPacksHidden.value
      ? els.adminRegPacksHidden.value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

    const tenantType = els.adminTenantType.value;
    const tenantTypes = tenantType ? [tenantType] : [];

    const config = {
      tenant_id: tenantId,
      tenant_name: els.adminTenantName.value.trim(),
      tenant_type: tenantType,
      tenant_types: tenantTypes,
      country: els.adminTenantCountry.value,
      branding: {
        display_name: els.adminBrandDisplay.value.trim() || els.adminTenantName.value.trim(),
        logo_url: els.adminBrandLogo.value.trim() || null
      },
      base_url: window.location.origin || '',
      base_path: els.adminBasePath.value.trim() || `/Modules/edcat/ui/edcat.html?tenant_id=${tenantId || ''}`,
      db_instance_name: els.adminDbInstance.value.trim(),
      allowed_profiles: allowedProfiles,
      active_profile_id: primaryProfile,
      standards_enabled: standardsEnabled,
      reg_packs_enabled: regPacksEnabled,
      primary_admin_email: els.adminPrimaryAdminEmail.value.trim(),
      technical_contact_email: els.adminTechnicalEmail.value.trim(),
      subscription_plan: els.adminSubscriptionPlan.value,
      subscription_status: els.adminSubscriptionStatus.value,
      health_status: els.adminHealthStatus.value,
      last_health_check: els.adminLastHealthCheck.value ? new Date(els.adminLastHealthCheck.value).toISOString() : null,
      internal_notes: els.adminInternalNotes.value.trim()
    };

    // Maintain legacy field for backward compatibility with older APIs
    if (primaryProfile) {
      config.profile_id = primaryProfile;
    }

    return applyAutoPacks(config);
  }

  function setMultiSelect(container, hiddenInput, options, selectedValues) {
    if (!container) return;
    container.innerHTML = '';
    const selected = new Set(selectedValues || []);
    options.forEach((pack) => {
      const label = document.createElement('label');
      label.className = 'multi-select-item';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = pack.id;
      checkbox.checked = selected.has(pack.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          selected.add(pack.id);
        } else {
          selected.delete(pack.id);
        }
        if (hiddenInput) {
          hiddenInput.value = Array.from(selected).join(',');
        }
      });
      const text = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = pack.label;
      const meta = document.createElement('small');
      const metaParts = [];
      if (pack.authority) metaParts.push(pack.authority);
      if (pack.country) metaParts.push(pack.country);
      if (pack.sector) metaParts.push(pack.sector);
      meta.textContent = metaParts.join(' • ');
      text.appendChild(title);
      text.appendChild(meta);
      label.appendChild(checkbox);
      label.appendChild(text);
      container.appendChild(label);
    });
    if (hiddenInput) {
      hiddenInput.value = Array.from(selected).join(',');
    }
  }

  function renderProfileSelector(tenantsProfiles = [], primaryProfileId = null) {
    if (!els.adminProfileSelector) return;
    const profiles = state.profiles;
    const selected = new Set(tenantsProfiles);
    els.adminProfileSelector.innerHTML = '';
    profiles.forEach((profile) => {
      const card = document.createElement('label');
      card.className = 'profile-card';
      const includeCheckbox = document.createElement('input');
      includeCheckbox.type = 'checkbox';
      includeCheckbox.value = profile.profile_id;
      includeCheckbox.dataset.role = 'profile-include';
      includeCheckbox.checked = selected.has(profile.profile_id);
      const primaryRadio = document.createElement('input');
      primaryRadio.type = 'radio';
      primaryRadio.name = 'profilePrimary';
      primaryRadio.value = profile.profile_id;
      primaryRadio.dataset.role = 'profile-primary';
      primaryRadio.checked = profile.profile_id === primaryProfileId;
      if (!includeCheckbox.checked) {
        primaryRadio.disabled = true;
      }
      includeCheckbox.addEventListener('change', () => {
        if (!includeCheckbox.checked) {
          selected.delete(profile.profile_id);
          if (primaryRadio.checked) {
            primaryRadio.checked = false;
          }
          primaryRadio.disabled = true;
        } else {
          selected.add(profile.profile_id);
          primaryRadio.disabled = false;
          if (!els.adminProfileSelector.querySelector('input[name="profilePrimary"]:checked')) {
            primaryRadio.checked = true;
          }
        }
      });
      const body = document.createElement('div');
      body.className = 'profile-card-body';
      const title = document.createElement('strong');
      title.textContent = profile.label;
      const subtitle = document.createElement('small');
      subtitle.textContent =
        (Array.isArray(profile.tenant_types_allowed) && profile.tenant_types_allowed.join(', ')) ||
        'All tenant types';
      body.appendChild(title);
      body.appendChild(subtitle);
      card.appendChild(includeCheckbox);
      card.appendChild(primaryRadio);
      card.appendChild(body);
      els.adminProfileSelector.appendChild(card);
    });
  }

  function populateTenantForm(tenant) {
    if (!tenant) return;
    if (els.adminTenantPanel) {
      els.adminTenantPanel.classList.remove('hidden');
    }
    els.adminTenantHiddenId.value = tenant.tenant_id || '';
    els.adminTenantId.value = tenant.tenant_id || '';
    els.adminTenantName.value = tenant.tenant_name || '';
    els.adminTenantType.value = tenant.tenant_type || '';
    els.adminTenantCountry.value = tenant.country || '';
    els.adminBrandDisplay.value = tenant.branding?.display_name || '';
    els.adminBrandLogo.value = tenant.branding?.logo_url || '';
    els.adminBasePath.value = tenant.base_path || '';
    els.adminDbInstance.value = tenant.db_instance_name || '';
    els.adminPrimaryAdminEmail.value = tenant.primary_admin_email || '';
    els.adminTechnicalEmail.value = tenant.technical_contact_email || '';
    els.adminSubscriptionPlan.value = tenant.subscription_plan || 'trial';
    els.adminSubscriptionStatus.value = tenant.subscription_status || 'trial';
    els.adminHealthStatus.value = tenant.health_status || 'good';
    els.adminLastHealthCheck.value = tenant.last_health_check
      ? new Date(tenant.last_health_check).toISOString().slice(0, 16)
      : '';
    els.adminInternalNotes.value = tenant.internal_notes || '';
    const primaryProfileId = tenant.active_profile_id || tenant.profile_id || null;
    renderProfileSelector(tenant.allowed_profiles || [], primaryProfileId);
    setMultiSelect(
      els.adminStandardsOptions,
      els.adminStandardsHidden,
      state.requirementPacks.filter((p) => p.type === 'standard'),
      tenant.standards_enabled
    );
    setMultiSelect(
      els.adminRegPacksOptions,
      els.adminRegPacksHidden,
      state.requirementPacks.filter((p) => p.type === 'regulation'),
      tenant.reg_packs_enabled
    );
    const primaryProfileId = tenant.active_profile_id || tenant.profile_id || null;
    renderProfileSelector(tenant.allowed_profiles || [], primaryProfileId);
    els.adminTenantTitle.textContent = `Customer: ${tenant.tenant_name || tenant.tenant_id}`;
  }

  async function handleTenantSubmit(event) {
    event.preventDefault();
    try {
      const payload = readTenantForm();
      const tenant =
        window.TenantService && typeof window.TenantService.upsertTenant === 'function'
          ? await window.TenantService.upsertTenant(payload)
          : await (async () => {
              const response = await fetch(`${API_BASE}/tenants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const body = await response.json();
              return body.tenant;
            })();
      if (tenant) {
        state.activeTenantId = tenant.tenant_id;
        if (!tenant.provisioned && window.TenantService && typeof window.TenantService.provisionTenant === 'function') {
          await window.TenantService.provisionTenant(tenant.tenant_id);
          appendVerificationLog(`Automatically provisioned tables for ${tenant.tenant_name || tenant.tenant_id}.`);
        }
        await fetchTenants();
        openTenant(tenant.tenant_id);
      }
    } catch (error) {
      console.error('Failed to save tenant', error);
    }
  }

  async function handleProvision() {
    if (!state.activeTenantId) return;
    try {
      if (window.TenantService && typeof window.TenantService.provisionTenant === 'function') {
        await window.TenantService.provisionTenant(state.activeTenantId);
      } else {
        await fetch(`${API_BASE}/tenants/${state.activeTenantId}/provision`, { method: 'POST' });
      }
      appendVerificationLog(`Provisioned customer tables at ${new Date().toLocaleString()}`);
      await fetchTenants();
      openTenant(state.activeTenantId);
    } catch (error) {
      console.error('Provision failed', error);
      appendVerificationLog(`Provision failed: ${error.message}`);
    }
  }

  function appendVerificationLog(message) {
    if (!els.adminVerificationLog) return;
    els.adminVerificationLog.classList.remove('empty-state');
    const entry = document.createElement('div');
    entry.className = 'verification-entry';
    entry.textContent = message;
    els.adminVerificationLog.prepend(entry);
  }

  async function handleVerification() {
    if (!state.activeTenantId) return;
    try {
      const response =
        window.TenantService && typeof window.TenantService.verifyTenant === 'function'
          ? await window.TenantService.verifyTenant(state.activeTenantId)
          : await (await fetch(`${API_BASE}/tenants/${state.activeTenantId}/verify`)).json();
      const status = response.ok ? '✅ OK' : '⚠️ Issues detected';
      appendVerificationLog(`${status} (${response.checked_at})`);
      if (Array.isArray(response.issues) && response.issues.length) {
        response.issues.forEach((issue) => appendVerificationLog(` • ${issue}`));
      }
    } catch (error) {
      console.error('Verification failed', error);
      appendVerificationLog(`Verification failed: ${error.message}`);
    }
  }

  function resetTenantForm() {
    if (!els.adminTenantPanel) return;
    els.adminTenantPanel.classList.remove('hidden');
    els.adminTenantForm.reset();
    els.adminTenantHiddenId.value = '';
    els.adminTenantId.value = '';
    els.adminVerificationLog.innerHTML = 'Run verification to view results.';
    els.adminVerificationLog.classList.add('empty-state');
    renderProfileSelector([], null);
    setMultiSelect(els.adminStandardsOptions, els.adminStandardsHidden, state.requirementPacks.filter((p) => p.type === 'standard'), []);
    setMultiSelect(els.adminRegPacksOptions, els.adminRegPacksHidden, state.requirementPacks.filter((p) => p.type === 'regulation'), []);
    els.adminTenantTitle.textContent = 'New Customer';
  }

  function renderCountryOptions() {
    if (!els.adminTenantCountry) return;
    els.adminTenantCountry.innerHTML = '<option value="">Select country…</option>';
    COUNTRY_OPTIONS.forEach((country) => {
      const option = document.createElement('option');
      option.value = country;
      option.textContent = country;
      els.adminTenantCountry.appendChild(option);
    });
  }

  function loadProfilesAndPacks() {
    if (window.ProfilesConfig && typeof window.ProfilesConfig.getAllProfiles === 'function') {
      state.profiles = window.ProfilesConfig.getAllProfiles();
    }
    if (window.RequirementsConfig && typeof window.RequirementsConfig.listPacks === 'function') {
      state.requirementPacks = window.RequirementsConfig.listPacks();
    }
    renderProfileSelector([], null);
    setMultiSelect(els.adminStandardsOptions, els.adminStandardsHidden, state.requirementPacks.filter((p) => p.type === 'standard'), []);
    setMultiSelect(els.adminRegPacksOptions, els.adminRegPacksHidden, state.requirementPacks.filter((p) => p.type === 'regulation'), []);
    renderProfileCatalog();
    renderProfileFormOptions();
  }

  function renderProfileCatalog() {
    if (!els.adminProfileCatalog) return;
    if (!state.profiles.length) {
      els.adminProfileCatalog.innerHTML = '<div class="empty-state">No profiles configured.</div>';
      return;
    }
    els.adminProfileCatalog.innerHTML = '';
    state.profiles.forEach((profile) => {
      const details = document.createElement('details');
      details.className = 'profile-entry';
      const summary = document.createElement('summary');
      summary.innerHTML = `<strong>${profile.label}</strong><small>${profile.profile_id}</small>`;
      details.appendChild(summary);
      const body = document.createElement('div');
      body.className = 'profile-entry-body';
      body.innerHTML = `
        <p><strong>Tenant types:</strong> ${(profile.tenant_types_allowed || []).join(', ') || 'All'}</p>
        <p><strong>Standards:</strong> ${(profile.enabled_standards || []).join(', ') || 'None'}</p>
        <p><strong>Reg Packs:</strong> ${(profile.enabled_reg_packs || []).join(', ') || 'None'}</p>
      `;
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn-ghost';
      editBtn.textContent = 'Edit Profile';
      editBtn.addEventListener('click', () => populateProfileForm(profile));
      body.appendChild(editBtn);
      details.appendChild(body);
      els.adminProfileCatalog.appendChild(details);
    });
  }

  function renderProfileFormOptions() {
    if (!els.adminProfileTenantTypes) return;
    const tenantTypes = ['regulator', 'cert_body', 'enterprise', 'oem', 'mro', 'consultant', 'oem_mro'];
    els.adminProfileTenantTypes.innerHTML = '';
    tenantTypes.forEach((type) => {
      const label = document.createElement('label');
      label.className = 'choice-pill';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = type;
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(type));
      els.adminProfileTenantTypes.appendChild(label);
    });

    setMultiSelect(
      els.adminProfileStandardsOptions,
      null,
      state.requirementPacks.filter((p) => p.type === 'standard'),
      []
    );
    setMultiSelect(
      els.adminProfileRegPacksOptions,
      null,
      state.requirementPacks.filter((p) => p.type === 'regulation'),
      []
    );
  }

  function populateProfileForm(profile) {
    if (!profile) return;
    els.adminProfileHiddenId.value = profile.profile_id;
    els.adminProfileId.value = profile.profile_id;
    els.adminProfileLabel.value = profile.label;
    els.adminProfileDescription.value = profile.description || '';
    Array.from(els.adminProfileTenantTypes.querySelectorAll('input[type="checkbox"]')).forEach((checkbox) => {
      checkbox.checked = Array.isArray(profile.tenant_types_allowed) && profile.tenant_types_allowed.includes(checkbox.value);
    });
    setMultiSelect(
      els.adminProfileStandardsOptions,
      null,
      state.requirementPacks.filter((p) => p.type === 'standard'),
      profile.enabled_standards
    );
    setMultiSelect(
      els.adminProfileRegPacksOptions,
      null,
      state.requirementPacks.filter((p) => p.type === 'regulation'),
      profile.enabled_reg_packs
    );
    if (els.adminProfileRegulatorLinks) {
      els.adminProfileRegulatorLinks.value = (profile.regulator_links || []).join('\n');
    }
    els.adminProfileAllowCustomer.checked = Boolean(profile.allow_customer_requirements);
  }

  function readProfileForm() {
    const tenantTypes = Array.from(
      els.adminProfileTenantTypes.querySelectorAll('input[type="checkbox"]:checked')
    ).map((input) => input.value);
    const enabledStandards = Array.from(
      els.adminProfileStandardsOptions.querySelectorAll('input[type="checkbox"]:checked')
    ).map((input) => input.value);
    const enabledRegPacks = Array.from(
      els.adminProfileRegPacksOptions.querySelectorAll('input[type="checkbox"]:checked')
    ).map((input) => input.value);
    return {
      profile_id: els.adminProfileId.value.trim(),
      label: els.adminProfileLabel.value.trim(),
      description: els.adminProfileDescription.value.trim(),
      tenant_types_allowed: tenantTypes,
      enabled_standards: enabledStandards,
      enabled_reg_packs: enabledRegPacks,
      regulator_links: els.adminProfileRegulatorLinks.value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      allow_customer_requirements: els.adminProfileAllowCustomer.checked
    };
  }

  function handleProfileSubmit(event) {
    event.preventDefault();
    const profile = readProfileForm();
    const existingIdx = state.profiles.findIndex((p) => p.profile_id === profile.profile_id);
    if (existingIdx >= 0) {
      state.profiles[existingIdx] = { ...state.profiles[existingIdx], ...profile };
    } else {
      state.profiles.push(profile);
    }
    renderProfileCatalog();
    renderProfileSelector(
      Array.from(els.adminProfileSelector.querySelectorAll('input[type="checkbox"][data-role="profile-include"]:checked')).map((input) => input.value),
      (els.adminProfileSelector.querySelector('input[name="profilePrimary"]:checked') || {}).value || null
    );
    els.adminProfileForm.reset();
    renderProfileFormOptions();
  }

  function handleProfileReset() {
    els.adminProfileForm.reset();
    els.adminProfileHiddenId.value = '';
    renderProfileFormOptions();
  }

  function initRegulatoryFeeds() {
    if (!els.adminRegulatoryFeeds) return;
    els.adminRegulatoryFeeds.innerHTML = '<div class="empty-state">Regulatory feed sync results will appear here.</div>';
  }

  async function refreshRegulatoryFeeds() {
    if (!els.adminRegulatoryFeeds) return;
    try {
      const response = await fetch('/api/regulatory/status');
      if (!response.ok) throw new Error('Failed to fetch status');
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.sources) || !payload.sources.length) {
        els.adminRegulatoryFeeds.innerHTML = '<div class="empty-state">No regulatory sources configured.</div>';
        return;
      }
      els.adminRegulatoryFeeds.innerHTML = '';
      payload.sources.forEach((source) => {
        const entry = document.createElement('div');
        entry.className = 'reg-feed-entry';
        entry.innerHTML = `
          <div class="reg-feed-header">
            <strong>${source.label}</strong>
            <span class="reg-feed-tag ${source.last_sync_status === 'error' ? 'error' : 'updated'}">
              ${source.last_sync_status || 'unknown'}
            </span>
          </div>
          <small>${source.jurisdiction || 'Unknown jurisdiction'}</small>
        `;
        els.adminRegulatoryFeeds.appendChild(entry);
      });
    } catch (error) {
      console.error('Failed to load regulatory feeds', error);
      els.adminRegulatoryFeeds.innerHTML = `<div class="empty-state">Failed to load feed status: ${error.message}</div>`;
    }
  }

  function bindEvents() {
    els.toggleBtn?.addEventListener('click', toggleView);
    els.adminThemeToggle?.addEventListener('click', toggleTheme);
    els.adminCreateTenant?.addEventListener('click', resetTenantForm);
    els.adminRunVerification?.addEventListener('click', handleVerification);
    els.adminTenantClose?.addEventListener('click', () => {
      els.adminTenantPanel?.classList.add('hidden');
      state.activeTenantId = null;
      renderTenantSidebar();
    });
    els.adminTenantForm?.addEventListener('submit', handleTenantSubmit);
    els.adminProvisionTenant?.addEventListener('click', handleProvision);
    els.adminProfileForm?.addEventListener('submit', handleProfileSubmit);
    els.adminProfileReset?.addEventListener('click', handleProfileReset);
    els.adminRefreshFeeds?.addEventListener('click', refreshRegulatoryFeeds);
  }

  function init() {
    if (!els.runtimeView || !els.adminConsole) {
      return;
    }
    bindEvents();
    renderCountryOptions();
    loadProfilesAndPacks();
    initRegulatoryFeeds();
    if (els.adminDeleteTenant) {
      els.adminDeleteTenant.disabled = true;
      els.adminDeleteTenant.title = 'Deletion is managed externally.';
    }
    setTheme(readThemePreference());
    fetchTenants();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

