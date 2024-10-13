//go:build mage
// +build mage

package main

import (
	"fmt"
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

	if err := b.LinuxARM64(); err != nil {
		fmt.Printf("ERROR building ARM64: %v\n", err)
		panic
	}
}

func Amd64() {
	build.SetBeforeBuildCallback(
		build.BeforeBuildCallback(func(cfg build.Config) (build.Config, error) {
			cfg.EnableDebug = true
			cfg.EnableCGo = true

			return cfg, nil
		}))

	b := build.Build{}

	if err := b.Linux(); err != nil {
		fmt.Printf("ERROR building Linux Amd64: %v\n", err)
		panic
	}
}

func Coverage() {
	build.Coverage()
}
