package uispec

// NavigationSpec defines page-level navigation (menus, sidebars, breadcrumbs).
// Field names follow the implemented cross-renderer contract: "type" (e.g.
// "sidebar") and per-item "target" hrefs.
type NavigationSpec struct {
	Type       string    `json:"type,omitempty"`
	Items      []NavItem `json:"items,omitempty"`
	Breadcrumb []NavItem `json:"breadcrumb,omitempty"`
}

// NavItem is a single navigation entry.
type NavItem struct {
	ID       string    `json:"id"`
	Label    string    `json:"label"`
	Icon     string    `json:"icon,omitempty"`
	Target   string    `json:"target,omitempty"`
	Children []NavItem `json:"children,omitempty"`
	Badge    string    `json:"badge,omitempty"`
}
