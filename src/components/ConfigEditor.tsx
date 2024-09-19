import React, { ChangeEvent } from 'react';
import {InlineField, Input, } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;

  const onDuckDbFilePathChange = (event: ChangeEvent<HTMLInputElement>) => {
    const jsonData = {
      ...options.jsonData,
      duckDbFilePath: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  return (
    <>
      <InlineField label="Path" labelWidth={14} interactive tooltip={'Json field returned to frontend'}>
        <Input
            className="width-30"
            value={jsonData.duckDbFilePath || ''}
            onChange={onDuckDbFilePathChange}
            placeholder="Path to DuckDB file"
        />
      </InlineField>
    </>
  );
}
