import { QueryEditorProps } from '@grafana/data';
import { SqlQueryEditor, SQLOptions, SQLQuery, QueryHeaderProps } from '@grafana/sql';

import { DuckDbDatasource } from './datasource';
import React from 'react';

const queryHeaderProps: Pick<QueryHeaderProps, 'dialect'> = { dialect: 'postgres' };

export function DuckDbQueryEditor(props: QueryEditorProps<DuckDbDatasource, SQLQuery, SQLOptions>) {
    return <SqlQueryEditor {...props} queryHeaderProps={queryHeaderProps} />;
}
