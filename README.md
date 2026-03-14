## React from scratch for learning purposes

References:

- <https://pomb.us/build-your-own-react/>
- <https://hackernoon.com/learn-you-some-custom-react-renderers-aed7164a4199>
- <https://github.com/codecrafters-io/build-your-own-x?tab=readme-ov-file#build-your-own-front-end-framework--library>

Live build: <https://xleepy.github.io/react-from-scratch/>

---

## What is already implemented

- `createElement` — creates virtual elements (like JSX)
- `render` — mounts the element tree to a real DOM container
- Fiber architecture — each element becomes a fiber node with `child`, `sibling`, `parent`, and `alternate` pointers
- `requestIdleCallback` scheduling — rendering is split into small units of work so the browser stays responsive
- Two-phase rendering — reconcile phase builds the fiber tree, commit phase applies DOM mutations
- DOM updates — handles styles, className, attributes, events (add/remove), text nodes

---

## What is missing and how to implement it

### Step 1 — Functional components

**The problem**

`performUnitOfWork` currently calls `createDom(fiber)` for every fiber, which calls `document.createElement(fiber.type)`. This assumes `type` is always a string like `"div"`. When a function component is used, `type` is a function — passing it to `createElement` produces garbage.

**The fix**

Split `performUnitOfWork` into two branches:

```ts
function performUnitOfWork(fiber) {
  if (fiber.type instanceof Function) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) return fiber.child;
  let next = fiber;
  while (next) {
    if (next.sibling) return next.sibling;
    next = next.parent;
  }
}
```

`updateHostComponent` is what you already do — create DOM node, reconcile children:

```ts
function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}
```

`updateFunctionComponent` calls the function to get its children. Function components produce **no DOM node of their own**:

```ts
function updateFunctionComponent(fiber) {
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}
```

---

### Step 2 — Fix commitWork for function components

**The problem**

`commitWork` does `element.parent.dom.appendChild(element.dom)`. But function component fibers have no `dom` — so walking up one level is not enough to find a real DOM parent.

**The fix**

Walk up the parent chain until a fiber with a real DOM node is found:

```ts
function commitWork(fiber) {
  if (!fiber) return;

  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
```

Deletion also needs to handle function fibers — walk down until a real DOM node is found:

```ts
function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}
```

---

### Step 3 — Understand how hooks work before implementing them

Hooks look like magic but the mechanism is simple:

1. When `updateFunctionComponent` runs, it calls e.g. `Counter(props)`.
2. Inside `Counter`, `useState(0)` is called.
3. `useState` needs to remember the previous state value across re-renders.
4. It stores that state on the **fiber** in a `hooks` array — one slot per `useState` call, in order.
5. That is why hooks cannot be called conditionally — the index would shift between renders.

Two module-level variables are needed:

```ts
let wipFiber = null; // the function component fiber currently being processed
let hookIndex = 0; // which hook slot we are on
```

---

### Step 4 — Implement useState

Update `updateFunctionComponent` to set these before calling the function:

```ts
function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];

  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}
```

Implement `useState`:

```ts
export function useState(initial) {
  // Read the old hook for this slot from the previous render
  const oldHook = wipFiber?.alternate?.hooks?.[hookIndex];

  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  };

  // Apply any setState calls that were queued during the previous render cycle
  oldHook?.queue.forEach((action) => {
    hook.state = action(hook.state);
  });

  const setState = (action) => {
    const fn = typeof action === "function" ? action : () => action;
    hook.queue.push(fn);

    // Trigger a re-render
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;

  return [hook.state, setState];
}
```

**What happens when `setState` is called:**

1. The updater function is pushed to the hook's queue.
2. A new `wipRoot` is created pointing at the current tree as its `alternate`.
3. Setting `nextUnitOfWork` wakes up the work loop and starts a re-render.
4. On the next `updateFunctionComponent` call, `oldHook.queue` is replayed to compute new state.

---

### Step 5 — Update types

`RenderNode.type` must accept a function:

```ts
type: string | ((props: any) => RenderElement);
```

Add a `hooks` field to `RenderNode`:

```ts
hooks?: Array<{ state: any; queue: Array<(s: any) => any> }>
```

Update `createElement` to accept a function as `type`:

```ts
export function createElement(type: string | Function, props?, ...children);
```

---

### Step 6 — Test it

```ts
function Counter() {
  const [count, setCount] = useState(0);
  return createElement(
    "div",
    {},
    createElement("p", {}, String(count)),
    createElement("button", { onClick: () => setCount((c) => c + 1) }, "+1"),
  );
}

render(createElement(Counter, {}), document.getElementById("root"));
```

---

## Architecture overview

```
render(element, container)
        |
        v
  [Initialize wipRoot fiber]
        |
        v
  requestIdleCallback(workLoop)
        |
        v
  workLoop --> performUnitOfWork
        |
        +-- host element:     createDom + reconcileChildren
        +-- function element: call fn, reconcileChildren (no DOM node)
        |
        v
  [Depth-first: child -> sibling -> parent.sibling]
        |
        v
  [All work done] --> commitRoot
        |
        v
  commitWork (PLACEMENT / UPDATE / DELETION)
        |
        v
  [Update currentRoot, clear wipRoot]
```

**Key concepts:**


**Key concepts:**

- **Fiber** — a unit of work. One per element. Holds DOM reference, props, effect tag, hooks, and tree pointers.
- **alternate** — each fiber points to its previous version. This is how old and new state are compared.
- **Two-phase rendering** — the render phase can be interrupted (time-sliced). The commit phase runs all at once so the DOM is never left in a partial state.
- **Hook index** — hooks are stored in an array on the fiber. Order must be stable across renders.
