import { DataSource } from 'typeorm';
import * as path from 'path';
import { loadCliEnv } from './load-cli-env';
import { sqliteDataMainPathCollision } from '../config/env.validation';
import { ApiKey } from '../modules/auth/entities/api-key.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';

loadCliEnv();

const sqlitePathCollision = sqliteDataMainPathCollision(process.env);
if (sqlitePathCollision) {
  throw new Error(sqlitePathCollision);
}

const mainDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.MAIN_DATABASE_NAME || './data/main.sqlite',
  entities: [ApiKey, AuditLog],
  migrations: [path.join(__dirname, 'migrations-main', '*{.ts,.js}').replace(/\\/g, '/')],
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
});

export default mainDataSource;
