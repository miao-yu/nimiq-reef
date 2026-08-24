import 'server-only';

/**
 * Read env lazily, never at module load — the production build has to succeed
 * on a machine with no database and no node.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  get rpcUrl(): string {
    return process.env.NIMIQ_RPC_URL ?? 'http://127.0.0.1:8648';
  },
  get db() {
    return {
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      user: required('DB_USER'),
      password: required('DB_PASSWORD'),
      database: required('DB_NAME'),
    };
  },
  get sessionSecret(): string {
    return required('SESSION_SECRET');
  },
};
