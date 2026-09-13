// Package authoring provides fluent builders for constructing UISpec
// PageSpecs programmatically — for server-side page generation, tests, and
// AI tooling that emits specs rather than framework code. Builders produce
// plain uispec values; validate the result against a registry before
// shipping it:
//
//	page, err := authoring.NewPage("sales", "Sales Dashboard").
//		Profile(uispec.ProfileDashboard).
//		Grid(12, "16px").
//		Add(authoring.Component("revenue", "analytics.metric").
//			Span(3, 1).
//			Prop("title", "Revenue").
//			Bind("primary", "sales-data", "totalRevenue")).
//		Build()
//	if err == nil {
//		err = reg.ValidatePage(page)
//	}
package authoring

import (
	"fmt"

	"github.com/plexusone/uiforge/uispec"
)

// PageBuilder accumulates a PageSpec.
type PageBuilder struct {
	page uispec.PageSpec
	errs []string
}

// NewPage starts a page. The id doubles as metadata.name; apiVersion and
// kind are set automatically.
func NewPage(id, title string) *PageBuilder {
	b := &PageBuilder{
		page: uispec.PageSpec{
			APIVersion: uispec.APIVersion,
			Kind:       uispec.KindPage,
			Metadata:   uispec.PageMetadata{ID: id, Name: id, Title: title},
		},
	}
	if id == "" {
		b.errs = append(b.errs, "page id is required")
	}
	return b
}

// Profile sets the experience profile.
func (b *PageBuilder) Profile(profile string) *PageBuilder {
	b.page.Profile = profile
	return b
}

// Description sets metadata.description.
func (b *PageBuilder) Description(d string) *PageBuilder {
	b.page.Metadata.Description = d
	return b
}

// Context adds one page context entry.
func (b *PageBuilder) Context(key, value string) *PageBuilder {
	if b.page.Context == nil {
		b.page.Context = map[string]string{}
	}
	b.page.Context[key] = value
	return b
}

// Grid sets a responsive-grid layout.
func (b *PageBuilder) Grid(columns int, gap string) *PageBuilder {
	b.page.Layout = uispec.LayoutSpec{
		Type:   uispec.LayoutResponsiveGrid,
		Config: &uispec.LayoutConfig{Columns: columns, Gap: gap},
	}
	return b
}

// Stack sets a stack layout. Direction is "vertical" or "horizontal".
func (b *PageBuilder) Stack(direction string) *PageBuilder {
	b.page.Layout = uispec.LayoutSpec{
		Type:   uispec.LayoutStack,
		Config: &uispec.LayoutConfig{Direction: direction},
	}
	return b
}

// Layout sets an arbitrary layout for shapes the shortcuts don't cover
// (split-pane, tabs, application-shell, nested regions).
func (b *PageBuilder) Layout(layout uispec.LayoutSpec) *PageBuilder {
	b.page.Layout = layout
	return b
}

// AppShell sets an application-shell layout with the named regions.
func (b *PageBuilder) AppShell(regions ...string) *PageBuilder {
	spec := uispec.LayoutSpec{Type: uispec.LayoutApplicationShell}
	for _, name := range regions {
		spec.Regions = append(spec.Regions, uispec.LayoutRegion{Name: name})
	}
	b.page.Layout = spec
	return b
}

// Theme sets the page theme. Token keys must come from the design-token
// contract (uispec.ValidThemeTokenKeys); Build reports violations.
func (b *PageBuilder) Theme(id string, tokens map[string]string) *PageBuilder {
	for key := range tokens {
		if !uispec.IsValidThemeToken(key) {
			b.errs = append(b.errs, fmt.Sprintf("theme token %q is not in the design-token contract", key))
		}
	}
	b.page.Theme = &uispec.ThemeRef{ID: id, Tokens: tokens}
	return b
}

// Navigation sets the page navigation.
func (b *PageBuilder) Navigation(navType string, items ...uispec.NavItem) *PageBuilder {
	b.page.Navigation = &uispec.NavigationSpec{Type: navType, Items: items}
	return b
}

// NavItem is a convenience constructor for navigation entries.
func NavItem(id, label, target string, children ...uispec.NavItem) uispec.NavItem {
	return uispec.NavItem{ID: id, Label: label, Target: target, Children: children}
}

// Add appends components to the page.
func (b *PageBuilder) Add(components ...*ComponentBuilder) *PageBuilder {
	for _, c := range components {
		b.page.Components = append(b.page.Components, c.instance)
		b.errs = append(b.errs, c.errs...)
	}
	return b
}

// OnEvent appends an interaction rule: when the component emits the event,
// run the actions in order.
func (b *PageBuilder) OnEvent(componentID, event string, actions ...uispec.InteractionAction) *PageBuilder {
	b.page.Interactions = append(b.page.Interactions, uispec.Interaction{
		When: uispec.InteractionTrigger{Component: componentID, Event: event},
		Then: actions,
	})
	return b
}

// SetState is the state.set interaction action.
func SetState(target, path string, value any) uispec.InteractionAction {
	return uispec.InteractionAction{
		Target: target,
		Action: "state.set",
		Params: map[string]any{"path": path, "value": value},
	}
}

// ToggleState is the state.toggle interaction action.
func ToggleState(target, path string) uispec.InteractionAction {
	return uispec.InteractionAction{
		Target: target,
		Action: "state.toggle",
		Params: map[string]any{"path": path},
	}
}

// Refresh is the component.refresh interaction action: it invalidates the
// target's data cache so its bindings re-fetch.
func Refresh(target string) uispec.InteractionAction {
	return uispec.InteractionAction{Target: target, Action: "component.refresh"}
}

// Build finalizes the page, returning an error listing every problem the
// builder itself detected. Registry validation (properties, data inputs,
// profiles, capabilities) is a separate step: registry.ValidatePage.
func (b *PageBuilder) Build() (*uispec.PageSpec, error) {
	if b.page.Layout.Type == "" {
		b.errs = append(b.errs, "a layout is required (Grid, Stack, AppShell, or Layout)")
	}
	if len(b.errs) > 0 {
		return nil, fmt.Errorf("authoring: %d problem(s): %v", len(b.errs), b.errs)
	}
	page := b.page
	return &page, nil
}

// ComponentBuilder accumulates a ComponentInstance.
type ComponentBuilder struct {
	instance uispec.ComponentInstance
	errs     []string
}

// Component starts a component instance of the given registered type.
func Component(id, componentType string) *ComponentBuilder {
	c := &ComponentBuilder{
		instance: uispec.ComponentInstance{ID: id, Type: componentType},
	}
	if id == "" {
		c.errs = append(c.errs, "component id is required")
	}
	if componentType == "" {
		c.errs = append(c.errs, fmt.Sprintf("component %q: type is required", id))
	}
	return c
}

// Version pins a compatible component version ("1", "1.2", "1.2.3", "^1.2").
func (c *ComponentBuilder) Version(v string) *ComponentBuilder {
	c.instance.Version = v
	return c
}

// At places the component at a grid position.
func (c *ComponentBuilder) At(row, col int) *ComponentBuilder {
	c.position().Row = row
	c.position().Col = col
	return c
}

// Span sets the component's grid span.
func (c *ComponentBuilder) Span(colSpan, rowSpan int) *ComponentBuilder {
	c.position().ColSpan = colSpan
	c.position().RowSpan = rowSpan
	return c
}

func (c *ComponentBuilder) position() *uispec.Position {
	if c.instance.Position == nil {
		c.instance.Position = &uispec.Position{}
	}
	return c.instance.Position
}

// Prop sets one property.
func (c *ComponentBuilder) Prop(key string, value any) *ComponentBuilder {
	if c.instance.Properties == nil {
		c.instance.Properties = map[string]any{}
	}
	c.instance.Properties[key] = value
	return c
}

// Bind attaches a data binding to a named input. Optional Param values
// attach binding parameters.
func (c *ComponentBuilder) Bind(input, source, operation string, params ...BindingParam) *ComponentBuilder {
	binding := uispec.Binding{Source: source, Operation: operation}
	for _, p := range params {
		if binding.Parameters == nil {
			binding.Parameters = map[string]any{}
		}
		binding.Parameters[p.Key] = p.Value
	}
	return c.setBinding(input, binding)
}

// BindState binds an input to a page-state path with a default value.
func (c *ComponentBuilder) BindState(input, path string, defaultValue any) *ComponentBuilder {
	return c.setBinding(input, uispec.Binding{
		Source:     "state",
		Operation:  "get",
		Parameters: map[string]any{"path": path},
		Default:    defaultValue,
	})
}

// BindStatic binds an input to an inline literal value.
func (c *ComponentBuilder) BindStatic(input string, value any) *ComponentBuilder {
	return c.setBinding(input, uispec.Binding{
		Source:     "static",
		Operation:  "value",
		Parameters: map[string]any{"value": value},
	})
}

// Default sets the fallback value on an existing binding.
func (c *ComponentBuilder) Default(input string, value any) *ComponentBuilder {
	binding, ok := c.instance.Data[input]
	if !ok {
		c.errs = append(c.errs, fmt.Sprintf("component %q: Default(%q) before any binding for that input", c.instance.ID, input))
		return c
	}
	binding.Default = value
	c.instance.Data[input] = binding
	return c
}

func (c *ComponentBuilder) setBinding(input string, binding uispec.Binding) *ComponentBuilder {
	if c.instance.Data == nil {
		c.instance.Data = map[string]uispec.Binding{}
	}
	c.instance.Data[input] = binding
	return c
}

// BindingParam is a named binding parameter; values may be ${...} expressions.
type BindingParam struct {
	Key   string
	Value any
}

// Param constructs a BindingParam.
func Param(key string, value any) BindingParam {
	return BindingParam{Key: key, Value: value}
}

// VisibleWhen sets a visibility condition ("false" or a ${...} expression).
func (c *ComponentBuilder) VisibleWhen(condition string) *ComponentBuilder {
	c.instance.Visibility = &uispec.VisibilityRule{Condition: condition}
	return c
}

// Child appends child components (for containers like core.card or
// application.form).
func (c *ComponentBuilder) Child(children ...*ComponentBuilder) *ComponentBuilder {
	for _, child := range children {
		c.instance.Children = append(c.instance.Children, child.instance)
		c.errs = append(c.errs, child.errs...)
	}
	return c
}
