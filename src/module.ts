import { DataSourcePlugin } from '@grafana/data';
import { DuckDbDatasource } from './datasource';
import { ConfigEditor } from './components/ConfigEditor';

import {DuckDbQueryEditor} from './DuckDbQueryEditor'
// import { QueryEditor } from './components/QueryEditor';
import {SQLOptions, SQLQuery} from "@grafana/sql";

export const plugin = new DataSourcePlugin<DuckDbDatasource, SQLQuery, SQLOptions>(DuckDbDatasource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(DuckDbQueryEditor);
