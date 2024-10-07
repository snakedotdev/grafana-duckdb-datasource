import { DataSourcePlugin } from '@grafana/data';
import { DuckDbDatasource } from './datasource';
import { ConfigEditor } from './components/ConfigEditor';

import {NewDuckDbQueryEditor} from './DuckDbQueryEditor'
// import { QueryEditor } from './components/QueryEditor';
import {DuckDbOptions, DuckDbQuery} from "./types";

export const plugin = new DataSourcePlugin<DuckDbDatasource, DuckDbQuery, DuckDbOptions>(DuckDbDatasource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(NewDuckDbQueryEditor);
