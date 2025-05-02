import "./style.css";
import { createElement, render } from "./renderer";

const root = document.getElementById("app")!;

const element = createElement(
  "div",
  { id: "foo" },
  createElement("a", { href: "https://example.com" }, "bar"),
  createElement("input", {
    value: "test",
    onChange: (e: Event) => {
      console.log("changed", e);
    },
  })
);

render(element, root);
