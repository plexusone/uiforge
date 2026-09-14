// Package theme adapts design-system-spec (DSS) documents into UIForge
// themes.
//
// UIForge components consume a fixed set of semantic CSS custom properties
// (--uiforge-primary, --uiforge-surface, --uiforge-text-muted, ...) named
// after DSS's semantic vocabulary. This package generates the binding layer
// from any DSS document to that contract, so reliant services keep their own
// brand tokens — and their own CSS variable prefix — while UIForge components
// stay brand-agnostic. White-labeling is expressed as values bound per page
// scope, never by renaming UIForge's internal contract.
package theme

import (
	"fmt"
	"maps"
	"sort"
	"strings"

	dss "github.com/plexusone/systemspec-designsystem/sdk/go"

	"github.com/plexusone/uiforge/uispec"
)

// Mode selects which per-token color value to use — "light", "dark", or any
// other mode a DSS document declares (e.g. "high-contrast").
type Mode string

const (
	// ModeDefault uses each token's base value.
	ModeDefault Mode = ""
	// ModeLight prefers the token's light-mode value when one is defined.
	ModeLight Mode = "light"
	// ModeDark prefers the token's dark-mode value when one is defined.
	ModeDark Mode = "dark"
)

// Options configures theme generation.
type Options struct {
	// SourcePrefix is the host design system's CSS variable prefix (e.g.
	// "--plexus"). When set, generated values reference the host's own
	// variables — var(--plexus-cyan, #06b6d4) — so the host stylesheet stays
	// authoritative and the brand can restyle at runtime. When empty, raw
	// token values are emitted. The source prefix follows the DSS output
	// mapping convention: colors as --{prefix}-{id}, fonts as
	// --{prefix}-font-{id}, radii as --{prefix}-radius-{id}.
	SourcePrefix string

	// Mode selects which mode's per-token value to use — any mode the DSS
	// document declares. Tokens without a value for the selected mode fall
	// back to their base value.
	Mode Mode
}

// Theme is a resolved set of UIForge token bindings.
type Theme struct {
	// Tokens maps UIForge token keys (DSS semantics such as "primary",
	// "surface", "text-muted", plus "font-family" and "radius") to CSS
	// values or var() references.
	Tokens map[string]string
}

// FromDesignSystem builds a UIForge theme from a DSS document.
//
// Colors are keyed by their declared semantic (first token per semantic
// wins). The first font family (preferring id "sans") becomes "font-family";
// the "md" border radius (or the first defined) becomes "radius".
func FromDesignSystem(ds *dss.DesignSystem, opts Options) (*Theme, error) {
	if ds == nil {
		return nil, fmt.Errorf("design system is nil")
	}
	f := ds.Foundations
	if len(f.Colors) == 0 && f.Typography == nil && len(f.BorderRadius) == 0 {
		return nil, fmt.Errorf("design system has no foundations")
	}

	t := &Theme{Tokens: map[string]string{}}

	for _, c := range f.Colors {
		if c.Semantic == "" || !dss.IsValidSemantic(c.Semantic) {
			continue
		}
		if _, exists := t.Tokens[c.Semantic]; exists {
			continue
		}
		t.Tokens[c.Semantic] = bind(opts.SourcePrefix, c.ID, colorValue(c, opts.Mode))
	}

	if f.Typography != nil && len(f.Typography.FontFamilies) > 0 {
		family := f.Typography.FontFamilies[0]
		for _, ff := range f.Typography.FontFamilies {
			if ff.ID == "sans" {
				family = ff
				break
			}
		}
		stack := family.Stack
		if stack == "" {
			stack = family.Value
		}
		if stack != "" {
			t.Tokens["font-family"] = bind(opts.SourcePrefix, "font-"+family.ID, stack)
		}
	}

	if len(f.BorderRadius) > 0 {
		radius := f.BorderRadius[0]
		for _, r := range f.BorderRadius {
			if r.ID == "md" {
				radius = r
				break
			}
		}
		t.Tokens["radius"] = bind(opts.SourcePrefix, "radius-"+radius.ID, radius.Value)
	}

	return t, nil
}

// CSS renders the theme as a stylesheet block that binds UIForge's semantic
// custom properties under the given selector (e.g. ":root" or a host
// element selector for scoped, multi-tenant embedding). Output is sorted for
// deterministic generation.
func (t *Theme) CSS(selector string) string {
	keys := make([]string, 0, len(t.Tokens))
	for k := range t.Tokens {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var b strings.Builder
	fmt.Fprintf(&b, "%s {\n", selector)
	for _, k := range keys {
		fmt.Fprintf(&b, "  --uiforge-%s: %s;\n", k, t.Tokens[k])
	}
	b.WriteString("}\n")
	return b.String()
}

// FromDesignSystemWithModes builds a theme whose base tokens use each
// token's default value and whose Modes overlays carry the per-mode values
// that differ from the base — enabling runtime mode switching without
// regenerating the theme. Overlays are generated for every mode the DSS
// document declares (declaredModes), so a document with a "high-contrast"
// mode produces a "high-contrast" overlay alongside light/dark.
func FromDesignSystemWithModes(ds *dss.DesignSystem, opts Options) (*Theme, *uispec.ThemeRef, error) {
	base, err := FromDesignSystem(ds, Options{SourcePrefix: opts.SourcePrefix})
	if err != nil {
		return nil, nil, err
	}
	modes := map[string]map[string]string{}
	for _, mode := range declaredModes(ds) {
		variant, err := FromDesignSystem(ds, Options{SourcePrefix: opts.SourcePrefix, Mode: Mode(mode)})
		if err != nil {
			return nil, nil, err
		}
		overlay := map[string]string{}
		for k, v := range variant.Tokens {
			if base.Tokens[k] != v {
				overlay[k] = v
			}
		}
		if len(overlay) > 0 {
			modes[mode] = overlay
		}
	}
	ref := base.ThemeRef("", opts.Mode)
	ref.Modes = modes
	return base, ref, nil
}

// declaredModes returns the modes theme overlays should be generated for:
// the union of the DSS document's declared Modes and any mode key present on
// a color token, mirroring DSS's own CSS-generation convention. A document
// that only uses the legacy lightModeValue/darkModeValue sugar fields (no
// Modes declaration) still yields "light"/"dark" via EffectiveModes().
func declaredModes(ds *dss.DesignSystem) []string {
	seen := map[string]bool{}
	var modes []string
	add := func(m string) {
		if m != "" && !seen[m] {
			seen[m] = true
			modes = append(modes, m)
		}
	}
	for _, m := range ds.Modes {
		add(m)
	}
	for _, c := range ds.Foundations.Colors {
		for m := range c.EffectiveModes() {
			add(m)
		}
	}
	sort.Strings(modes)
	return modes
}

// CSSWithModes renders the base tokens under the selector plus one override
// block per mode, keyed by the data-uiforge-mode attribute the renderers set:
//
//	selector { --uiforge-...: base }
//	selector[data-uiforge-mode="dark"] { --uiforge-...: overlay }
func (t *Theme) CSSWithModes(selector string, modes map[string]map[string]string) string {
	var b strings.Builder
	b.WriteString(t.CSS(selector))
	modeNames := make([]string, 0, len(modes))
	for m := range modes {
		modeNames = append(modeNames, m)
	}
	sort.Strings(modeNames)
	for _, m := range modeNames {
		overlay := Theme{Tokens: modes[m]}
		b.WriteString(overlay.CSS(fmt.Sprintf("%s[data-uiforge-mode=%q]", selector, m)))
	}
	return b.String()
}

// ThemeRef converts the theme into a uispec.ThemeRef for embedding directly
// in a PageSpec. The renderers apply each token as --uiforge-<key> on the
// page root, which scopes the brand to that page instance.
func (t *Theme) ThemeRef(id string, mode Mode) *uispec.ThemeRef {
	tokens := make(map[string]string, len(t.Tokens))
	maps.Copy(tokens, t.Tokens)
	return &uispec.ThemeRef{ID: id, Variant: string(mode), Tokens: tokens}
}

// ValidTokenKeys returns the token keys UIForge themes may use — the
// canonical contract defined by uispec.ValidThemeTokenKeys (the DSS semantic
// vocabulary plus UIForge's non-color category keys).
func ValidTokenKeys() []string {
	return append([]string{}, uispec.ValidThemeTokenKeys...)
}

// ValidateTokens reports theme token keys that are not part of the UIForge
// token contract. Unknown keys are not fatal — renderers emit them verbatim —
// but components will never read them.
func ValidateTokens(tokens map[string]string) []string {
	valid := map[string]bool{}
	for _, k := range ValidTokenKeys() {
		valid[k] = true
	}
	var unknown []string
	for k := range tokens {
		if !valid[k] {
			unknown = append(unknown, k)
		}
	}
	sort.Strings(unknown)
	return unknown
}

func colorValue(c dss.ColorToken, mode Mode) string {
	if v, ok := c.EffectiveModes()[string(mode)]; ok && v != "" {
		return v
	}
	return c.Value
}

// bind emits either a raw value or a reference to the host design system's
// own variable with the raw value as fallback.
func bind(sourcePrefix, id, value string) string {
	if sourcePrefix == "" {
		return value
	}
	return fmt.Sprintf("var(%s-%s, %s)", sourcePrefix, id, value)
}
