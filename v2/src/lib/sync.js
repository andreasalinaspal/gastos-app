export const LOCAL_BACKUP_KEY = 'qori-backup';
export function hasSignificantData(d) {
  if (!d) return false;
  return (d.expenses?.length > 0) || (d.fixed?.some(f => f.amount > 0)) ||
    (d.incomeFixed?.some(i => i.amount > 0)) || (d.incomeExtra?.length > 0);
}
export function saveLocalBackup(userId, d) { try { localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify({ userId, data: d })); } catch(e) {} }
export function loadLocalBackup(userId) { try { const b = localStorage.getItem(LOCAL_BACKUP_KEY); if (!b) return null; const parsed = JSON.parse(b); return parsed.userId === userId ? parsed.data : null; } catch(e) { return null; } }
export function clearLocalData() { try { localStorage.removeItem(LOCAL_BACKUP_KEY); localStorage.removeItem('gastos-data'); } catch(e) {} }
