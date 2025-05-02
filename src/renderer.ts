export type Element = {
  type: string;
  props: {
    [key: string]: any;
    children?: (Element | string)[];
  };
};

export function createTextElement(text: string): Element {
  return {
    type: "TEXT ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

export function createElement<Props = []>(
  type: string,
  props?: Props,
  ...children: (Element | string)[]
): Element {
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

export function render(element: Element, container: HTMLElement | Text) {
  const dom =
    element.type === "TEXT ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);
  container.appendChild(dom);

  const isProperty = (key: string) => key !== "children";
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      (dom as any)[name] = element.props[name];
    });

  element.props.children?.forEach((child: Element | string) => {
    if (typeof child === "object") {
      render(child, dom);
    } else {
      dom.textContent = child;
    }
  });

  container.appendChild(dom);
}

// let nextUnitOfWork = null;

// function workLoop(deadline) {
//   let shouldYield = false;
//   while (nextUnitOfWork && !shouldYield) {
//     nextUnitOfWork = performUnitOfWork();
//     if (nextUnitOfWork) {
//       shouldYield = deadline.timeRemaining() < 1;
//     }
//   }
//   requestIdleCallback(workLoop);
// }

function performUnitOfWork() {
  // 1. Get the next unit of work
  // 2. If there is no unit of work, return
  // 3. If there is a unit of work, perform the work
  // 4. If the work is done, mark the unit of work as completed
  // 5. If there are more units of work, perform the next unit of work
}
