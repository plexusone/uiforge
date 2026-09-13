// Fluent builders for constructing PageSpecs programmatically — the
// TypeScript counterpart of the Go authoring package (same method names,
// same semantics). Builders produce plain PageSpec values; validate against
// the Go registry (or the generated JSON Schemas) before shipping.
import { API_VERSION, KIND_PAGE, } from './types.js';
export class AuthoringError extends Error {
    problems;
    constructor(problems) {
        super(`authoring: ${problems.length} problem(s): ${problems.join('; ')}`);
        this.problems = problems;
        this.name = 'AuthoringError';
    }
}
export function newPage(id, title) {
    return new PageBuilder(id, title);
}
export class PageBuilder {
    page;
    errs = [];
    constructor(id, title) {
        this.page = {
            apiVersion: API_VERSION,
            kind: KIND_PAGE,
            metadata: { id, name: id, title },
            layout: { type: 'stack' },
            components: [],
        };
        this.pageLayoutSet = false;
        if (!id)
            this.errs.push('page id is required');
    }
    pageLayoutSet;
    profile(profile) {
        this.page.profile = profile;
        return this;
    }
    description(d) {
        this.page.metadata.description = d;
        return this;
    }
    context(key, value) {
        this.page.context = { ...(this.page.context ?? {}), [key]: value };
        return this;
    }
    grid(columns, gap) {
        this.page.layout = { type: 'responsive-grid', config: { columns, gap } };
        this.pageLayoutSet = true;
        return this;
    }
    stack(direction = 'vertical') {
        this.page.layout = { type: 'stack', config: { direction } };
        this.pageLayoutSet = true;
        return this;
    }
    appShell(...regions) {
        this.page.layout = {
            type: 'application-shell',
            regions: regions.map((name) => ({ name })),
        };
        this.pageLayoutSet = true;
        return this;
    }
    layout(layout) {
        this.page.layout = layout;
        this.pageLayoutSet = true;
        return this;
    }
    theme(id, tokens) {
        this.page.theme = { id, tokens };
        return this;
    }
    navigation(navType, ...items) {
        this.page.navigation = { type: navType, items };
        return this;
    }
    add(...components) {
        for (const c of components) {
            this.page.components.push(c.instance);
            this.errs.push(...c.errs);
        }
        return this;
    }
    onEvent(componentId, event, ...actions) {
        const interaction = {
            when: { component: componentId, event },
            then: actions,
        };
        this.page.interactions = [...(this.page.interactions ?? []), interaction];
        return this;
    }
    build() {
        const errs = [...this.errs];
        if (!this.pageLayoutSet) {
            errs.push('a layout is required (grid, stack, appShell, or layout)');
        }
        if (errs.length > 0) {
            throw new AuthoringError(errs);
        }
        return structuredClone(this.page);
    }
}
export function navItem(id, label, target, ...children) {
    const item = { id, label };
    if (target)
        item.target = target;
    if (children.length > 0)
        item.children = children;
    return item;
}
export function component(id, componentType) {
    return new ComponentBuilder(id, componentType);
}
export class ComponentBuilder {
    instance;
    errs = [];
    constructor(id, componentType) {
        this.instance = { id, type: componentType };
        if (!id)
            this.errs.push('component id is required');
        if (!componentType)
            this.errs.push(`component "${id}": type is required`);
    }
    version(v) {
        this.instance.version = v;
        return this;
    }
    at(row, col) {
        this.instance.position = { ...(this.instance.position ?? {}), row, col };
        return this;
    }
    span(colSpan, rowSpan) {
        this.instance.position = { ...(this.instance.position ?? {}), colSpan, rowSpan };
        return this;
    }
    prop(key, value) {
        this.instance.properties = { ...(this.instance.properties ?? {}), [key]: value };
        return this;
    }
    bind(input, source, operation, parameters) {
        const binding = { source, operation };
        if (parameters)
            binding.parameters = parameters;
        return this.setBinding(input, binding);
    }
    bindState(input, path, defaultValue) {
        return this.setBinding(input, {
            source: 'state',
            operation: 'get',
            parameters: { path },
            default: defaultValue,
        });
    }
    bindStatic(input, value) {
        return this.setBinding(input, {
            source: 'static',
            operation: 'value',
            parameters: { value },
        });
    }
    default(input, value) {
        const binding = this.instance.data?.[input];
        if (!binding) {
            this.errs.push(`component "${this.instance.id}": default("${input}") before any binding for that input`);
            return this;
        }
        binding.default = value;
        return this;
    }
    setBinding(input, binding) {
        this.instance.data = { ...(this.instance.data ?? {}), [input]: binding };
        return this;
    }
    visibleWhen(condition) {
        this.instance.visibility = { condition };
        return this;
    }
    child(...children) {
        for (const c of children) {
            this.instance.children = [...(this.instance.children ?? []), c.instance];
            this.errs.push(...c.errs);
        }
        return this;
    }
}
// Interaction action constructors (mirror of the Go helpers).
export function setState(target, path, value) {
    return { target, action: 'state.set', params: { path, value } };
}
export function toggleState(target, path) {
    return { target, action: 'state.toggle', params: { path } };
}
export function refresh(target) {
    return { target, action: 'component.refresh' };
}
//# sourceMappingURL=authoring.js.map