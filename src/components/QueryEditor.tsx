import React, {ChangeEvent, useEffect, useState} from 'react';
import {MultiValue} from "react-select";
import {ActionMeta, InlineField, Input, Select, Stack} from '@grafana/ui';
import {QueryEditorProps, SelectableValue} from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import {getBackendSrv} from "@grafana/runtime";

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
    const [tables, setTables] = useState<Array<{ label: string; value: string }>>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);

    const [columns, setColumns] = useState<Array<{ label: string; value: string }>>([]);
    const [selectedColumns, setSelectedColumns] = useState<string[] | null>(null);

  const onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, queryText: event.target.value });
  };

    useEffect(() => {
        const fetchTables = async() => {
            try {
                // const response = await getBackendSrv().get(`/api/datasources/${datasource.id}/table`);
                const response = await getBackendSrv().get(`/api/datasources/${datasource.id}/resources/table`);
                console.log(response)
                const tables = response || [];
                const tableOptions = tables.map((table: string) => ({ label: table, value: table }));
                setTables(tableOptions);
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
                const response = await getBackendSrv().get(`/api/datasources/${datasource.id}/resources/table/${selectedTable}/column`)
                const columns = response || []
                const columnOptions = columns.map((column: string) => ({ label: column, value: column }))
                setColumns(columnOptions)
            } catch (error) {
                console.error('Error fetching columns:', error)
            }
        }
        fetchColumns()
    }, [selectedTable, datasource.id]);

  const { queryText, } = query;

  // setSelectedValue(table)

    type OptionType = {value: string, label: string}
    const handleColumnChange = function(value: MultiValue<OptionType>, actionMeta: ActionMeta) {
        const res = value.map((v) => v.value)
        setSelectedColumns(res)
        onChange({ ...query, columns: res})
    }

    const handleTableChange = function(value: SelectableValue<string>, actionMeta: ActionMeta) {
        setSelectedTable(value?.value || null)
        onChange({ ...query, table: value.value ? value.value : ''})
    }

    return (
      <div>
          <Stack gap={0}>
              <InlineField label="Table" tooltip="Choose a table to fetch data from">
                  <Select
                      id="query-editor-table"
                      options={tables}
                      onChange={handleTableChange}
                      value={selectedTable}
                      placeholder="Choose a table"
                      required
                  />
              </InlineField>
          </Stack>
          <Stack gap={0}>
              <InlineField label="Column" tooltip={selectedTable ? "Select columns in table '" + selectedTable + "'" : "Select columns after choosing a table"}>
                  <Select
                      id="query-editor-column"
                      isMulti={true}
                      options={columns}
                      // @ts-ignore
                      onChange={handleColumnChange}
                      value={selectedColumns}
                      placeholder={selectedTable ? "Choose columns" : "No table selected"}
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
                      placeholder="Enter a query"
                  />
              </InlineField>
          </Stack>

      </div>
  );
}
