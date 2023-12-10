import Knex from 'knex';
import { config } from '../config';

const {
  host, port, user, password, db,
} = config.db;

export const knex = Knex({
  client: 'pg',
  connection: {
    host,
    port,
    user,
    password,
    database: db,
  },
  migrations: {
    tableName: 'migrations',
  },
});
