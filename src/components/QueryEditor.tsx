import React, {ChangeEvent, useEffect, useState} from 'react';
import {InlineField, Input, Select, Stack} from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import {getBackendSrv} from "@grafana/runtime";

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
    const [tables, setTables] = useState<Array<{ label: string; value: string }>>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);

    const [columns, setColumns] = useState<Array<{ label: string; value: string }>>([]);
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  const onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, queryText: event.target.value });
  };

    useEffect(() => {
        const fetchTables = async() => {
            try {
                const response = await getBackendSrv().get(`/api/datasources/${datasource.id}/table`);
                const tables = response.tables || [];
                setTables(tables);
            } catch (error) {
                console.error('Error fetching tables:', error)
            }
        }

        fetchTables()
    }, [datasource.id]);

    useEffect(() => {
        const fetchColumns = async() => {
            if (selectedTable === null) {
                setColumns([])
                return
            }
            try {
                const response = await getBackendSrv().get(`/api/datasources/${datasource.id}/table/${selectedTable}/column`)
                const columns = response.columns || []
                setColumns(columns)
            } catch (error) {
                console.error('Error fetching columns:', error)
            }
        }
        fetchColumns()
    }, [selectedTable, datasource.id]);

  const { queryText, } = query;

  // setSelectedValue(table)

  return (
      <div>
          <Stack gap={0}>
              <InlineField label="Table">
                  <Select
                      id="query-editor-table"
                      options={tables}
                      onChange={(value) => setSelectedTable(value?.value || null)}
                      value={selectedTable}
                      placeholder="Choose a table"
                      required
                  />
              </InlineField>
          </Stack>
          <Stack gap={0}>
              <InlineField label="Column">
                  <Select
                      id="query-editor-column"
                      options={columns}
                      onChange={(value) => setSelectedColumn(value?.value || null)}
                      value={selectedColumn}
                      placeholder="Choose a column"
                      required
                  />
              </InlineField>
          </Stack>
          <Stack gap={0}>
              <InlineField label="Query Text" labelWidth={16} tooltip="Not used yet">
                  <Input
                      id="query-editor-query-text"
                      onChange={onQueryTextChange}
                      value={queryText || ''}
                      required
                      placeholder="Enter a query"
                  />
              </InlineField>
          </Stack>

      </div>
  );
}
