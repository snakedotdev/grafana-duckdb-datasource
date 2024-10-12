import React, {ChangeEvent} from 'react';
import {InlineField, Input, Switch, TextArea,} from '@grafana/ui';
import {DataSourcePluginOptionsEditorProps} from '@grafana/data';
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

  const onDuckDbPreSqlChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const jsonDataOutput = {
      ...jsonData,
      preSql: event.target.value,
    };
    onOptionsChange({...options, jsonData: jsonDataOutput})
  }

  const onReloadAutomaticallyChange = (event: ChangeEvent<HTMLInputElement>) => {
    const jsonDataOutput = {
      ...jsonData,
      reloadAutomatically: event.target.checked,
    }
    onOptionsChange({...options, jsonData: jsonDataOutput})
  }

  return (
      <>
        <InlineField label="Path" labelWidth={14} interactive
                     tooltip={'The path to the DuckDB database to be used for this data source'}>
          <Input
              className="width-30"
              value={jsonData.database || ''}
              onChange={onDuckDbFilePathChange}
              placeholder="Path to DuckDB file"
          />
        </InlineField>
        <InlineField label="Initialization SQL" labelWidth={18} interactive
                     tooltip={'(Optional) SQL to run when connection is established'}>
          <TextArea
              className="width-30"
              value={jsonData.preSql || ''}
              onChange={onDuckDbPreSqlChange}
              placeholder=""
              rows={5}
          />
        </InlineField>
        <InlineField label="Reload Automatically" labelWidth={22} interactive
                     tooltip={'Whether to reload the database connection automatically when the timestamp on the database changes'}>
        <Switch
            value={options.jsonData.reloadAutomatically !== false} // Default to true if undefined
            onChange={(e: ChangeEvent<HTMLInputElement>) => onReloadAutomaticallyChange(e)}
            style={{marginTop: 'auto', marginBottom: 'auto'}}
        />
        </InlineField>
      </>
  );
}
