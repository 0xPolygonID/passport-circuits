package config

import (
	"log/slog"

	"github.com/iden3/go-service-template/pkg/logger"
	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	Log        Log        `envconfig:"LOG"`
	HTTPServer HTTPServer `envconfig:"HTTP_SERVER"`
}

type Log struct {
	Level       string `envconfig:"LEVEL" default:"INFO"`
	Environment string `envconfig:"ENVIRONMENT" default:"production"`
}

func (l *Log) LogLevel() (loglevel slog.Level) {
	switch l.Level {
	case "DEBUG":
		loglevel = slog.LevelDebug
	case "INFO":
		loglevel = slog.LevelInfo
	case "WARN":
		loglevel = slog.LevelWarn
	case "ERROR":
		loglevel = slog.LevelError
	case "FATAL":
		loglevel = logger.LevelFatal
	case "NOTICE":
		loglevel = logger.LevelNotice
	}
	return
}

type HTTPServer struct {
	Port    string   `envconfig:"PORT" default:"8080"`
	Origins []string `envconfig:"ORIGINS" default:"*"`
}

func Parse() (*Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
