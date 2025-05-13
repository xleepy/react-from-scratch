import { RenderElement, RenderNode } from "./types";

export function createTextElement(text: string): RenderElement {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

const camelCaseToKebabCase = (str: string) => {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
};

function updateDom(dom: any, prevProps: any, nextProps: any) {
  const isEvent = (key: string) => key.startsWith("on");
  const isProperty = (key: string) => key !== "children" && !isEvent(key);
  const isGone = (_prev: any, next: any) => (key: string) => !(key in next);
  const isNew = (prev: any, next: any) => (key: string) =>
    prev[key] !== next[key];

  const isHTMLElement = (dom: any) => dom instanceof HTMLElement;

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      if (isHTMLElement(dom)) {
        dom.removeAttribute(name);
      } else {
        dom[name] = "";
      }
    });

  // Set new properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const nexProp = nextProps[name];
      if (!isHTMLElement(dom)) {
        dom[name] = nexProp;
        return;
      }
      if (name === "style" && typeof nexProp === "object") {
        const stringifiedStyle = Object.entries(nexProp)
          .map(([key, value]) => `${camelCaseToKebabCase(key)}: ${value}`)
          .join("; ");
        dom.setAttribute("style", stringifiedStyle);
        return;
      }
      if (name === "className") {
        dom.setAttribute("class", nexProp);
        return;
      }
      dom.setAttribute(name, nexProp);
    });

  // Remove old event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((name) => !(name in nextProps) || isNew(prevProps, nextProps)(name))
    .forEach((name) => {
      const eventName = name.toLowerCase().substring(2);
      dom.removeEventListener(eventName, prevProps[name]);
    });

  // Add new event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter((name) => !(name in prevProps) || isNew(prevProps, nextProps)(name))
    .forEach((name) => {
      const eventName = name.toLowerCase().substring(2);
      dom.addEventListener(eventName, nextProps[name]);
    });
}

export function createElement<Props = []>(
  type: string,
  props?: Props,
  ...children: (RenderElement | string)[]
): RenderElement {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createDom(element: any) {
  const dom =
    element.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);

  updateDom(dom, {}, element.props);

  return dom;
}

let nextUnitOfWork: any | null = null;
let wipRoot: any | null = null;
let currentRoot: any | null = null;
let deletions: any[] = [];

export function render(element: RenderElement, container: HTMLElement | Text) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

function commitWork(element: any) {
  console.log("commit work", element);
  if (!element) {
    return;
  }
  const domParent = element.parent?.dom ?? null;
  if (element.effectTag === "PLACEMENT" && element.dom) {
    domParent?.appendChild(element.dom);
  } else if (element.effectTag === "UPDATE" && element.dom) {
    updateDom(element.dom, element.alternate.props, element.props);
  } else if (element.effectTag === "DELETION" && element.dom) {
    domParent?.removeChild(element.dom);
  }
  commitWork(element.child);
  commitWork(element.sibling);
}

function commitRoot() {
  // add nodes to dom
  console.log("commit root", wipRoot);
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function workLoop(deadline: IdleDeadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork) ?? null;
    if (nextUnitOfWork) {
      shouldYield = deadline.timeRemaining() < 1;
    }
  }
  if (!nextUnitOfWork && wipRoot) {
    console.log("commit root");
    commitRoot();
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function reconcileChildren(currentElement: RenderNode, elements: RenderNode[]) {
  let index = 0;
  let oldFiber = currentElement.alternate && currentElement.alternate.child;
  let prevSibling: any = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber: RenderNode | null = null;

    const sameType = oldFiber && element && element.type == oldFiber.type;

    if (sameType) {
      newFiber = {
        alternate: oldFiber?.alternate ?? null,
        sibling: oldFiber?.sibling ?? null,
        child: oldFiber?.child ?? null,
        dom: oldFiber?.dom ?? null,
        type: element.type,
        props: element.props,
        parent: currentElement,
        effectTag: "UPDATE",
      };
    }
    if (element && !sameType) {
      newFiber = {
        dom: null,
        child: null,
        sibling: null,
        type: element.type,
        props: element.props,
        parent: currentElement,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber?.sibling) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      currentElement.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

function performUnitOfWork(element: any) {
  if (!element.dom) {
    element.dom = createDom(element);
  }

  const elements = element.props.children;
  reconcileChildren(element, elements);

  if (element.child) {
    return element.child;
  }
  let nextElementSibling = element;
  while (nextElementSibling) {
    if (nextElementSibling.sibling) {
      return nextElementSibling.sibling;
    }
    nextElementSibling = nextElementSibling.parent;
  }
}
