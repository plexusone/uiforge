package registry

import (
	"os"
	"path/filepath"
	"testing"
)

const validManifest = `{
	"id": "acme.pipeline-forecast",
	"version": "1.4.2",
	"category": "visualization",
	"runtime": "react",
	"propertiesSchema": {
		"type": "object",
		"required": ["forecastPeriod"],
		"properties": {
			"forecastPeriod": {"type": "string", "enum": ["month", "quarter", "year"]}
		}
	},
	"dataInputs": {
		"pipeline": {"type": "timeseries", "required": true}
	},
	"capabilities": ["data.read"]
}`

func TestLoadManifest(t *testing.T) {
	r := New()
	if err := r.LoadManifest([]byte(validManifest)); err != nil {
		t.Fatalf("LoadManifest: %v", err)
	}

	spec := r.Get("acme.pipeline-forecast")
	if spec == nil {
		t.Fatal("component not registered after LoadManifest")
	}
	if spec.Namespace != "acme" {
		t.Errorf("namespace = %q, want %q", spec.Namespace, "acme")
	}
	if spec.Version != "1.4.2" {
		t.Errorf("version = %q, want %q", spec.Version, "1.4.2")
	}
	if !spec.DataInputs["pipeline"].Required {
		t.Error("pipeline data input should be required")
	}
}

func TestLoadManifestInvalid(t *testing.T) {
	r := New()
	if err := r.LoadManifest([]byte(`{not json`)); err == nil {
		t.Error("expected error for malformed JSON")
	}
	if err := r.LoadManifest([]byte(`{"id": "no-namespace", "version": "1.0.0"}`)); err == nil {
		t.Error("expected error for ID without namespace")
	}
	if err := r.LoadManifest([]byte(`{"id": "acme.widget"}`)); err == nil {
		t.Error("expected error for missing version")
	}
}

func TestLoadManifestDir(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "forecast.json"), []byte(validManifest), 0644); err != nil {
		t.Fatal(err)
	}
	second := `{"id": "acme.widget", "version": "2.0.0", "category": "display", "runtime": "react"}`
	if err := os.WriteFile(filepath.Join(dir, "widget.json"), []byte(second), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "notes.txt"), []byte("ignore me"), 0644); err != nil {
		t.Fatal(err)
	}

	r := New()
	n, err := r.LoadManifestDir(dir)
	if err != nil {
		t.Fatalf("LoadManifestDir: %v", err)
	}
	if n != 2 {
		t.Errorf("loaded %d manifests, want 2", n)
	}
	if !r.Has("acme.pipeline-forecast") || !r.Has("acme.widget") {
		t.Error("expected both manifests registered")
	}
}

func TestCheckVersionCompat(t *testing.T) {
	tests := []struct {
		requested  string
		registered string
		wantErr    bool
	}{
		{"", "1.2.3", false},
		{"1", "1.9.0", false},
		{"1", "2.0.0", true},
		{"1.2", "1.2.9", false},
		{"1.2", "1.3.0", true},
		{"1.2.3", "1.2.3", false},
		{"1.2.3", "1.2.4", true},
		{"^1.2", "1.2.0", false},
		{"^1.2", "1.9.0", false},
		{"^1.2", "1.1.9", true},
		{"^1.2", "2.0.0", true},
		{"^1.2.3", "1.2.4", false},
		{"^1.2.3", "1.2.2", true},
		{"garbage", "1.0.0", true},
		{"1.2", "not-a-version", true},
	}
	for _, tt := range tests {
		err := CheckVersionCompat(tt.requested, tt.registered)
		if (err != nil) != tt.wantErr {
			t.Errorf("CheckVersionCompat(%q, %q) error = %v, wantErr %v",
				tt.requested, tt.registered, err, tt.wantErr)
		}
	}
}
