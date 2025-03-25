import "./style.css";
import { render } from "./renderer";

const root = document.getElementById("app")!;

render(
  {
    type: "div",
    props: {
      id: "test",
      style: { color: "red" },
      children: [{ type: "p", props: { children: ["test"] } }],
    },
  },
  root
);
