package uispec

// CapabilitySpec declares permissions a component requires.
type CapabilitySpec struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Required    bool   `json:"required,omitempty"`
}

// Well-known capability names. Capabilities are open-vocabulary strings —
// hosts may define their own — but these are the ones UIForge's own
// machinery understands: the renderers' data runtime refuses connector
// fetches without CapabilityDataRead when a grant set is in force, and
// state-writing form controls check CapabilityStateWrite.
const (
	CapabilityDataRead   = "data.read"
	CapabilityStateWrite = "state.write"
)
