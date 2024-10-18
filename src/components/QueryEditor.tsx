import { useCallback, useEffect, useState } from 'react';
import { useAsync } from 'react-use';

import { QueryEditorProps } from '@grafana/data';
import { EditorMode } from '@grafana/experimental';
import { Space } from '@grafana/ui';

import { DuckDbDatasource } from '../datasource';
import { applyQueryDefaults } from '../defaults';
import { DuckDbQuery, QueryRowFilter, DuckDbOptions } from '../types';
import { haveColumns } from '../utils/sql.utils';

import { QueryHeader, QueryHeaderProps } from './QueryHeader';
import { RawEditor } from './query-editor-raw/RawEditor';
import { VisualEditor } from './visual-query-builder/VisualEditor';

export interface DuckDbQueryEditorProps extends QueryEditorProps<DuckDbDatasource, DuckDbQuery, DuckDbOptions> {
    queryHeaderProps?: Pick<QueryHeaderProps, 'dialect'>;
}

export function DuckDbQueryEditor({
                                      datasource,
                                      query,
                                      onChange,
                                      onRunQuery,
                                      range,
                                      queryHeaderProps,
                                  }: DuckDbQueryEditorProps) {
    const [isQueryRunnable, setIsQueryRunnable] = useState(true);
    const db = datasource.getDB(datasource.id);

    const { preconfiguredDatabase } = datasource;
    const dialect = queryHeaderProps?.dialect ?? 'other';
    const { loading, error } = useAsync(async () => {
        return () => {
            if (datasource.getDB(datasource.id).init !== undefined) {
                datasource.getDB(datasource.id).init!();
            }
        };
    }, [datasource]);

    const queryWithDefaults = applyQueryDefaults(query);
    const [queryRowFilter, setQueryRowFilter] = useState<QueryRowFilter>({
        filter: !!queryWithDefaults.sql?.whereString,
        group: !!queryWithDefaults.sql?.groupBy?.[0]?.property.name,
        order: !!queryWithDefaults.sql?.orderBy?.property.name,
        preview: true,
    });
    const [queryToValidate, setQueryToValidate] = useState(queryWithDefaults);

    useEffect(() => {
        return () => {
            if (datasource.getDB(datasource.id).dispose !== undefined) {
                datasource.getDB(datasource.id).dispose!();
            }
        };
    }, [datasource]);

    const processQuery = useCallback(
        (q: DuckDbQuery) => {
            if (isQueryValid(q) && onRunQuery) {
                onRunQuery();
            }
        },
        [onRunQuery]
    );

    const onQueryChange = (q: DuckDbQuery, process = true) => {
        setQueryToValidate(q);
        onChange(q);

        if (haveColumns(q.sql?.columns) && q.sql?.columns.some((c) => c.name) && !queryRowFilter.group) {
            setQueryRowFilter({ ...queryRowFilter, group: true });
        }

        if (process) {
            processQuery(q);
        }
    };

    const onQueryHeaderChange = (q: DuckDbQuery) => {
        setQueryToValidate(q);
        onChange(q);
    };

    if (loading || error) {
        return null;
    }

    return (
        <>
            <QueryHeader
                db={db}
                preconfiguredDataset={preconfiguredDatabase}
                onChange={onQueryHeaderChange}
                onRunQuery={onRunQuery}
                onQueryRowChange={setQueryRowFilter}
                queryRowFilter={queryRowFilter}
                query={queryWithDefaults}
                isQueryRunnable={isQueryRunnable}
                dialect={dialect}
            />

            <Space v={0.5} />

            {queryWithDefaults.editorMode !== EditorMode.Code && (
                <VisualEditor
                    db={db}
                    query={queryWithDefaults}
                    onChange={(q: DuckDbQuery) => onQueryChange(q, false)}
                    queryRowFilter={queryRowFilter}
                    onValidate={setIsQueryRunnable}
                    range={range}
                />
            )}

            {queryWithDefaults.editorMode === EditorMode.Code && (
                <RawEditor
                    db={db}
                    query={queryWithDefaults}
                    queryToValidate={queryToValidate}
                    onChange={onQueryChange}
                    onRunQuery={onRunQuery}
                    onValidate={setIsQueryRunnable}
                    range={range}
                />
            )}
        </>
    );
}

const isQueryValid = (q: DuckDbQuery) => {
    return Boolean(q.rawSql);
};
