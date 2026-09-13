package registry

import (
	"strings"
	"testing"

	"github.com/plexusone/uiforge/uispec"
)

func TestRegisterRejectsOffContractDesignTokens(t *testing.T) {
	r := New()
	err := r.Register(&ComponentSpec{
		ID:      "acme.widget",
		Version: "1.0.0",
		DesignSystem: &DesignSystemRef{
			Tokens: []string{"primary", "color-blurple", "spacing-9"},
		},
	})
	if err == nil {
		t.Fatal("expected error for off-contract design tokens")
	}
	for _, want := range []string{"color-blurple", "spacing-9"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error %q should name invalid token %q", err, want)
		}
	}

	if err := r.Register(&ComponentSpec{
		ID:      "acme.widget",
		Version: "1.0.0",
		DesignSystem: &DesignSystemRef{
			Tokens: []string{"primary", "surface", "text-muted", "font-family", "radius"},
		},
	}); err != nil {
		t.Fatalf("contract-conforming tokens should register: %v", err)
	}
}

func TestBuiltinManifestTokensAreOnContract(t *testing.T) {
	r, err := NewWithBuiltins()
	if err != nil {
		t.Fatal(err)
	}
	for _, spec := range r.List() {
		if spec.DesignSystem == nil {
			continue
		}
		for _, token := range spec.DesignSystem.Tokens {
			if !uispec.IsValidThemeToken(token) {
				t.Errorf("builtin %s declares off-contract token %q", spec.ID, token)
			}
		}
	}
}

func TestValidatePageRejectsOffContractThemeTokens(t *testing.T) {
	r, err := NewWithBuiltins()
	if err != nil {
		t.Fatal(err)
	}
	page := &uispec.PageSpec{
		APIVersion: uispec.APIVersion,
		Kind:       uispec.KindPage,
		Metadata:   uispec.PageMetadata{ID: "p", Name: "p", Title: "P"},
		Layout:     uispec.LayoutSpec{Type: uispec.LayoutStack},
		Theme: &uispec.ThemeRef{
			ID:     "brand",
			Tokens: map[string]string{"primary": "#000", "color-primary": "#000"},
		},
	}
	err = r.ValidatePage(page)
	if err == nil || !strings.Contains(err.Error(), `theme.tokens["color-primary"]`) {
		t.Fatalf("expected off-contract theme token error, got: %v", err)
	}

	page.Theme.Tokens = map[string]string{"primary": "#000", "radius": "4px"}
	if err := r.ValidatePage(page); err != nil {
		t.Fatalf("contract-conforming theme should validate: %v", err)
	}
}

func TestValidatePageRejectsProfileDisallowedCapabilities(t *testing.T) {
	r, err := NewWithBuiltins()
	if err != nil {
		t.Fatal(err)
	}
	if err := r.Register(&ComponentSpec{
		ID:           "acme.exfiltrator",
		Version:      "1.0.0",
		Capabilities: []string{"network.raw"},
	}); err != nil {
		t.Fatal(err)
	}

	page := &uispec.PageSpec{
		APIVersion: uispec.APIVersion,
		Kind:       uispec.KindPage,
		Metadata:   uispec.PageMetadata{ID: "p", Name: "p", Title: "P"},
		Profile:    uispec.ProfileDashboard,
		Layout:     uispec.LayoutSpec{Type: uispec.LayoutStack},
		Components: []uispec.ComponentInstance{
			{ID: "w", Type: "acme.exfiltrator"},
		},
	}
	err = r.ValidatePage(page)
	if err == nil || !strings.Contains(err.Error(), `capability "network.raw" is not allowed in the dashboard profile`) {
		t.Fatalf("expected capability violation, got: %v", err)
	}

	// Builtin capabilities are within every builtin profile's allowance.
	page.Components = []uispec.ComponentInstance{
		{
			ID:   "f",
			Type: "analytics.filter",
			Properties: map[string]any{
				"label":      "Period",
				"field":      "period",
				"filterType": "select",
			},
		},
	}
	if err := r.ValidatePage(page); err != nil {
		t.Fatalf("builtin capabilities should be allowed: %v", err)
	}
}

func TestValidatePageThemeModesAndDensity(t *testing.T) {
	r, err := NewWithBuiltins()
	if err != nil {
		t.Fatal(err)
	}
	page := &uispec.PageSpec{
		APIVersion: uispec.APIVersion,
		Kind:       uispec.KindPage,
		Metadata:   uispec.PageMetadata{ID: "p", Name: "p", Title: "P"},
		Layout:     uispec.LayoutSpec{Type: uispec.LayoutStack},
		Theme: &uispec.ThemeRef{
			ID:      "brand",
			Density: "cozy",
			Modes:   map[string]map[string]string{"dark": {"color-blurple": "#123"}},
		},
	}
	err = r.ValidatePage(page)
	if err == nil {
		t.Fatal("expected validation errors")
	}
	msg := err.Error()
	if !strings.Contains(msg, `theme.modes["dark"]["color-blurple"]`) {
		t.Errorf("expected mode overlay token error, got: %s", msg)
	}
	if !strings.Contains(msg, `theme.density "cozy"`) {
		t.Errorf("expected density error, got: %s", msg)
	}

	page.Theme = &uispec.ThemeRef{
		ID:      "brand",
		Density: uispec.DensityCompact,
		Tokens:  map[string]string{"primary": "#000"},
		Modes:   map[string]map[string]string{"dark": {"surface": "#111"}},
	}
	if err := r.ValidatePage(page); err != nil {
		t.Fatalf("valid modes/density should pass: %v", err)
	}
}
