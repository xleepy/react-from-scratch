export type Element = {
  type: string;
  props: {
    [key: string]: any;
    children?: (Element | string)[];
  };
};

export function render(element: Element, parentDom: HTMLElement | Text) {
  const { type, props = {} } = element;

  // Create DOM element
  const isTextElement = type === "TEXT ELEMENT";
  const dom = isTextElement
    ? document.createTextNode("")
    : document.createElement(type);

  // Add event listeners
  const isListener = (name: string) => name.startsWith("on");
  Object.keys(props)
    .filter(isListener)
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, props[name]);
    });

  // Set properties
  const isAttribute = (name: string) => !isListener(name) && name != "children";
  Object.keys(props)
    .filter(isAttribute)
    .forEach((name) => {
      console.log("here", name, props[name]);
      if (dom instanceof HTMLElement) {
        const isStyle = name === "style";
        let attributeValue = props[name];
        if (isStyle && typeof props === "object") {
          attributeValue = Object.entries(props[name])
            .map(([key, value]) => `${key}: ${value}`)
            .join("; ");
        }
        console.log("attributeValue", attributeValue);
        dom.setAttribute(name, attributeValue);
      }
    });

  // Render children
  const childElements = props.children || [];
  childElements.forEach((childElement) => {
    if (typeof childElement === "string") {
      dom.appendChild(document.createTextNode(childElement));
    } else {
      render(childElement, dom);
    }
  });

  // Append to parent
  parentDom.appendChild(dom);
}
