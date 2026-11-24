/**
 * Admin.gs — ajustes del panel del staff.
 */

function setShowLiveResults_(payload) {
  const value = !!payload.value;
  props_().setProperty('SHOW_LIVE_RESULTS', value ? 'true' : 'false');
  audit_('staff', 'LIVE_RESULTS_' + (value ? 'ON' : 'OFF'), '');
  return { showLiveResults: value };
}
