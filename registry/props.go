package registry

import (
	"encoding/json"
	"fmt"
	"strings"
)

// propsSchema is the subset of JSON Schema the registry enforces on component
// instance properties: required, per-property primitive type, enum, and
// additionalProperties:false. Anything beyond this subset is ignored rather
// than rejected — full JSON Schema validation belongs to the schema package's
// generated document schemas.
type propsSchema struct {
	Type                 string                `json:"type"`
	Required             []string              `json:"required"`
	Properties           map[string]propsField `json:"properties"`
	AdditionalProperties *json.RawMessage      `json:"additionalProperties"`
}

type propsField struct {
	Type string `json:"type"`
	Enum []any  `json:"enum"`
}

// ValidateProperties checks a component instance's properties against the
// manifest's propertiesSchema. String values containing ${...} expressions
// are skipped for type and enum checks because they resolve at runtime.
func ValidateProperties(schema json.RawMessage, props map[string]any) []string {
	if len(schema) == 0 {
		return nil
	}
	var ps propsSchema
	if err := json.Unmarshal(schema, &ps); err != nil {
		return []string{fmt.Sprintf("invalid propertiesSchema: %v", err)}
	}

	var errs []string

	for _, name := range ps.Required {
		if _, ok := props[name]; !ok {
			errs = append(errs, fmt.Sprintf("required property %q is missing", name))
		}
	}

	additionalForbidden := ps.AdditionalProperties != nil && string(*ps.AdditionalProperties) == "false"

	for name, value := range props {
		field, declared := ps.Properties[name]
		if !declared {
			if additionalForbidden {
				errs = append(errs, fmt.Sprintf("property %q is not declared and additional properties are forbidden", name))
			}
			continue
		}

		if s, ok := value.(string); ok && strings.Contains(s, "${") {
			continue // runtime expression — cannot type-check statically
		}

		if field.Type != "" && !matchesType(value, field.Type) {
			errs = append(errs, fmt.Sprintf("property %q: expected %s, got %T", name, field.Type, value))
			continue
		}

		if len(field.Enum) > 0 && !enumContains(field.Enum, value) {
			errs = append(errs, fmt.Sprintf("property %q: value %v is not one of the allowed values", name, value))
		}
	}

	return errs
}

func matchesType(value any, schemaType string) bool {
	switch schemaType {
	case "string":
		_, ok := value.(string)
		return ok
	case "boolean":
		_, ok := value.(bool)
		return ok
	case "number":
		switch value.(type) {
		case float64, float32, int, int32, int64, json.Number:
			return true
		}
		return false
	case "integer":
		switch v := value.(type) {
		case int, int32, int64:
			return true
		case float64:
			return v == float64(int64(v))
		case json.Number:
			_, err := v.Int64()
			return err == nil
		}
		return false
	case "array":
		_, ok := value.([]any)
		return ok
	case "object":
		_, ok := value.(map[string]any)
		return ok
	case "null":
		return value == nil
	default:
		return true // unknown schema type — do not reject
	}
}

func enumContains(enum []any, value any) bool {
	for _, e := range enum {
		if fmt.Sprintf("%v", e) == fmt.Sprintf("%v", value) {
			return true
		}
	}
	return false
}
