package authoring_test

import (
	"strings"
	"testing"

	"github.com/plexusone/uiforge/authoring"
	"github.com/plexusone/uiforge/registry"
	"github.com/plexusone/uiforge/uispec"
)

// TestBuildDashboardValidatesAgainstRegistry builds a representative
// dashboard fluently and proves the result passes full registry validation —
// the builder's whole reason to exist.
func TestBuildDashboardValidatesAgainstRegistry(t *testing.T) {
	page, err := authoring.NewPage("sales", "Sales Dashboard").
		Profile(uispec.ProfileDashboard).
		Description("Built by the authoring package").
		Context("customerId", "cust-42").
		Grid(12, "16px").
		Theme("brand", map[string]string{"primary": "#0f766e", "radius": "0.5rem"}).
		Add(
			authoring.Component("revenue", "analytics.metric").
				At(0, 0).Span(3, 1).
				Prop("title", "Revenue").
				Bind("primary", "sales-data", "totalRevenue",
					authoring.Param("customerId", "${context.customerId}")).
				Default("primary", 0),
			authoring.Component("trend", "analytics.line-chart").
				At(0, 3).Span(9, 1).
				Prop("title", "Trend").
				Bind("primary", "sales-data", "revenueByMonth"),
			authoring.Component("note", "core.text").
				Prop("content", "Filtered").
				VisibleWhen("${state.filters.active}"),
		).
		OnEvent("trend", "click",
			authoring.SetState("trend", "filters.month", "${event.label}"),
			authoring.Refresh("revenue"),
		).
		Build()
	if err != nil {
		t.Fatal(err)
	}

	if page.APIVersion != uispec.APIVersion || page.Kind != uispec.KindPage {
		t.Errorf("apiVersion/kind not set: %+v", page)
	}
	if page.Metadata.Name != "sales" {
		t.Errorf("metadata.name should default to id, got %q", page.Metadata.Name)
	}

	r, err := registry.NewWithBuiltins()
	if err != nil {
		t.Fatal(err)
	}
	if err := r.ValidatePage(page); err != nil {
		t.Fatalf("built page should pass registry validation: %v", err)
	}
}

func TestBuildAppShellWithNavigationAndChildren(t *testing.T) {
	page, err := authoring.NewPage("record", "Customer Record").
		Profile(uispec.ProfileApplication).
		AppShell("header", "sidebar", "main").
		Navigation("sidebar",
			authoring.NavItem("overview", "Overview", "/overview"),
			authoring.NavItem("records", "Records", "",
				authoring.NavItem("accounts", "Accounts", "/accounts"),
			),
		).
		Add(
			authoring.Component("card", "core.card").
				Prop("title", "Acme Corp").
				Child(
					authoring.Component("detail", "application.record-detail").
						Prop("title", "Details").
						Bind("record", "crm", "getCustomer").
						Default("record", map[string]any{"owner": "J. Doe"}),
				),
		).
		Build()
	if err != nil {
		t.Fatal(err)
	}

	if page.Navigation == nil || page.Navigation.Items[1].Children[0].ID != "accounts" {
		t.Errorf("nested navigation not built: %+v", page.Navigation)
	}
	if len(page.Components[0].Children) != 1 {
		t.Fatalf("card should have one child")
	}

	r, _ := registry.NewWithBuiltins()
	if err := r.ValidatePage(page); err != nil {
		t.Fatalf("app-shell page should validate: %v", err)
	}
}

func TestBindStateAndStatic(t *testing.T) {
	c := authoring.Component("f", "analytics.filter").
		Prop("label", "Period").Prop("field", "period").Prop("filterType", "select").
		BindState("value", "filters.period", "monthly")
	page, err := authoring.NewPage("p", "P").Stack("vertical").Add(c).Build()
	if err != nil {
		t.Fatal(err)
	}
	b := page.Components[0].Data["value"]
	if b.Source != "state" || b.Parameters["path"] != "filters.period" || b.Default != "monthly" {
		t.Errorf("BindState wrong: %+v", b)
	}

	page2, _ := authoring.NewPage("p2", "P2").Stack("vertical").Add(
		authoring.Component("t", "analytics.table").
			BindStatic("primary", []any{map[string]any{"a": 1}}),
	).Build()
	b2 := page2.Components[0].Data["primary"]
	if b2.Source != "static" || b2.Operation != "value" {
		t.Errorf("BindStatic wrong: %+v", b2)
	}
}

func TestBuildReportsProblems(t *testing.T) {
	_, err := authoring.NewPage("", "No ID").
		Theme("brand", map[string]string{"color-blurple": "#123"}).
		Add(authoring.Component("", "")).
		Build()
	if err == nil {
		t.Fatal("expected build errors")
	}
	for _, want := range []string{
		"page id is required",
		`theme token "color-blurple"`,
		"component id is required",
		"layout is required",
	} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error should mention %q, got: %v", want, err)
		}
	}

	_, err = authoring.NewPage("p", "P").Stack("vertical").Add(
		authoring.Component("x", "core.text").Default("missing", 1),
	).Build()
	if err == nil || !strings.Contains(err.Error(), "before any binding") {
		t.Errorf("Default without binding should error, got: %v", err)
	}
}

func TestBuilderIsReusableAndIsolated(t *testing.T) {
	b := authoring.NewPage("p", "P").Stack("vertical")
	first, err := b.Build()
	if err != nil {
		t.Fatal(err)
	}
	b.Add(authoring.Component("late", "core.text").Prop("content", "x"))
	if len(first.Components) != 0 {
		t.Error("Build result should be isolated from later mutations")
	}
}
