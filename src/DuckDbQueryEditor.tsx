import {DuckDbQueryEditor, DuckDbQueryEditorProps} from "./components/QueryEditor";
import {QueryHeaderProps} from "./components/QueryHeader";

const queryHeaderProps: Pick<QueryHeaderProps, 'dialect'> = { dialect: 'postgres' };

export function NewDuckDbQueryEditor(props: DuckDbQueryEditorProps) {
    // TODO: convert DuckDbDatasource into a SqlDatasource for the editor...?
    return <DuckDbQueryEditor {...props} queryHeaderProps={queryHeaderProps} />;
}
