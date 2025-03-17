package main

import (
	"errors"
	"log"
	"net/http"

	"github.com/iden3/go-service-template/config"
	"github.com/iden3/go-service-template/pkg/logger"
	httprouter "github.com/iden3/go-service-template/pkg/router/http"
	"github.com/iden3/go-service-template/pkg/router/http/handlers"
	"github.com/iden3/go-service-template/pkg/services/system"
	"github.com/iden3/go-service-template/pkg/shutdown"
	httptransport "github.com/iden3/go-service-template/pkg/transport/http"
)

func main() {
	cfg, err := config.Parse()
	if err != nil {
		log.Fatalf("failed to parse config: %v", err)
	}

	if err = logger.SetDefaultLogger(
		cfg.Log.Environment,
		cfg.Log.LogLevel(),
	); err != nil {
		log.Fatalf("failed to set default logger: %v", err)
	}

	httpserver := newHTTPServer(cfg)
	newShutdownManager(httpserver).HandleShutdownSignal()
}

func newHTTPServer(cfg *config.Config) *httptransport.Server {
	// init handlers
	systemHandlers := handlers.NewSystemHandler(
		system.NewReadinessService(),
		system.NewLivenessService(),
	)

	// init routers
	h := httprouter.NewHandlers(systemHandlers)
	routers := h.NewRouter(
		httprouter.WithOrigins(cfg.HTTPServer.Origins),
	)

	// run http server
	httpserver := httptransport.New(
		routers,
	)

	go func() {
		err := httpserver.Start()
		if errors.Is(err, http.ErrServerClosed) {
			logger.Info("HTTP server closed by request")
		} else {
			logger.WithError(err).Fatal("http server closed with error")
		}
	}()

	return httpserver
}

func newShutdownManager(toclose ...shutdown.Shutdown) *shutdown.Manager {
	m := shutdown.NewManager()
	for _, s := range toclose {
		m.Register(s)
	}
	return m
}
