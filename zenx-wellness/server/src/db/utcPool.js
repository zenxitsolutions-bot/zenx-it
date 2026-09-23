// mysql2's timezone: 'Z' governs JS Date conversion, not the MySQL session clock. DATETIME
// defaults/CURRENT_TIMESTAMP/NOW() must use UTC too or message timestamps are shifted at read.
// Await session setup on every checkout, including reconnects; no application SQL runs if it
// fails. This small public-API facade also makes transaction connections obey the same rule.
export function withUtcSessions(rawPool) {
  async function getConnection() {
    const connection = await rawPool.getConnection();
    try {
      await connection.query("SET SESSION time_zone = '+00:00'");
      return connection;
    } catch (error) {
      connection.destroy();
      throw error;
    }
  }

  async function run(method, args) {
    const connection = await getConnection();
    try {
      return await connection[method](...args);
    } finally {
      connection.release();
    }
  }

  return {
    getConnection,
    query: (...args) => run('query', args),
    execute: (...args) => run('execute', args),
    end: () => rawPool.end(),
  };
}
