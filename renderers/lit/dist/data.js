// resolveBinding resolves one data binding. Supported sources:
//
//   static  — parameters.value is returned as-is
//   state   — parameters.path is read from the page state store
//
// Any other source is treated as external (host-supplied); the binding's
// `default` is returned until a data runtime provides the value.
export function resolveBinding(binding, ctx) {
    switch (binding.source) {
        case 'static':
            return binding.parameters?.value ?? binding.default;
        case 'state': {
            const path = binding.parameters?.path;
            if (typeof path === 'string') {
                const value = ctx.state.get(path);
                return value === undefined ? binding.default : value;
            }
            return binding.default;
        }
        default:
            return binding.default;
    }
}
// resolveData resolves every binding declared on a component instance.
export function resolveData(instance, ctx) {
    const result = {};
    for (const [name, binding] of Object.entries(instance.data ?? {})) {
        result[name] = resolveBinding(binding, ctx);
    }
    return result;
}
//# sourceMappingURL=data.js.map