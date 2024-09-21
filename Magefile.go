//go:build mage
// +build mage

package main

import (
	"fmt"
	build "github.com/grafana/grafana-plugin-sdk-go/build"
)

func Default() {
	fmt.Printf("HI\n")

	build.SetBeforeBuildCallback(
		build.BeforeBuildCallback(func(cfg build.Config) (build.Config, error) {
			cfg.EnableDebug = true
			cfg.EnableCGo = true

			return cfg, nil
		}))

	b := build.Build{}

	b.LinuxARM64()

	//build.BuildAll()
}
