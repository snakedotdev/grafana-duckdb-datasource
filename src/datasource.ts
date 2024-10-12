import {
  CoreApp, DataFrame, DataFrameView,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceInstanceSettings,
  getDefaultTimeRange,
  getSearchFilterScopedVar,
  LegacyMetricFindQueryOptions,
  MetricFindValue,
  ScopedVars, TimeRange,
  VariableWithMultiSupport
} from '@grafana/data';

import { DataQuery} from '@grafana/schema'
import {
  BackendDataSourceResponse,
  DataSourceWithBackend, FetchResponse,
  getBackendSrv,
  getTemplateSrv,
  reportInteraction,
  TemplateSrv, toDataQueryResponse
} from '@grafana/runtime';
//@ts-ignore
import {DB, SQLSelectableValue, formatSQL} from '@grafana/sql';
import { fetchColumns, fetchTables, getSqlCompletionProvider } from './sqlCompletionProvider';
// @ts-ignore
import {EditorMode, LanguageDefinition} from '@grafana/experimental';
import { getFieldConfig, toRawSql } from './sqlUtil';

import {getVersion, getTimescaleDBVersion, getSchema, showTables} from "./postgresMetaQuery";

import {DuckDbOptions, DuckDbQuery} from "./types";
//@ts-ignore
import {QueryFormat} from "@grafana/sql/src/types";
//@ts-ignore
import {ResponseParser} from "@grafana/sql/src/ResponseParser";
//@ts-ignore
import migrateAnnotation from "@grafana/sql/src/utils/migration";
//@ts-ignore
import {SqlQueryEditor} from "@grafana/sql/src/components/QueryEditor";
import {lastValueFrom, Observable, throwError} from "rxjs";
import {
  isSqlDatasourceDatabaseSelectionFeatureFlagEnabled
//@ts-ignore
} from "@grafana/sql/src/components/QueryEditorFeatureFlag.utils";
import {map} from "rxjs/operators";
//@ts-ignore
import {MACRO_NAMES} from "@grafana/sql/src/constants";
import {PostgresQueryModel} from "./PostgresQueryModel";

// export class DuckDbDatasource extends SqlDatasource {
//   sqlLanguageDefinition: LanguageDefinition | undefined = undefined;
//
//   constructor(instanceSettings: DataSourceInstanceSettings<DuckDbOptions>) {
//     super(instanceSettings);
//   }
//
//   getQueryModel(target?: DuckDbQuery, templateSrv?: TemplateSrv, scopedVars?: ScopedVars): PostgresQueryModel {
//     return new PostgresQueryModel(target, templateSrv, scopedVars);
//   }
//
//
//   async getVersion(): Promise<string> {
//     const value = await this.runSql<{ version: number }>(getVersion());
//     const results = value.fields.version?.values;
//
//     if (!results) {
//       return '';
//     }
//
//     return results[0].toString();
//   }
//
//   async getTimescaleDBVersion(): Promise<string | undefined> {
//     const value = await this.runSql<{ extversion: string }>(getTimescaleDBVersion());
//     const results = value.fields.extversion?.values;
//
//     if (!results) {
//       return undefined;
//     }
//
//     return results[0];
//   }
//
//   async fetchTables(): Promise<string[]> {
//     const tables = await this.runSql<{ table: string[] }>(showTables(), { refId: 'tables' });
//     return tables.fields.table?.values.flat() ?? [];
//   }
//
//   getSqlLanguageDefinition(db: DB): LanguageDefinition {
//     if (this.sqlLanguageDefinition !== undefined) {
//       return this.sqlLanguageDefinition;
//     }
//
//     const args = {
//       getColumns: { current: (query: DuckDbQuery) => fetchColumns(db, query) },
//       getTables: { current: () => fetchTables(db) },
//     };
//     this.sqlLanguageDefinition = {
//       id: 'pgsql',
//       completionProvider: getSqlCompletionProvider(args),
//       formatter: formatSQL,
//     };
//     return this.sqlLanguageDefinition;
//   }
//
//
//   async fetchFields(query: DuckDbQuery): Promise<SQLSelectableValue[]> {
//     const { table } = query;
//     if (table === undefined) {
//       // if no table-name, we are not able to query for fields
//       return [];
//     }
//     const schema = await this.runSql<{ column: string; type: string }>(getSchema(table), { refId: 'columns' });
//     const result: SQLSelectableValue[] = [];
//     for (let i = 0; i < schema.length; i++) {
//       const column = schema.fields.column.values[i];
//       const type = schema.fields.type.values[i];
//       result.push({ label: column, value: column, type, ...getFieldConfig(type) });
//     }
//     return result;
//   }
//
//
//   getDB(id: number): DB {
//     if (this.db !== undefined) {
//       return this.db;
//     }
//
//     return {
//       init: () => Promise.resolve(true),
//       datasets: () => Promise.resolve([]),
//       tables: () => this.fetchTables(),
//       getEditorLanguageDefinition: () => this.getSqlLanguageDefinition(this.db),
//       fields: async (query: DuckDbQuery) => {
//         if (!query?.table) {
//           return [];
//         }
//         return this.fetchFields(query);
//       },
//       validateQuery: (query) =>
//           Promise.resolve({ isError: false, isValid: true, query, error: '', rawSql: query.rawSql }),
//       dsID: () => this.id,
//       toRawSql,
//       lookup: async () => {
//         const tables = await this.fetchTables();
//         return tables.map((t) => ({ name: t, completion: t }));
//       },
//     };
//   }
//
//   // applyTemplateVariables(query: MyQuery, scopedVars: ScopedVars) {
//   //   return {
//   //     ...query,
//   //     queryText: getTemplateSrv().replace(query.queryText, scopedVars),
//   //   };
//   // }
// }

export class DuckDbDatasource extends DataSourceWithBackend<DuckDbQuery, DuckDbOptions> {
  id: number;
  responseParser: ResponseParser;
  name: string;
  interval: string;
  db: DB;
  preconfiguredDatabase: string;
  sqlLanguageDefinition: LanguageDefinition | undefined = undefined;

  constructor(
      instanceSettings: DataSourceInstanceSettings<DuckDbOptions>,
      protected readonly templateSrv: TemplateSrv = getTemplateSrv()
  ) {
    super(instanceSettings);
    this.name = instanceSettings.name;
    this.responseParser = new ResponseParser();
    this.id = instanceSettings.id;
    const settingsData: DuckDbOptions = instanceSettings.jsonData || {} as DuckDbOptions;
    this.interval = settingsData.timeInterval || '1m';
    this.db = this.getDB(instanceSettings.id);
    /*
      The `settingsData.database` will be defined if a default database has been defined in either
      1) the ConfigurationEditor.tsx, OR 2) the provisioning config file, either under `jsondata.database`, or simply `database`.
    */
    this.preconfiguredDatabase = settingsData.database ?? '';
    this.annotations = {
      prepareAnnotation: migrateAnnotation,
      QueryEditor: SqlQueryEditor,
    };
  }
  async getVersion(): Promise<string> {
    const value = await this.runSql<{ version: number }>(getVersion());
    const results = value.fields.version?.values;

    if (!results) {
      return '';
    }

    return results[0].toString();
  }

  async getTimescaleDBVersion(): Promise<string | undefined> {
    const value = await this.runSql<{ extversion: string }>(getTimescaleDBVersion());
    const results = value.fields.extversion?.values;

    if (!results) {
      return undefined;
    }

    return results[0];
  }

  async fetchTables(): Promise<string[]> {
    const tables = await this.runSql<{ table: string[] }>(showTables(), { refId: 'tables' });
    return tables.fields.table?.values.flat() ?? [];
  }

  getSqlLanguageDefinition(db: DB): LanguageDefinition {
    if (this.sqlLanguageDefinition !== undefined) {
      return this.sqlLanguageDefinition;
    }

    const args = {
      getColumns: { current: (query: DuckDbQuery) => fetchColumns(db, query) },
      getTables: { current: () => fetchTables(db) },
    };
    this.sqlLanguageDefinition = {
      id: 'pgsql',
      completionProvider: getSqlCompletionProvider(args),
      formatter: formatSQL,
    };
    return this.sqlLanguageDefinition;
  }


  async fetchFields(query: DuckDbQuery): Promise<SQLSelectableValue[]> {
    const { table } = query;
    if (table === undefined) {
      // if no table-name, we are not able to query for fields
      return [];
    }
    const schema = await this.runSql<{ column: string; type: string }>(getSchema(table), { refId: 'columns' });
    const result: SQLSelectableValue[] = [];
    for (let i = 0; i < schema.length; i++) {
      const column = schema.fields.column.values[i];
      const type = schema.fields.type.values[i];
      result.push({ label: column, value: column, type, ...getFieldConfig(type) });
    }
    return result;
  }

  getDB(id: number): DB {
    if (this.db !== undefined) {
      return this.db;
    }

    return {
      init: () => Promise.resolve(true),
      datasets: () => Promise.resolve([]),
      tables: () => this.fetchTables(),
      getEditorLanguageDefinition: () => this.getSqlLanguageDefinition(this.db),
      fields: async (query: DuckDbQuery) => {
        if (!query?.table) {
          return [];
        }
        return this.fetchFields(query);
      },
      validateQuery: (query) =>
          Promise.resolve({ isError: false, isValid: true, query, error: '', rawSql: query.rawSql }),
      dsID: () => this.id,
      toRawSql,
      lookup: async () => {
        const tables = await this.fetchTables();
        return tables.map((t) => ({ name: t, completion: t }));
      },
    };
  }

  getQueryModel(target?: DuckDbQuery, templateSrv?: TemplateSrv, scopedVars?: ScopedVars): PostgresQueryModel {
    return new PostgresQueryModel(target, templateSrv, scopedVars);
  }

  getResponseParser() {
    return this.responseParser;
  }

  interpolateVariable = (value: string | string[] | number, variable: VariableWithMultiSupport) => {
    if (typeof value === 'string') {
      if (variable.multi || variable.includeAll) {
        return this.getQueryModel().quoteLiteral(value);
      } else {
        return String(value).replace(/'/g, "''");
      }
    }

    if (typeof value === 'number') {
      return value;
    }

    if (Array.isArray(value)) {
      const quotedValues = value.map((v) => this.getQueryModel().quoteLiteral(v));
      return quotedValues.join(',');
    }

    return value;
  };

  interpolateVariablesInQueries(queries: DuckDbQuery[], scopedVars: ScopedVars): DuckDbQuery[] {
    let expandedQueries = queries;
    if (queries && queries.length > 0) {
      expandedQueries = queries.map((query) => {
        const expandedQuery = {
          ...query,
          datasource: this.getRef(),
          rawSql: this.templateSrv.replace(query.rawSql, scopedVars, this.interpolateVariable),
          rawQuery: true,
        };
        return expandedQuery;
      });
    }
    return expandedQueries;
  }

  filterQuery(query: DuckDbQuery): boolean {
    return !query.hide;
  }

  applyTemplateVariables(target: DuckDbQuery, scopedVars: ScopedVars) {
    return {
      refId: target.refId,
      datasource: this.getRef(),
      rawSql: this.templateSrv.replace(target.rawSql, scopedVars, this.interpolateVariable),
      format: target.format,
    };
  }

  query(request: DataQueryRequest<DuckDbQuery>): Observable<DataQueryResponse> {
    // This logic reenables the previous SQL behavior regarding what databases are available for the user to query.
    if (isSqlDatasourceDatabaseSelectionFeatureFlagEnabled()) {
      const databaseIssue = this.checkForDatabaseIssue(request);

      if (!!databaseIssue) {
        const error = new Error(databaseIssue);
        return throwError(() => error);
      }
    }

    request.targets.forEach((target) => {
      if (request.app === CoreApp.Dashboard || request.app === CoreApp.PanelViewer) {
        return;
      }

      reportInteraction('grafana_sql_query_executed', {
        datasource: target.datasource?.type,
        editorMode: target.editorMode,
        format: target.format,
        app: request.app,
      });
    });

    return super.query(request);
  }

  private checkForDatabaseIssue(request: DataQueryRequest<DuckDbQuery>) {
    // If the datasource is Postgres and there is no default database configured - either never configured or removed - return a database issue.
    if (this.type === 'postgres' && !this.preconfiguredDatabase) {
      return `You do not currently have a default database configured for this data source. Postgres requires a default
             database with which to connect. Please configure one through the Data Sources Configuration page, or if you
             are using a provisioning file, update that configuration file with a default database.`;
    }

    // No need to check for database change/update issues if the datasource is being used in Explore.
    if (request.app !== CoreApp.Explore) {
      /*
        If a preconfigured datasource database has been added/updated - and the user has built ANY number of queries using a
        database OTHER than the preconfigured one, return a database issue - since those databases are no longer available.
        The user will need to update their queries to use the preconfigured database.
      */
      if (!!this.preconfiguredDatabase) {
        for (const target of request.targets) {
          // Test for database configuration change only if query was made in `builder` mode.
          if (target.editorMode === EditorMode.Builder && target.dataset !== this.preconfiguredDatabase) {
            return `The configuration for this panel's data source has been modified. The previous database used in this panel's
                   saved query is no longer available. Please update the query to use the new database option.
                   Previous query parameters will be preserved until the query is updated.`;
          }
        }
      }
    }

    return null;
  }

  async metricFindQuery(query: string, options?: LegacyMetricFindQueryOptions): Promise<MetricFindValue[]> {
    const range = options?.range;
    if (range == null) {
      // I cannot create a scenario where this happens, we handle it just to be sure.
      return [];
    }

    let refId = 'tempvar';
    if (options && options.variable && options.variable.name) {
      refId = options.variable.name;
    }

    const scopedVars = {
      ...options?.scopedVars,
      ...getSearchFilterScopedVar({ query, wildcardChar: '%', options }),
    };

    const rawSql = this.templateSrv.replace(query, scopedVars, this.interpolateVariable);

    const interpolatedQuery: DuckDbQuery = {
      refId: refId,
      datasource: this.getRef(),
      rawSql,
      format: QueryFormat.Table,
    };

    // NOTE: we can remove this try-catch when https://github.com/grafana/grafana/issues/82250
    // is fixed.
    let response;
    try {
      response = await this.runMetaQuery(interpolatedQuery, range);
    } catch (error) {
      console.error(error);
      throw new Error('error when executing the sql query');
    }
    return this.getResponseParser().transformMetricFindResponse(response);
  }

  // NOTE: this always runs with the `@grafana/data/getDefaultTimeRange` time range
  async runSql<T extends object>(query: string, options?: RunSQLOptions) {
    const range = getDefaultTimeRange();
    const frame = await this.runMetaQuery({ rawSql: query, format: QueryFormat.Table, refId: options?.refId }, range);
    return new DataFrameView<T>(frame);
  }

  private runMetaQuery(request: Partial<DuckDbQuery>, range: TimeRange): Promise<DataFrame> {
    const refId = request.refId || 'meta';
    const queries: DataQuery[] = [{ ...request, datasource: request.datasource || this.getRef(), refId }];

    return lastValueFrom(
        getBackendSrv()
            .fetch<BackendDataSourceResponse>({
              url: '/api/ds/query',
              method: 'POST',
              headers: this.getRequestHeaders(),
              data: {
                from: range.from.valueOf().toString(),
                to: range.to.valueOf().toString(),
                queries,
              },
              requestId: refId,
            })
            .pipe(
                map((res: FetchResponse<BackendDataSourceResponse>) => {
                  const rsp = toDataQueryResponse(res, queries);
                  return rsp.data[0] ?? { fields: [] };
                })
            )
    );
  }

  targetContainsTemplate(target: DuckDbQuery) {
    let queryWithoutMacros = target.rawSql;
    MACRO_NAMES.forEach((value) => {
      queryWithoutMacros = queryWithoutMacros?.replace(value, '') || '';
    });
    return this.templateSrv.containsTemplate(queryWithoutMacros);
  }
}

interface RunSQLOptions extends LegacyMetricFindQueryOptions {
  refId?: string;
}
