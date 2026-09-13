package registry

// RegisterBuiltins registers all built-in component families
// (core + analytics + assistant + application).
func RegisterBuiltins(r *Registry) error {
	if err := RegisterCoreComponents(r); err != nil {
		return err
	}
	if err := RegisterAnalyticsComponents(r); err != nil {
		return err
	}
	if err := RegisterAssistantComponents(r); err != nil {
		return err
	}
	return RegisterApplicationComponents(r)
}

// NewWithBuiltins creates a registry pre-loaded with all built-in components.
func NewWithBuiltins() (*Registry, error) {
	r := New()
	if err := RegisterBuiltins(r); err != nil {
		return nil, err
	}
	return r, nil
}
