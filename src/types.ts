import {SQLOptions, SQLQuery} from '@grafana/sql'

export interface DuckDbQuery extends SQLQuery {
  queryText?: string;
  // constant: number;
  table?: string | undefined;
  // columns: string[];
}

export const DEFAULT_QUERY: Partial<DuckDbQuery> = {
  // constant: 6.5,
};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

/**
 * These are options configured for each DataSource instance
 */
export interface DuckDbOptions extends SQLOptions {
  duckDbFilePath: string;
  // tlsAuth: boolean;
  // tlsAuthWithCACert: boolean;
  // timezone: string;
  // tlsSkipVerify: boolean;
  // user: string;
  // database: string;
  // url: string;
  // timeInterval: string;
  // maxOpenConns: number;
  // maxIdleConns: number;
  // maxIdleConnsAuto: boolean;
  // connMaxLifetime: number;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
}
