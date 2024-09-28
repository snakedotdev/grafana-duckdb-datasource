package plugin

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
	"net/http"
	"os"
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
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
)

// NewDatasource creates a new datasource instance.
func NewDatasource(_ context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	backend.Logger.Info("new datasource")
	tmp := &models.PluginSettings{}
	if err := json.Unmarshal(settings.JSONData, tmp); err != nil {
		return nil, err
	}

	ds := &Datasource{
		path: tmp.DuckDbFilePath,
	}

	// set up query data handler
	queryTypeMux := datasource.NewQueryTypeMux()
	queryTypeMux.HandleFunc("", ds.handleQueryFallback)
	ds.queryHandler = queryTypeMux

	// set up the call handler
	routeMux := http.NewServeMux()
	routeMux.HandleFunc("/table", ds.getTables)
	ds.resourceHandler = httpadapter.New(routeMux)

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
	backend.Logger.Info("call resource")
	return d.resourceHandler.CallResource(ctx, req, sender)
}

//func (d *Datasource) ServeHTTP(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
//	if req.Path == "table" {
//		return d.getTables(ctx, sender)
//	}
//	return nil
//}

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
	// check whether file exists

	// check the timestamp of last modified
	// if it is newer from the last time
	// we loaded the db, then reload the db
	if fileInfo, err := os.Stat(d.path); err != nil {
		return err
	} else {
		lastModified := fileInfo.ModTime()
		if lastModified.After(d.lastLoaded) {
			backend.Logger.Info("reloading database", "lastModified", lastModified, "lastLoaded", d.lastLoaded)
			if err := d.db.Close(); err != nil {
				backend.Logger.Error("error closing database", "error", err)
				return err
			}
			if db, err := sql.Open("duckdb", d.path); err != nil {
				backend.Logger.Info("error with init")
				backend.Logger.Error("error initializing connection", "error", err)
				return err
			} else {
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
func (d *Datasource) executeQuery(ctx context.Context, query string) (*sql.Rows, error) {
	d.mutex.Lock()
	defer d.mutex.Unlock()

	// Get a connection from the pool
	if rows, err := d.db.QueryContext(ctx, query); err != nil {
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

type queryModel struct{}

func (d *Datasource) query(ctx context.Context, pCtx backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	var response backend.DataResponse

	// Unmarshal the JSON into our queryModel.
	var qm queryModel

	backend.Logger.Info("Query: ", query.JSON)

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}
	backend.Logger.Info("Checking whether need to reload database...")

	backend.Logger.Info("About to execute query...")
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

	if config.DuckDbFilePath == "" {
		res.Status = backend.HealthStatusError
		res.Message = "Duck DB File Path is missing"
		return res, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}
