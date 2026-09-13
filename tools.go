//go:build tools

// Package tools pins build-time tool dependencies so `go mod tidy` retains
// them. The schema generator (schema/generate/main.go) is excluded from
// builds via a go:build ignore tag, so its imports are invisible to tidy
// without this file.
package tools

import (
	_ "github.com/invopop/jsonschema"
)
