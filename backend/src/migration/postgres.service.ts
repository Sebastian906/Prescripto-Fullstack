import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';

@Injectable()
export class PostgresService implements OnModuleDestroy {
    private readonly logger = new Logger(PostgresService.name);
    private pool: Pool;

    constructor(private readonly configService: ConfigService) {
        this.pool = new Pool({
            host: this.configService.get<string>('PG_HOST', 'localhost'),
            port: this.configService.get<number>('PG_PORT', 5432),
            database: this.configService.get<string>('PG_DATABASE', 'prescripto'),
            user: this.configService.get<string>('PG_USER', 'postgres'),
            password: this.configService.get<string>('PG_PASSWORD', ''),
            max: 5,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
        });

        this.pool.on('error', (err) => {
            this.logger.error('Unexpected PostgreSQL pool error', err.message);
        });
    }

    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return result.rows as T[];
        } finally {
            client.release();
        }
    }

    async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
        const rows = await this.query<T>(sql, params);
        return rows[0] ?? null;
    }

    async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.query('SELECT 1');
            return true;
        } catch {
            return false;
        }
    }

    async onModuleDestroy() {
        await this.pool.end();
    }
}
