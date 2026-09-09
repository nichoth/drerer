# Distribution Context

This context defines the published JavaScript artifacts and package entry
points for drerer.

## Language

**Distribution artifact**:
A JavaScript file published for a specific module format or delivery
mechanism. ESM, CommonJS, and UMD artifacts are distinct distribution
artifacts even when they expose the same API.

**Minified bundle**:
A self-contained distribution artifact whose code has been minified and whose
dependencies are included in the same file.

**Package entry point**:
A path exposed through `package.json` that selects a supported distribution
artifact for a consumer's loading mechanism.

**Worker entry**:
The separately published fill-worker artifact used to perform flood filling
outside the main drawing module.
