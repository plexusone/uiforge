package registry

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/plexusone/uiforge/uispec"
)

const testSchema = `{
	"type": "object",
	"required": ["title"],
	"properties": {
		"title":   {"type": "string"},
		"columns": {"type": "integer"},
		"ratio":   {"type": "number"},
		"visible": {"type": "boolean"},
		"tags":    {"type": "array"},
		"variant": {"type": "string", "enum": ["compact", "standard"]}
	}
}`

func TestValidateProperties(t *testing.T) {
	schema := json.RawMessage(testSchema)

	tests := []struct {
		name    string
		props   map[string]any
		wantErr string // substring of expected error; empty = no errors
	}{
		{"valid full", map[string]any{
			"title": "Sales", "columns": 3, "ratio": 1.5, "visible": true,
			"tags": []any{"a"}, "variant": "compact",
		}, ""},
		{"missing required", map[string]any{"columns": 3}, `required property "title" is missing`},
		{"wrong type string", map[string]any{"title": 42}, `property "title": expected string`},
		{"wrong type boolean", map[string]any{"title": "x", "visible": "yes"}, `expected boolean`},
		{"float for integer", map[string]any{"title": "x", "columns": 2.5}, `expected integer`},
		{"whole float for integer ok", map[string]any{"title": "x", "columns": float64(4)}, ""},
		{"enum violation", map[string]any{"title": "x", "variant": "dense"}, `not one of the allowed values`},
		{"expression skipped", map[string]any{"title": "${data.customer.name}", "variant": "${state.v}"}, ""},
		{"undeclared allowed by default", map[string]any{"title": "x", "extra": true}, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			errs := ValidateProperties(schema, tt.props)
			if tt.wantErr == "" {
				if len(errs) > 0 {
					t.Errorf("unexpected errors: %v", errs)
				}
				return
			}
			if !containsSubstring(errs, tt.wantErr) {
				t.Errorf("errors %v do not contain %q", errs, tt.wantErr)
			}
		})
	}
}

func TestValidatePropertiesAdditionalForbidden(t *testing.T) {
	schema := json.RawMessage(`{
		"type": "object",
		"properties": {"title": {"type": "string"}},
		"additionalProperties": false
	}`)
	errs := ValidateProperties(schema, map[string]any{"title": "x", "rogue": 1})
	if !containsSubstring(errs, `property "rogue" is not declared`) {
		t.Errorf("expected additional-property error, got %v", errs)
	}
}

func TestValidatePropertiesEmptySchema(t *testing.T) {
	if errs := ValidateProperties(nil, map[string]any{"anything": 1}); len(errs) > 0 {
		t.Errorf("nil schema should not produce errors, got %v", errs)
	}
}

func TestValidatePageEnforcesVersionAndProperties(t *testing.T) {
	r := New()
	if err := r.LoadManifest([]byte(validManifest)); err != nil {
		t.Fatal(err)
	}

	page := &uispec.PageSpec{
		APIVersion: uispec.APIVersion,
		Kind:       uispec.KindPage,
		Metadata:   uispec.PageMetadata{ID: "p", Name: "p", Title: "P"},
		Layout:     uispec.LayoutSpec{Type: uispec.LayoutStack},
		Components: []uispec.ComponentInstance{
			{
				ID:         "forecast",
				Type:       "acme.pipeline-forecast",
				Version:    "^2.0",                                     // registered is 1.4.2 → incompatible
				Properties: map[string]any{"forecastPeriod": "decade"}, // enum violation
				Data: map[string]uispec.Binding{
					"pipeline": {Source: "crm", Operation: "getPipeline"},
				},
			},
		},
	}

	err := r.ValidatePage(page)
	if err == nil {
		t.Fatal("expected validation errors")
	}
	msg := err.Error()
	if !strings.Contains(msg, "does not satisfy ^2.0") {
		t.Errorf("expected version error, got: %s", msg)
	}
	if !strings.Contains(msg, "not one of the allowed values") {
		t.Errorf("expected enum error, got: %s", msg)
	}
}

func containsSubstring(errs []string, substr string) bool {
	for _, e := range errs {
		if strings.Contains(e, substr) {
			return true
		}
	}
	return false
}
