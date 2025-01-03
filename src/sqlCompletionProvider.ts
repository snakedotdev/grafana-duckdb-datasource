import {
    ColumnDefinition,
    getStandardSQLCompletionProvider,
    LanguageCompletionProvider,
    TableDefinition,
    TableIdentifier,
// @ts-ignore
} from '@grafana/experimental';

//@ts-ignore
import { DB, SQLQuery } from '@grafana/sql';

interface CompletionProviderGetterArgs {
    getColumns: React.MutableRefObject<(t: SQLQuery) => Promise<ColumnDefinition[]>>;
    getTables: React.MutableRefObject<(d?: string) => Promise<TableDefinition[]>>;
}

export const getSqlCompletionProvider: (args: CompletionProviderGetterArgs) => LanguageCompletionProvider =
    ({ getColumns, getTables }) =>
        //@ts-ignore
        (monaco, language) => ({
            ...(language && getStandardSQLCompletionProvider(monaco, language)),
            tables: {
                resolve: async () => {
                    return await getTables.current();
                },
            },
            columns: {
                resolve: async (t?: TableIdentifier) => {
                    return await getColumns.current({ table: t?.table, refId: 'A' });
                },
            },
        });

export async function fetchColumns(db: DB, q: SQLQuery) {
    const cols = await db.fields(q);
    if (cols.length > 0) {
        return cols.map((c) => {
            return { name: c.value, type: c.value, description: c.value };
        });
    } else {
        return [];
    }
}

export async function fetchTables(db: DB) {
    const tables = await db.lookup?.();
    return tables || [];
}
