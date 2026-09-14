package uispec

// ThemeRef references a design-system theme for the page.
type ThemeRef struct {
	ID      string            `json:"id"`
	Variant string            `json:"variant,omitempty"`
	Tokens  map[string]string `json:"tokens,omitempty"`
	// Modes holds per-mode token overlays (e.g. "light", "dark"). At render
	// time the active mode's overlay is applied on top of Tokens; Variant
	// names the default mode, and renderers can switch modes at runtime.
	Modes map[string]map[string]string `json:"modes,omitempty"`

	// Density selects the active spacing density by ID — any key present in
	// Densities (e.g. "comfortable", "compact", or a document-specific name
	// like "spacious"). Renderers surface it as a data-uiforge-density
	// attribute. A density with no matching Densities entry is invalid.
	Density string `json:"density,omitempty"`
	// Densities holds every declared density's spacing scale multiplier,
	// keyed by ID — resolved from a design system's foundations by
	// theme.FromDesignSystemWithModes. Renderers look up densities[density]
	// for the --uiforge-density CSS custom property, falling back to 1 when
	// absent.
	Densities map[string]float64 `json:"densities,omitempty"`
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
