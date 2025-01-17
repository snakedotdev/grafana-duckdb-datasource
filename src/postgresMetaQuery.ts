export function getVersion() {
    return "SELECT current_setting('server_version_num')::int/100 as version";
}

export function getTimescaleDBVersion() {
    return "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'";
}

export function showTables() {
    return `select "table_name" as "table" from information_schema.tables
    where "table_schema" not in ('information_schema',
                             'pg_catalog',
                             '_timescaledb_cache',
                             '_timescaledb_catalog',
                             '_timescaledb_internal',
                             '_timescaledb_config',
                             'timescaledb_information',
                             'timescaledb_experimental')`;
}

export function getSchema(table: string) {
    // we will put table-name between single-quotes, so we need to escape single-quotes
    // in the table-name
    const tableNamePart = "'" + table.replace(/'/g, "''") + "'";

    return `select "column_name" as "column", "data_type" as "type"
    from information_schema.columns
    where "table_name" = ${tableNamePart};
    `;
}

// function buildSchemaConstraint() {
//     return ``
//     return `
//       "table_schema" IN (
//         SELECT
//           CASE
//             WHEN trim(schema_element) = '"$user"' THEN 'user'  -- Replace 'user' with the actual logic
//             ELSE trim(schema_element)
//           END
//         FROM (
//           SELECT unnest(str_split(current_setting('search_path'), ',')) AS schema_element
//         )
//       )
//     `
//
//     // quote_ident protects hyphenated schemes
//     return `
//           "table_schema" IN (
//           SELECT
//             CASE WHEN trim(s[i]) = '"$user"' THEN user ELSE trim(s[i]) END
//           FROM
//             generate_series(
//               array_lower(string_to_array(current_setting('search_path'),','),1),
//               array_upper(string_to_array(current_setting('search_path'),','),1)
//             ) as i,
//             string_to_array(current_setting('search_path'),',') s
//           )`;
// }
