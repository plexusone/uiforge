package theme

import (
	"strings"
	"testing"

	dss "github.com/plexusone/systemspec-designsystem/sdk/go"

	"github.com/plexusone/uiforge/uispec"
)

func fixture() *dss.DesignSystem {
	return &dss.DesignSystem{
		Meta: dss.Meta{Name: "Example", Version: "0.1.0"},
		Foundations: dss.Foundations{
			Colors: []dss.ColorToken{
				{ID: "teal", Value: "#0f766e", Semantic: "primary", LightModeValue: "#0d9488"},
				{ID: "teal-alt", Value: "#134e4a", Semantic: "primary"}, // duplicate semantic — ignored
				{ID: "slate-100", Value: "#f1f5f9", Semantic: "surface"},
				{ID: "slate-400", Value: "#94a3b8", Semantic: "text-muted"},
				{ID: "slate-200", Value: "#e2e8f0", Semantic: "border"},
				{ID: "plain", Value: "#000000"},                           // no semantic — ignored
				{ID: "odd", Value: "#ff00ff", Semantic: "not-a-semantic"}, // invalid — ignored
			},
			Typography: &dss.Typography{
				FontFamilies: []dss.FontFamily{
					{ID: "mono", Stack: "'Fira Code', monospace"},
					{ID: "sans", Stack: "'Inter', system-ui, sans-serif"},
				},
			},
			BorderRadius: []dss.BorderRadiusToken{
				{ID: "sm", Value: "0.25rem"},
				{ID: "md", Value: "0.5rem"},
			},
		},
	}
}

func TestFromDesignSystemRawValues(t *testing.T) {
	th, err := FromDesignSystem(fixture(), Options{})
	if err != nil {
		t.Fatal(err)
	}

	want := map[string]string{
		"primary":     "#0f766e",
		"surface":     "#f1f5f9",
		"text-muted":  "#94a3b8",
		"border":      "#e2e8f0",
		"font-family": "'Inter', system-ui, sans-serif",
		"radius":      "0.5rem",
	}
	for k, v := range want {
		if th.Tokens[k] != v {
			t.Errorf("token %q = %q, want %q", k, th.Tokens[k], v)
		}
	}
	if len(th.Tokens) != len(want) {
		t.Errorf("got %d tokens, want %d: %v", len(th.Tokens), len(want), th.Tokens)
	}
}

func TestFromDesignSystemSourcePrefix(t *testing.T) {
	th, err := FromDesignSystem(fixture(), Options{SourcePrefix: "--acme"})
	if err != nil {
		t.Fatal(err)
	}
	if got := th.Tokens["primary"]; got != "var(--acme-teal, #0f766e)" {
		t.Errorf("primary = %q", got)
	}
	if got := th.Tokens["font-family"]; got != "var(--acme-font-sans, 'Inter', system-ui, sans-serif)" {
		t.Errorf("font-family = %q", got)
	}
	if got := th.Tokens["radius"]; got != "var(--acme-radius-md, 0.5rem)" {
		t.Errorf("radius = %q", got)
	}
}

func TestFromDesignSystemModes(t *testing.T) {
	light, err := FromDesignSystem(fixture(), Options{Mode: ModeLight})
	if err != nil {
		t.Fatal(err)
	}
	if light.Tokens["primary"] != "#0d9488" {
		t.Errorf("light primary = %q, want lightModeValue", light.Tokens["primary"])
	}

	dark, err := FromDesignSystem(fixture(), Options{Mode: ModeDark})
	if err != nil {
		t.Fatal(err)
	}
	if dark.Tokens["primary"] != "#0f766e" {
		t.Errorf("dark primary = %q, want base value fallback", dark.Tokens["primary"])
	}
}

func TestCSSIsDeterministicAndScoped(t *testing.T) {
	th, err := FromDesignSystem(fixture(), Options{})
	if err != nil {
		t.Fatal(err)
	}
	css := th.CSS("uiforge-page.tenant-a")
	if !strings.HasPrefix(css, "uiforge-page.tenant-a {\n") {
		t.Errorf("selector not applied:\n%s", css)
	}
	if !strings.Contains(css, "  --uiforge-primary: #0f766e;\n") {
		t.Errorf("missing primary binding:\n%s", css)
	}
	want := ":root {\n" +
		"  --uiforge-border: #e2e8f0;\n" +
		"  --uiforge-font-family: 'Inter', system-ui, sans-serif;\n" +
		"  --uiforge-primary: #0f766e;\n" +
		"  --uiforge-radius: 0.5rem;\n" +
		"  --uiforge-surface: #f1f5f9;\n" +
		"  --uiforge-text-muted: #94a3b8;\n" +
		"}\n"
	if got := th.CSS(":root"); got != want {
		t.Errorf("CSS output not deterministic/sorted:\ngot:\n%s\nwant:\n%s", got, want)
	}
}

func TestThemeRef(t *testing.T) {
	th, err := FromDesignSystem(fixture(), Options{Mode: ModeLight})
	if err != nil {
		t.Fatal(err)
	}
	ref := th.ThemeRef("example", ModeLight)
	if ref.ID != "example" || ref.Variant != "light" {
		t.Errorf("ref = %+v", ref)
	}
	if ref.Tokens["primary"] != "#0d9488" {
		t.Errorf("ref primary = %q", ref.Tokens["primary"])
	}
	ref.Tokens["primary"] = "mutated"
	if th.Tokens["primary"] == "mutated" {
		t.Error("ThemeRef should copy tokens, not alias them")
	}
}

func TestFromDesignSystemNoFoundations(t *testing.T) {
	if _, err := FromDesignSystem(&dss.DesignSystem{}, Options{}); err == nil {
		t.Error("expected error for missing foundations")
	}
	if _, err := FromDesignSystem(nil, Options{}); err == nil {
		t.Error("expected error for nil design system")
	}
}

// TestContractMatchesDSS guards the doc claim in uispec.ValidThemeTokenKeys:
// the UIForge contract is exactly DSS's semantic vocabulary plus the
// non-color category keys.
func TestContractMatchesDSS(t *testing.T) {
	want := map[string]bool{"font-family": true, "radius": true}
	for _, s := range dss.ValidSemantics {
		want[s] = true
	}
	got := map[string]bool{}
	for _, k := range uispec.ValidThemeTokenKeys {
		if got[k] {
			t.Errorf("duplicate contract key %q", k)
		}
		got[k] = true
		if !want[k] {
			t.Errorf("contract key %q is neither a DSS semantic nor a UIForge category key", k)
		}
	}
	for k := range want {
		if !got[k] {
			t.Errorf("missing contract key %q", k)
		}
	}
}

func TestValidateTokens(t *testing.T) {
	unknown := ValidateTokens(map[string]string{
		"primary":       "#000",
		"font-family":   "sans-serif",
		"color-blurple": "#123",
		"spacing-9":     "1rem",
	})
	if len(unknown) != 2 || unknown[0] != "color-blurple" || unknown[1] != "spacing-9" {
		t.Errorf("unknown = %v", unknown)
	}
	if got := ValidateTokens(map[string]string{"surface": "#fff"}); len(got) != 0 {
		t.Errorf("expected no unknown keys, got %v", got)
	}
}

func TestFromDesignSystemWithModes(t *testing.T) {
	base, ref, err := FromDesignSystemWithModes(fixture(), Options{Mode: ModeDark})
	if err != nil {
		t.Fatal(err)
	}
	if base.Tokens["primary"] != "#0f766e" {
		t.Errorf("base primary = %q, want default value", base.Tokens["primary"])
	}
	light, ok := ref.Modes["light"]
	if !ok || light["primary"] != "#0d9488" {
		t.Errorf("light overlay = %v, want primary override", ref.Modes)
	}
	if _, ok := ref.Modes["dark"]; ok {
		t.Errorf("dark overlay should be absent when identical to base: %v", ref.Modes)
	}
	if ref.Variant != "dark" {
		t.Errorf("ref.Variant = %q, want dark", ref.Variant)
	}

	css := base.CSSWithModes("uiforge-page", ref.Modes)
	if !strings.Contains(css, "uiforge-page {\n") ||
		!strings.Contains(css, `uiforge-page[data-uiforge-mode="light"] {`+"\n  --uiforge-primary: #0d9488;") {
		t.Errorf("CSSWithModes output wrong:\n%s", css)
	}
}

// TestColorValueArbitraryMode guards that colorValue resolves modes beyond
// light/dark through DSS v0.7.0's generalized ColorToken.Modes map, not just
// the lightModeValue/darkModeValue sugar fields.
func TestColorValueArbitraryMode(t *testing.T) {
	ds := &dss.DesignSystem{
		Meta: dss.Meta{Name: "Example", Version: "0.1.0"},
		Foundations: dss.Foundations{
			Colors: []dss.ColorToken{
				{
					ID: "teal", Value: "#0f766e", Semantic: "primary",
					Modes: map[string]string{"high-contrast": "#000000"},
				},
			},
		},
	}
	th, err := FromDesignSystem(ds, Options{Mode: Mode("high-contrast")})
	if err != nil {
		t.Fatal(err)
	}
	if th.Tokens["primary"] != "#000000" {
		t.Errorf("primary = %q, want high-contrast mode value", th.Tokens["primary"])
	}

	// A mode the token has no value for falls back to the base value.
	th, err = FromDesignSystem(ds, Options{Mode: ModeDark})
	if err != nil {
		t.Fatal(err)
	}
	if th.Tokens["primary"] != "#0f766e" {
		t.Errorf("primary = %q, want base value fallback", th.Tokens["primary"])
	}
}

// TestFromDesignSystemWithModesGeneralized guards the actual new capability:
// a DSS document declaring more than two modes produces an overlay per
// declared mode, not just light/dark.
func TestFromDesignSystemWithModesGeneralized(t *testing.T) {
	ds := &dss.DesignSystem{
		Meta:  dss.Meta{Name: "Example", Version: "0.1.0"},
		Modes: []string{"light", "dark", "high-contrast"},
		Foundations: dss.Foundations{
			Colors: []dss.ColorToken{
				{
					ID: "teal", Value: "#0f766e", Semantic: "primary",
					Modes: map[string]string{
						"light":         "#0d9488",
						"dark":          "#134e4a",
						"high-contrast": "#000000",
					},
				},
			},
		},
	}
	_, ref, err := FromDesignSystemWithModes(ds, Options{Mode: ModeDark})
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]string{"light": "#0d9488", "dark": "#134e4a", "high-contrast": "#000000"}
	if len(ref.Modes) != len(want) {
		t.Fatalf("ref.Modes = %v, want %d overlays", ref.Modes, len(want))
	}
	for mode, val := range want {
		if ref.Modes[mode]["primary"] != val {
			t.Errorf("ref.Modes[%q][primary] = %q, want %q", mode, ref.Modes[mode]["primary"], val)
		}
	}
}
