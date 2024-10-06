import { SqlQueryEditor, QueryHeaderProps } from '@grafana/sql';

import React from 'react';
import {DuckDbQueryEditorProps} from "./components/QueryEditor";

const queryHeaderProps: Pick<QueryHeaderProps, 'dialect'> = { dialect: 'postgres' };

export function DuckDbQueryEditor(props: DuckDbQueryEditorProps) {
    // TODO: convert DuckDbDatasource into a SqlDatasource for the editor...?
    return <SqlQueryEditor {...props} datasource={} queryHeaderProps={queryHeaderProps} />;
}
