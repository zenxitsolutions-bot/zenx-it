// Pure guards shared by the explicit local setup CLI and its database-free tests.
export const LOCAL_PERMISSION_TABLES = Object.freeze({
  auth_sessions: ['id', 'account_kind', 'account_id', 'company_id', 'refresh_token_hash', 'credential_hash', 'expires_at', 'revoked_at', 'rotated_at', 'created_at'],
  company_access_control: ['company_id', 'main_admin_user_id', 'created_at'],
  user_permissions: ['user_id', 'company_id', 'permissions_json', 'updated_by', 'created_at', 'updated_at'],
  permission_audit: ['id', 'company_id', 'actor_id', 'target_id', 'action', 'details_json', 'created_at'],
});

export function localSetupError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function parseLocalSetupArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (!['--company-slug', '--email', '--confirm'].includes(key) || Object.hasOwn(values, key)) {
      throw localSetupError('ERR_LOCAL_SETUP_USAGE');
    }
    if (key === '--confirm') values[key] = true;
    else {
      const value = args[++index];
      if (!value?.trim() || value.startsWith('--')) throw localSetupError('ERR_LOCAL_SETUP_USAGE');
      values[key] = value.trim();
    }
  }
  if (!values['--company-slug'] || !values['--email'] || !values['--confirm']) throw localSetupError('ERR_LOCAL_SETUP_USAGE');
  return { companySlug: values['--company-slug'], email: values['--email'].toLowerCase() };
}

export function assertLocalSetupEnvironment({ nodeEnv, mysqlUrl }) {
  if (String(nodeEnv).trim().toLowerCase() === 'production') throw localSetupError('ERR_LOCAL_SETUP_PRODUCTION');
  let url;
  try { url = new URL(mysqlUrl); } catch { throw localSetupError('ERR_LOCAL_SETUP_DATABASE'); }
  // Require literal loopback, not a hostname whose DNS could point elsewhere.
  if (url.protocol !== 'mysql:' || !['127.0.0.1', '[::1]'].includes(url.hostname) || !url.username ||
      !url.pathname.slice(1) || url.hash) throw localSetupError('ERR_LOCAL_SETUP_NOT_LOOPBACK');
}

export function extractLocalSetupStatements(schema) {
  return Object.keys(LOCAL_PERMISSION_TABLES).map((table) => {
    const matches = [...schema.matchAll(new RegExp(`^CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?;`, 'gm'))];
    if (matches.length !== 1 || !/\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;$/.test(matches[0][0])) {
      throw localSetupError('ERR_LOCAL_SETUP_SCHEMA');
    }
    return { table, statement: matches[0][0] };
  });
}

export function verifyLocalSetupTables(tables, columns, { requireAll = false } = {}) {
  const present = new Set();
  for (const [table, expectedColumns] of Object.entries(LOCAL_PERMISSION_TABLES)) {
    const metadata = tables.filter((entry) => entry.table_name === table);
    if (metadata.length === 0 && !requireAll) continue;
    if (metadata.length !== 1 || String(metadata[0].engine).toUpperCase() !== 'INNODB') {
      throw localSetupError('ERR_LOCAL_SETUP_TABLE_ENGINE');
    }
    const actual = columns.filter((entry) => entry.table_name === table).map((entry) => entry.column_name);
    if (actual.length !== expectedColumns.length || expectedColumns.some((column) => !actual.includes(column))) {
      throw localSetupError('ERR_LOCAL_SETUP_TABLE_COLUMNS');
    }
    present.add(table);
  }
  return present;
}
