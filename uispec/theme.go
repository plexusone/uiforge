package uispec

// ThemeRef references a design-system theme for the page.
type ThemeRef struct {
	ID      string            `json:"id"`
	Variant string            `json:"variant,omitempty"`
	Tokens  map[string]string `json:"tokens,omitempty"`
}

// ValidThemeTokenKeys is UIForge's design-token contract: the semantic color
// vocabulary (mirroring design-system-spec's ValidSemantics — the theme
// package guards this equivalence in its tests) plus UIForge's non-color
// category keys. Renderers surface each key as a --uiforge-<key> CSS custom
// property; components read only these keys.
var ValidThemeTokenKeys = []string{
	"primary",
	"secondary",
	"accent",
	"danger",
	"warning",
	"success",
	"info",
	"neutral",
	"surface",
	"background",
	"text",
	"text-muted",
	"text-inverse",
	"border",
	"focus",
	"disabled",
	"shadow",
	"font-family",
	"radius",
}

// IsValidThemeToken reports whether key is part of the design-token contract.
func IsValidThemeToken(key string) bool {
	for _, k := range ValidThemeTokenKeys {
		if k == key {
			return true
		}
	}
	return false
}
