package plugin

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"github.com/grafana/grafana-plugin-sdk-go/data/sqlutil"
	"github.com/marcboeker/go-duckdb"
	"github.com/mitchellh/mapstructure"
	"github.com/omaha/duckdb/pkg/plugin/sqleng"
	"net/http"
	"os"
	"reflect"
	"regexp"
	"sync"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	_ "github.com/marcboeker/go-duckdb"
	"github.com/omaha/duckdb/pkg/models"
)

// Make sure Datasource implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. In this example datasource instance implements backend.QueryDataHandler,
// backend.CheckHealthHandler interfaces. Plugin should not implement all these
// interfaces - only those which are required for a particular task.
var (
	_ backend.QueryDataHandler      = (*sqleng.DataSourceHandler)(nil)
	_ backend.CheckHealthHandler    = (*sqleng.DataSourceHandler)(nil)
	_ instancemgmt.InstanceDisposer = (*sqleng.DataSourceHandler)(nil)
)

// NewDatasource creates a new datasource instance.
func NewDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	backend.Logger.Info("new datasource")
	tmp := &models.PluginSettings{}
	if err := json.Unmarshal(settings.JSONData, tmp); err != nil {
		return nil, err
	}

	ds := &Datasource{
		path: tmp.Database,
	}

	// set up query data handler
	queryTypeMux := datasource.NewQueryTypeMux()
	queryTypeMux.HandleFunc("", ds.handleQueryFallback)
	ds.queryHandler = queryTypeMux

	// set up the call handler
	router := mux.NewRouter()
	router.HandleFunc("/table", ds.getTables).Methods("GET")
	router.HandleFunc("/table/{tablename}/column", ds.getColumns).Methods("GET")
	ds.resourceHandler = httpadapter.New(router)

	if err := ds.Init(); err != nil {
		return nil, err
	}
	backend.Logger.Info("done with new datasource")
	return ds, nil
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	db              *sql.DB
	path            string
	mutex           sync.Mutex
	lastLoaded      time.Time
	queryHandler    backend.QueryDataHandler
	resourceHandler backend.CallResourceHandler
}

func (d *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	backend.Logger.Info("call resource", "path", req.Path)
	//return sender.Send(&backend.CallResourceResponse{
	//	Status: 404,
	//	Body:   []byte("Endpoint not found"),
	//})

	return d.resourceHandler.CallResource(ctx, req, sender)
}

//func (d *Datasource) ServeHTTP(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
//	if req.Path == "table" {
//		return d.getTables(ctx, sender)
//	}
//	return nil
//}

func (d *Datasource) getColumns(rw http.ResponseWriter, req *http.Request) {
	backend.Logger.Info("getColumns")
	vars := mux.Vars(req)
	var columnList []string
	tableName := vars["tablename"]
	if r, err := d.executeQuery(req.Context(), "SELECT column_name FROM duckdb_columns where table_name=?;", tableName); err != nil {
		backend.Logger.Error("error executing query", "error", err.Error())
		return
	} else {
		defer func(r *sql.Rows) {
			err := r.Close()
			if err != nil {
				backend.Logger.Error("error closing rows", "error", err.Error())
			}
		}(r)

		if !r.Next() {
			backend.Logger.Info("no rows found!")
			rw.WriteHeader(http.StatusOK)
			return
		} else {
			var columnName string
			for {
				if err := r.Scan(&columnName); err != nil {
					backend.Logger.Error("error scanning row", err.Error())
				}
				columnList = append(columnList, columnName)

				if !r.Next() {
					break
				}
			}
		}
		if responseBody, err := json.Marshal(columnList); err != nil {
			backend.Logger.Error("error marshalling response", "error", err.Error())
			rw.WriteHeader(http.StatusInternalServerError)
			return
		} else {
			rw.WriteHeader(http.StatusOK)
			rw.Write(responseBody)
			return
		}
	}
}

func (d *Datasource) getTables(rw http.ResponseWriter, req *http.Request) {
	backend.Logger.Info("getTables")
	var tableList []string

	if r, err := d.executeQuery(req.Context(), "SELECT table_name FROM duckdb_tables;"); err != nil {
		backend.Logger.Error("error executing query", "error", err.Error())
		return
	} else {
		defer func(r *sql.Rows) {
			err := r.Close()
			if err != nil {
				backend.Logger.Error("error closing rows", "error", err.Error())
			}
		}(r)

		if !r.Next() {
			backend.Logger.Info("no rows found!")
			rw.WriteHeader(http.StatusOK)
			return
		} else {
			var tableName string
			for {
				if err := r.Scan(&tableName); err != nil {
					backend.Logger.Error("error scanning row", err.Error())
				}
				tableList = append(tableList, tableName)

				if !r.Next() {
					break
				}
			}
		}
		if responseBody, err := json.Marshal(tableList); err != nil {
			backend.Logger.Error("error marshalling response", "error", err.Error())
			rw.WriteHeader(http.StatusInternalServerError)
			return
		} else {
			rw.WriteHeader(http.StatusOK)
			rw.Write(responseBody)
			return
		}
	}
}

func (d *Datasource) checkAndLoadDb() error {
	// TODO: check whether file exists
	backend.Logger.Info("Path to init", "path", d.path)

	// check the timestamp of last modified
	// if it is newer from the last time
	// we loaded the db, then reload the db
	if fileInfo, err := os.Stat(d.path); err != nil {
		return err
	} else {
		lastModified := fileInfo.ModTime()
		// Not Equal instead of "After" so that we can roll back to older too
		if !lastModified.Equal(d.lastLoaded) {
			backend.Logger.Info("reloading database", "lastModified", lastModified, "lastLoaded", d.lastLoaded)
			if d.db != nil {
				if err := d.db.Close(); err != nil {
					backend.Logger.Error("error closing database", "error", err)
					return err
				}
			}
			if db, err := sql.Open("duckdb", fmt.Sprintf("%s?access_mode=read_only", d.path)); err != nil {
				backend.Logger.Info("error with init")
				backend.Logger.Error("error initializing connection", "error", err)
				return err
			} else {
				// if load is successful, we save the lastModified time for reference later
				d.lastLoaded = lastModified
				d.db = db
			}
		}
	}
	return nil
}

func (d *Datasource) Init() error {
	backend.Logger.Info("init")
	// check that file exists at path
	if err := d.checkAndLoadDb(); err != nil {
		backend.Logger.Error(err.Error())
		return err
	}
	backend.Logger.Info("done with init")
	return nil
}

// Execute query using a connection from the pool
func (d *Datasource) executeQuery(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	d.mutex.Lock()
	defer d.mutex.Unlock()

	// Get a connection from the pool
	if rows, err := d.db.QueryContext(ctx, query, args...); err != nil {
		log.DefaultLogger.Error("Error executing query: %s", err.Error())
		return nil, err
	} else {
		return rows, nil
	}
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	// Clean up datasource instance resources.
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	backend.Logger.Info("query data", "queries", req.Queries)
	if err := d.checkAndLoadDb(); err != nil {
		backend.Logger.Error("error checking and loading db", "error", err)
		return nil, err
	}
	return d.queryHandler.QueryData(ctx, req)
}

func (d *Datasource) handleQueryFallback(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	// create response struct
	response := backend.NewQueryDataResponse()

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res := d.query(ctx, req.PluginContext, q)

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res
	}

	return response, nil
}

type passedDatasource struct {
	Type string `json:"type"`
	Uid  string `json:"uid"`
}

type queryModel struct {
	Datasource passedDatasource `json:"datasource"`
	Format     string           `json:"format"`
	RawSQL     string           `json:"rawSql"`
	RefId      string           `json:"refId"`
}

func (d *Datasource) query(ctx context.Context, pCtx backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	var response backend.DataResponse

	// Unmarshal the JSON into our queryModel.
	var qm queryModel

	backend.Logger.Info("Passed Query", "query", query.JSON)

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}
	backend.Logger.Info("Parsed Query", "queryModel", qm)

	if r, err := d.executeQuery(ctx, "SELECT table_name FROM duckdb_tables;"); err != nil {
		backend.Logger.Error("error executing query", err.Error())
	} else {
		defer func(r *sql.Rows) {
			err := r.Close()
			if err != nil {
				backend.Logger.Error("error closing rows", err.Error())
			}
		}(r)

		var tableName string
		if !r.Next() {
			backend.Logger.Info("no rows found!")
		} else {
			for {
				if err := r.Scan(&tableName); err != nil {
					backend.Logger.Error("error scanning row", err.Error())
				}
				backend.Logger.Info("table_name", tableName)

				if !r.Next() {
					break
				}
			}
		}
	}
	backend.Logger.Info("Query executed!...")

	// create data frame response.
	// For an overview on data frames and how grafana handles them:
	// https://grafana.com/developers/plugin-tools/introduction/data-frames
	frame := data.NewFrame("response")

	// add fields.
	frame.Fields = append(frame.Fields,
		data.NewField("time", nil, []time.Time{query.TimeRange.From, query.TimeRange.To}),
		data.NewField("values", nil, []int64{10, 20}),
	)

	// add the frames to the response.
	response.Frames = append(response.Frames, frame)

	return response
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *Datasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	backend.Logger.Info("checking health")
	res := &backend.CheckHealthResult{}
	backend.Logger.Info("loading settings")
	config, err := models.LoadPluginSettings(*req.PluginContext.DataSourceInstanceSettings)
	backend.Logger.Info("Done loading settings")

	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = "Unable to load settings"
		return res, nil
	}

	if config.Database == "" {
		res.Status = backend.HealthStatusError
		res.Message = "Duck DB File Path is missing"
		return res, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}

type Cfg struct {
	Random string `json:"random"`
}

type Service struct {
	im     instancemgmt.InstanceManager
	logger log.Logger
}

func ProvideService(cfg *Cfg) *Service {
	logger := backend.NewLoggerWith("logger", "tsdb.duckdb")
	s := &Service{
		logger: logger,
	}
	s.im = datasource.NewInstanceManager(s.NewInstanceSettings())
	return s
}

func (s *Service) NewInstanceSettings() datasource.InstanceFactoryFunc {
	logger := s.logger
	return func(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
		cfg := backend.GrafanaConfigFromContext(ctx)
		sqlCfg, err := cfg.SQL()
		if err != nil {
			return nil, err
		}

		jsonData := sqleng.JsonData{
			MaxOpenConns:        sqlCfg.DefaultMaxOpenConns,
			MaxIdleConns:        sqlCfg.DefaultMaxIdleConns,
			ConnMaxLifetime:     sqlCfg.DefaultMaxConnLifetimeSeconds,
			Timescaledb:         false,
			ConfigurationMethod: "file-path",
			SecureDSProxy:       false,
			PreSql:              "",
			ReloadAutomatically: true,
		}

		err = json.Unmarshal(settings.JSONData, &jsonData)
		if err != nil {
			return nil, fmt.Errorf("error reading settings: %w", err)
		}

		database := jsonData.Database
		if database == "" {
			database = settings.Database
		}

		dsInfo := sqleng.DataSourceInfo{
			JsonData:                jsonData,
			URL:                     settings.URL,
			User:                    settings.User,
			Database:                database,
			ID:                      settings.ID,
			Updated:                 settings.Updated,
			UID:                     settings.UID,
			DecryptedSecureJSONData: settings.DecryptedSecureJSONData,
		}

		userFacingDefaultError, err := cfg.UserFacingDefaultError()
		if err != nil {
			return nil, err
		}

		_, handler, err := newDuckDb(ctx, userFacingDefaultError, sqlCfg.RowLimit, dsInfo, logger, settings)

		if err != nil {
			logger.Error("Failed connecting to Postgres", "err", err)
			return nil, err
		}

		logger.Debug("Successfully connected to Postgres")
		return handler, nil
	}
}

func (s *Service) getDSInfo(ctx context.Context, pluginCtx backend.PluginContext) (*sqleng.DataSourceHandler, error) {
	i, err := s.im.Get(ctx, pluginCtx)
	if err != nil {
		return nil, err
	}
	instance := i.(*sqleng.DataSourceHandler)
	return instance, nil
}

func (s *Service) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	backend.Logger.Info("running query...")
	dsInfo, err := s.getDSInfo(ctx, req.PluginContext)
	if err != nil {
		return nil, err
	}
	return dsInfo.QueryData(ctx, req)
}

// CheckHealth pings the connected SQL database
func (s *Service) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	dsHandler, err := s.getDSInfo(ctx, req.PluginContext)
	if err != nil {
		return nil, err
	}

	err = dsHandler.Ping()

	if err != nil {
		s.logger.Error("Check health failed", "error", err)
		return &backend.CheckHealthResult{Status: backend.HealthStatusError, Message: dsHandler.TransformQueryError(s.logger, err).Error()}, nil
	}

	return &backend.CheckHealthResult{Status: backend.HealthStatusOk, Message: "Database Connection OK"}, nil
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (s *Service) Dispose() {
	// Clean up datasource instance resources.
}

func newDuckDb(ctx context.Context, userFacingDefaultError string, rowLimit int64, dsInfo sqleng.DataSourceInfo, logger log.Logger, settings backend.DataSourceInstanceSettings) (*sql.DB, *sqleng.DataSourceHandler, error) {
	//proxyClient, err := settings.ProxyClient(ctx)
	//if err != nil {
	//	logger.Error("postgres proxy creation failed", "error", err)
	//	return nil, nil, fmt.Errorf("postgres proxy creation failed")
	//}

	config := sqleng.DataPluginConfiguration{
		DSInfo:            dsInfo,
		MetricColumnTypes: []string{"UNKNOWN", "TEXT", "VARCHAR", "CHAR"},
		RowLimit:          rowLimit,
	}

	queryResultTransformer := duckDbQueryResultTransformer{}

	handler, err := sqleng.NewQueryDataHandler(userFacingDefaultError, config, &queryResultTransformer,
		newPostgresMacroEngine(dsInfo.JsonData.Timescaledb),
		logger)
	if err != nil {
		logger.Error("Failed connecting to DuckDB", "err", err)
		return nil, nil, err
	}

	logger.Debug("Successfully connected to DuckDB")
	return nil, handler, nil
}

type duckDbQueryResultTransformer struct{}

func (t *duckDbQueryResultTransformer) TransformQueryError(_ log.Logger, err error) error {
	return err
}

type NullDecimal struct {
	Decimal duckdb.Decimal
	Valid   bool
}

func (n *NullDecimal) Scan(value any) error {
	if value == nil {
		n.Decimal = duckdb.Decimal{
			Width: 0,
			Scale: 0,
			Value: nil,
		}
		n.Valid = false
		return nil
	}
	n.Valid = true
	if err := mapstructure.Decode(value, &n.Decimal); err != nil {
		return err
	}
	return nil
}

func (n *NullDecimal) Value() (driver.Value, error) {
	if !n.Valid {
		return nil, nil
	}
	return n.Decimal, nil
}

func (t *duckDbQueryResultTransformer) GetConverterList() []sqlutil.Converter {
	return []sqlutil.Converter{
		{
			Name:           "NULLABLE decimal converter",
			InputScanType:  reflect.TypeOf(NullDecimal{}),
			InputTypeRegex: regexp.MustCompile("DECIMAL.*"),
			FrameConverter: sqlutil.FrameConverter{
				FieldType: data.FieldTypeNullableFloat64,
				ConverterFunc: func(n interface{}) (interface{}, error) {
					v := n.(*NullDecimal)

					if !v.Valid {
						return (*float64)(nil), nil
					}

					f := v.Decimal.Float64()
					return &f, nil
				},
			},
		},
		//{
		//	Name:           "handle FLOAT4",
		//	InputScanType: reflect.TypeOf(sql.NullInt16{}),
		//	InputTypeName:  "FLOAT4",
		//	FrameConverter: sqlutil.FrameConverter{
		//		FieldType: data.FieldTypeNullableInt8,
		//		ConverterFunc: func(in interface{}) (interface{}, error) { return in, nil },
		//	},
		//	ConversionFunc:
		//	Replacer: &sqlutil.StringFieldReplacer{
		//		OutputFieldType: data.FieldTypeNullableFloat64,
		//		ReplaceFunc: func(in *string) (any, error) {
		//			if in == nil {
		//				return nil, nil
		//			}
		//			v, err := strconv.ParseFloat(*in, 64)
		//			if err != nil {
		//				return nil, err
		//			}
		//			return &v, nil
		//		},
		//	},
		//},
		//{
		//	Name:           "handle FLOAT8",
		//	InputScanKind:  reflect.Interface,
		//	InputTypeName:  "FLOAT8",
		//	ConversionFunc: func(in *string) (*string, error) { return in, nil },
		//	Replacer: &sqlutil.StringFieldReplacer{
		//		OutputFieldType: data.FieldTypeNullableFloat64,
		//		ReplaceFunc: func(in *string) (any, error) {
		//			if in == nil {
		//				return nil, nil
		//			}
		//			v, err := strconv.ParseFloat(*in, 64)
		//			if err != nil {
		//				return nil, err
		//			}
		//			return &v, nil
		//		},
		//	},
		//},
		//{
		//	Name:           "handle NUMERIC",
		//	InputScanKind:  reflect.Interface,
		//	InputTypeName:  "NUMERIC",
		//	ConversionFunc: func(in *string) (*string, error) { return in, nil },
		//	Replacer: &sqlutil.StringFieldReplacer{
		//		OutputFieldType: data.FieldTypeNullableFloat64,
		//		ReplaceFunc: func(in *string) (any, error) {
		//			if in == nil {
		//				return nil, nil
		//			}
		//			v, err := strconv.ParseFloat(*in, 64)
		//			if err != nil {
		//				return nil, err
		//			}
		//			return &v, nil
		//		},
		//	},
		//},
		//{
		//	Name:           "handle DECIMAL",
		//	InputScanKind:  reflect.Interface,
		//	InputTypeName:  "DECIMAL(15,2)",
		//	ConversionFunc: func(in *string) (*string, error) { return in, nil },
		//	Replacer: &sqlutil.StringFieldReplacer{
		//		OutputFieldType: data.FieldTypeNullableFloat64,
		//		ReplaceFunc: func(in *string) (any, error) {
		//			if in == nil {
		//				return nil, nil
		//			}
		//			v, err := strconv.ParseFloat(*in, 64)
		//			if err != nil {
		//				return nil, err
		//			}
		//			return &v, nil
		//		},
		//	},
		//},
		//{
		//	Name:           "handle INT2",
		//	InputScanKind:  reflect.Interface,
		//	InputTypeName:  "INT2",
		//	ConversionFunc: func(in *string) (*string, error) { return in, nil },
		//	Replacer: &sqlutil.StringFieldReplacer{
		//		OutputFieldType: data.FieldTypeNullableInt16,
		//		ReplaceFunc: func(in *string) (any, error) {
		//			if in == nil {
		//				return nil, nil
		//			}
		//			i64, err := strconv.ParseInt(*in, 10, 16)
		//			if err != nil {
		//				return nil, err
		//			}
		//			v := int16(i64)
		//			return &v, nil
		//		},
		//	},
		//},
	}
}
