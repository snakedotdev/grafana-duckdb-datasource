import React, { ChangeEvent } from 'react';
import {InlineField, Input, } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MySecureJsonData, DuckDbOptions } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<DuckDbOptions, MySecureJsonData> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;

  // let path = ""
  const onDuckDbFilePathChange = (event: ChangeEvent<HTMLInputElement>) => {
    const jsonDataOutput = {
      ...jsonData,
      database: event.target.value,
    };
    onOptionsChange({ ...options, jsonData: jsonDataOutput });
  };

  return (
    <>
      <InlineField label="Path" labelWidth={14} interactive tooltip={'Json field returned to frontend'}>
        <Input
            className="width-30"
            value={jsonData.database || ''}
            onChange={onDuckDbFilePathChange}
            placeholder="Path to DuckDB file"
        />
      </InlineField>
    </>
  );
}
