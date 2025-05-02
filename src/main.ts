import "./style.css";
import { createElement, render } from "./renderer";

const root = document.getElementById("app")!;

const element = createElement(
  "div",
  { id: "foo" },
  createElement("a", null, "bar"),
  createElement("b", null, "baz")
);

render(element, root);
