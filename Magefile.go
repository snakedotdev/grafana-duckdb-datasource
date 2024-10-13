//go:build mage
// +build mage

package main

import (
	build "github.com/grafana/grafana-plugin-sdk-go/build"
)

func Aarch64() {
	build.SetBeforeBuildCallback(
		build.BeforeBuildCallback(func(cfg build.Config) (build.Config, error) {
			cfg.EnableDebug = true
			cfg.EnableCGo = true

			return cfg, nil
		}))

	b := build.Build{}

	b.LinuxARM64()
}

func Amd64() {
	build.SetBeforeBuildCallback(
		build.BeforeBuildCallback(func(cfg build.Config) (build.Config, error) {
			cfg.EnableDebug = true
			cfg.EnableCGo = true

			return cfg, nil
		}))

	b := build.Build{}

	b.Linux()
}

func Coverage() {
	build.Coverage()
}
