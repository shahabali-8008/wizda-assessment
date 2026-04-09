import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { cliDataSourceOptions } from './typeorm.shared';

loadEnv({ path: ['.env.local', '.env'] });

export default new DataSource(cliDataSourceOptions());
