---
name: add-instance-method
description: >
  Add a new public method to SDKInstance that proxies a call into the DocSpace
  iframe via postMessage. Use when exposing a new SDK method like getFiles,
  createRoom, or navigateSection.
---

# Add an SDKInstance method

SDKInstance methods are thin transport wrappers: they post a `TTask` into the iframe
and resolve on the matching `onMethodReturn` message. The actual logic lives in the
DocSpace client — the SDK only carries the call.

## 1. Enum entry — `src/enums/index.ts` → `InstanceMethods`

- `const enum`, marked `@internal` — the entry never appears in generated docs.
- Value = the method name expected by the DocSpace client side.
- JSDoc line in the established format:
  `` /** Calls `SDKInstance.methodName(args)`. */ ``
- Insert alphabetically (some late additions drifted to the end — don't add to the
  drift).

## 2. Public method — `src/instance/index.ts`

- Thin wrapper:
  `return this.#getMethodPromise(InstanceMethods.X, { ...params });`
  Omit the second argument entirely for parameterless methods (see `logout`).
- **Never put `undefined` into the payload.** Optional parameters use the spread
  guard pattern from `login`:
  ```typescript
  ...(session !== undefined && { session }),
  ```
- Mode-specific methods start with a guard (pattern from `upload` /
  `navigateSection` / `setCustomActions`):
  ```typescript
  throw new SDKError(SDKErrorCode.ModeMismatch, "x is only available in Y mode");
  ```
  `SDKError` / `SDKErrorCode` come from `src/errors`.
- Typed return: reuse a type from `src/types` (`TFilesResponse`, `TUserInfo`, …) or
  add a new `T`-prefixed one (with full JSDoc, see the add-config-option / docs-style
  skills for conventions).
- Error semantics: some legacy methods (`login`, `createRoom`) **resolve** with a
  payload containing `status !== 200` instead of rejecting — integrations must check
  it manually. **New methods must reject via `SDKError`.** If a method inherits the
  legacy resolve-with-status semantics, state that explicitly in `@returns`.
- JSDoc is mandatory: description, `@param` for each param, `@returns`, and **two**
  `@example` blocks — one simple call, one composing with another method via
  `{@link SDKInstance.other}` (see `login`/`logout` for the exact shape).

## 3. Protocol check

The SDK is transport only. Confirm the DocSpace client actually implements the
method (handles the name and replies with `onMethodReturn`) — otherwise every call
ends in a 30 s `TIMEOUT`. Record the minimum required DocSpace version in the PR
description.

## 4. Tests — `tests/instance.test.ts`

Follow the existing suite idioms (`makeConfig`, `setupTarget`, jsdom, no real
iframe). Cover:

- the call posts a correct `TTask`: `{ type: "method", methodName, data }`;
- the promise resolves on a simulated `onMethodReturn` message;
- the promise rejects with `SDKErrorCode.Timeout` when no reply arrives
  (`methodTimeout`, default 30 000 ms — use fake timers);
- the mode guard throws `SDKErrorCode.ModeMismatch` (separate case, if applicable).

## 5. Docs

`pnpm run docs`. The method must appear on the `SDKInstance` page; the
`InstanceMethods` entry must not (it is `@internal`).

Any new source file starts with the standard header: copyright Ascensio System SIA +
Apache 2.0 + `@license`, then `@module` / `@mergeModuleWith <project>`.

## Verify

```bash
pnpm lint
npx vitest run tests/instance.test.ts
pnpm test
pnpm run docs
```

## Definition of Done

- [ ] Lint and tests green.
- [ ] Enum entry is `@internal`, alphabetically placed, value matches the DocSpace
      client method name.
- [ ] Payload never contains `undefined` fields.
- [ ] Errors reject via `SDKError` (or legacy status-semantics documented in
      `@returns`).
- [ ] Timeout path and mode guard (if any) covered by tests.
- [ ] Method visible in TypeDoc with two `@example` blocks.
- [ ] After merge: assess impact on `@onlyoffice/docspace-react` (bundles its own
      SDK copy) and the public `docspace-sdk` skill (`methods.md`,
      `config-reference.md`); note the minimum portal/DocSpace version.
