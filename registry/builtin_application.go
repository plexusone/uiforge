package registry

import (
	"encoding/json"

	"github.com/plexusone/uiforge/uispec"
)

// RegisterApplicationComponents adds the application namespace components to
// the registry: input, select, checkbox, form, record-detail, record-list,
// action-bar, badge. These are the form/record/action primitives used by the
// application and portal profiles.
func RegisterApplicationComponents(r *Registry) error {
	specs := []*ComponentSpec{
		{
			ID:       "application.input",
			Version:  "1.0.0",
			Category: "form",
			Runtime:  "react",
			PropertiesSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"label":       {"type": "string"},
					"placeholder": {"type": "string"},
					"type":        {"type": "string", "enum": ["text","email","number","password","date"]},
					"required":    {"type": "boolean"},
					"disabled":    {"type": "boolean"}
				}
			}`),
			DataInputs: map[string]DataInput{
				"value": {Type: "scalar", Description: "Bound field value (usually a state path)"},
			},
			Events: map[string]EventDef{
				"change": {Description: "Value changed", Schema: json.RawMessage(`{"type":"object","properties":{"value":{"type":"string"}}}`)},
			},
			Capabilities: []string{uispec.CapabilityStateWrite},
			DesignSystem: &DesignSystemRef{
				Tokens: []string{"border", "surface", "text", "focus", "radius"},
			},
		},
		{
			ID:       "application.select",
			Version:  "1.0.0",
			Category: "form",
			Runtime:  "react",
			PropertiesSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"label":       {"type": "string"},
					"placeholder": {"type": "string"},
					"options":     {"type": "array"},
					"disabled":    {"type": "boolean"}
				}
			}`),
			DataInputs: map[string]DataInput{
				"value": {Type: "scalar", Description: "Bound selected value"},
			},
			Events: map[string]EventDef{
				"change": {Description: "Selection changed", Schema: json.RawMessage(`{"type":"object","properties":{"value":{"type":"string"}}}`)},
			},
			Capabilities: []string{uispec.CapabilityStateWrite},
			DesignSystem: &DesignSystemRef{
				Tokens: []string{"border", "surface", "text", "focus", "radius"},
			},
		},
		{
			ID:       "application.checkbox",
			Version:  "1.0.0",
			Category: "form",
			Runtime:  "react",
			PropertiesSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"label":    {"type": "string"},
					"disabled": {"type": "boolean"}
				}
			}`),
			DataInputs: map[string]DataInput{
				"value": {Type: "scalar", Description: "Bound checked state"},
			},
			Events: map[string]EventDef{
				"change": {Description: "Checked state changed", Schema: json.RawMessage(`{"type":"object","properties":{"checked":{"type":"boolean"}}}`)},
			},
			Capabilities: []string{uispec.CapabilityStateWrite},
			DesignSystem: &DesignSystemRef{
				Tokens: []string{"primary", "border", "text"},
			},
		},
		{
			ID:       "application.form",
			Version:  "1.0.0",
			Category: "container",
			Runtime:  "react",
			PropertiesSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"title":       {"type": "string"},
					"submitLabel": {"type": "string"}
				}
			}`),
			Events: map[string]EventDef{
				"submit": {Description: "Form submitted"},
			},
			DesignSystem: &DesignSystemRef{
				Tokens: []string{"surface", "border", "radius"},
			},
		},
		{
			ID:       "application.record-detail",
			Version:  "1.0.0",
			Category: "record",
			Runtime:  "react",
			PropertiesSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"title":  {"type": "string"},
					"fields": {"type": "array"}
				}
			}`),
			DataInputs: map[string]DataInput{
				"record": {Type: "object", Description: "The record to display", Required: true},
			},
			Events: map[string]EventDef{
				"edit": {Description: "Edit requested for a field", Schema: json.RawMessage(`{"type":"object","properties":{"field":{"type":"string"}}}`)},
			},
			Capabilities: []string{uispec.CapabilityDataRead},
			DesignSystem: &DesignSystemRef{
				Tokens: []string{"surface", "border", "text", "text-muted", "radius"},
			},
		},
		{
			ID:       "application.record-list",
			Version:  "1.0.0",
			Category: "record",
			Runtime:  "react",
			PropertiesSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"title":      {"type": "string"},
					"columns":    {"type": "array"},
					"selectable": {"type": "boolean"}
				}
			}`),
			DataInputs: map[string]DataInput{
				"records": {Type: "array", Description: "Records to list", Required: true},
			},
			Events: map[string]EventDef{
				"select": {Description: "Record selected", Schema: json.RawMessage(`{"type":"object","properties":{"id":{"type":"string"}}}`)},
			},
			Capabilities: []string{uispec.CapabilityDataRead},
			DesignSystem: &DesignSystemRef{
				Tokens: []string{"surface", "border", "text", "text-muted", "radius"},
			},
		},
		{
			ID:       "application.action-bar",
			Version:  "1.0.0",
			Category: "action",
			Runtime:  "react",
			PropertiesSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"actions":   {"type": "array"},
					"alignment": {"type": "string", "enum": ["start","center","end"]}
				},
				"required": ["actions"]
			}`),
			Events: map[string]EventDef{
				"action": {Description: "An action was triggered", Schema: json.RawMessage(`{"type":"object","properties":{"action":{"type":"string"}}}`)},
			},
			DesignSystem: &DesignSystemRef{
				Tokens: []string{"primary", "danger", "surface", "radius"},
			},
		},
		{
			ID:       "application.badge",
			Version:  "1.0.0",
			Category: "display",
			Runtime:  "react",
			PropertiesSchema: json.RawMessage(`{
				"type": "object",
				"properties": {
					"label": {"type": "string"},
					"tone":  {"type": "string", "enum": ["neutral","info","success","warning","danger"]}
				},
				"required": ["label"]
			}`),
			DesignSystem: &DesignSystemRef{
				Tokens:   []string{"info", "success", "warning", "danger", "neutral", "radius"},
				Variants: []string{"neutral", "info", "success", "warning", "danger"},
			},
		},
	}

	for _, s := range specs {
		if err := r.Register(s); err != nil {
			return err
		}
	}
	return nil
}
