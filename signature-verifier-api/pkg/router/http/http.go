package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/iden3/go-service-template/pkg/router/http/handlers"
	"github.com/iden3/go-service-template/pkg/router/http/middleware"
)

type Handlers struct {
	systemHandler handlers.SystemHandler
}

func NewHandlers(systemHandler handlers.SystemHandler) Handlers {
	return Handlers{
		systemHandler: systemHandler,
	}
}

func (h *Handlers) NewRouter(opts ...Option) http.Handler {
	r := chi.NewRouter()

	for _, opt := range opts {
		opt(r)
	}

	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(middleware.RequestLog)
	r.Use(chimiddleware.Recoverer)

	h.basicRouters(r)
	h.userRouters(r)

	return r
}

func (h Handlers) basicRouters(r *chi.Mux) {
	r.Get("/readiness", h.systemHandler.Readiness)
	r.Get("/liveness", h.systemHandler.Liveness)
}

func (h Handlers) userRouters(_ *chi.Mux) {

}
