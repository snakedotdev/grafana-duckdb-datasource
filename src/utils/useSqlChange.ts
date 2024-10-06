import { useCallback } from 'react';

import { DB, SQLExpression, DuckDbQuery } from '../types';

interface UseSqlChange {
  db: DB;
  query: DuckDbQuery;
  onQueryChange: (query: DuckDbQuery) => void;
}

export function useSqlChange({ query, onQueryChange, db }: UseSqlChange) {
  const onSqlChange = useCallback(
    (sql: SQLExpression) => {
      const toRawSql = db.toRawSql;
      const rawSql = toRawSql({ sql, dataset: query.dataset, table: query.table, refId: query.refId });
      const newQuery: DuckDbQuery = { ...query, sql, rawSql };
      onQueryChange(newQuery);
    },
    [db, onQueryChange, query]
  );

  return { onSqlChange };
}
