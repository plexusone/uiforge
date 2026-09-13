package registry

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ParseManifest decodes a ComponentSpec manifest from JSON.
func ParseManifest(data []byte) (*ComponentSpec, error) {
	var spec ComponentSpec
	if err := json.Unmarshal(data, &spec); err != nil {
		return nil, fmt.Errorf("parse manifest: %w", err)
	}
	return &spec, nil
}

// LoadManifest parses a JSON manifest and registers it.
func (r *Registry) LoadManifest(data []byte) error {
	spec, err := ParseManifest(data)
	if err != nil {
		return err
	}
	return r.Register(spec)
}

// LoadManifestFile reads a JSON manifest from a file and registers it.
func (r *Registry) LoadManifestFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read manifest %s: %w", path, err)
	}
	if err := r.LoadManifest(data); err != nil {
		return fmt.Errorf("manifest %s: %w", path, err)
	}
	return nil
}

// LoadManifestDir registers every *.json manifest in a directory
// (non-recursive). Returns the number of manifests loaded.
func (r *Registry) LoadManifestDir(dir string) (int, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return 0, fmt.Errorf("read manifest dir %s: %w", dir, err)
	}
	loaded := 0
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		if err := r.LoadManifestFile(filepath.Join(dir, entry.Name())); err != nil {
			return loaded, err
		}
		loaded++
	}
	return loaded, nil
}

// CheckVersionCompat reports whether a registered component version satisfies
// a version requested by a page. Supported request forms:
//
//	""       any version (no constraint)
//	"1"      same major (1.x.x)
//	"1.2"    same major.minor (1.2.x)
//	"1.2.3"  exact
//	"^1.2"   same major, and registered >= requested
//	"^1.2.3" same major, and registered >= requested
func CheckVersionCompat(requested, registered string) error {
	if requested == "" {
		return nil
	}

	caret := strings.HasPrefix(requested, "^")
	req := strings.TrimPrefix(requested, "^")

	reqParts, err := parseVersion(req)
	if err != nil {
		return fmt.Errorf("requested version %q: %w", requested, err)
	}
	regParts, err := parseVersion(registered)
	if err != nil {
		return fmt.Errorf("registered version %q: %w", registered, err)
	}

	if caret {
		if regParts[0] != reqParts[0] {
			return fmt.Errorf("version %s does not satisfy %s (major version differs)", registered, requested)
		}
		if compareVersions(regParts, reqParts) < 0 {
			return fmt.Errorf("version %s does not satisfy %s (older than requested)", registered, requested)
		}
		return nil
	}

	// Exact request: registered must match every specified segment.
	segments := len(strings.Split(req, "."))
	for i := 0; i < segments && i < 3; i++ {
		if regParts[i] != reqParts[i] {
			return fmt.Errorf("version %s does not satisfy %s", registered, requested)
		}
	}
	return nil
}

// parseVersion parses up to three dotted numeric segments; missing segments
// are zero.
func parseVersion(v string) ([3]int, error) {
	var parts [3]int
	if v == "" {
		return parts, fmt.Errorf("empty version")
	}
	segments := strings.Split(v, ".")
	if len(segments) > 3 {
		return parts, fmt.Errorf("too many segments")
	}
	for i, seg := range segments {
		var n int
		if _, err := fmt.Sscanf(seg, "%d", &n); err != nil || fmt.Sprintf("%d", n) != seg {
			return parts, fmt.Errorf("segment %q is not numeric", seg)
		}
		parts[i] = n
	}
	return parts, nil
}

func compareVersions(a, b [3]int) int {
	for i := range 3 {
		if a[i] != b[i] {
			if a[i] < b[i] {
				return -1
			}
			return 1
		}
	}
	return 0
}
