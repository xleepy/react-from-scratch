export type PropsWithChildren = {
  [key: string]: any;
  className?: string;
  style?: { [key: string]: string | number };
  children?: (RenderElement | string)[];
};

export type RenderElement = {
  type?: string;
  props?: PropsWithChildren;
};

export type EffectTag = "UPDATE" | "PLACEMENT" | "DELETION";

export type RenderNode = {
  type: string;
  child: RenderNode | null;
  dom: HTMLElement | null;
  sibling: RenderNode | null;
  parent: RenderNode | null;
  alternate: RenderNode | null;
  effectTag: EffectTag;
  props: PropsWithChildren;
};
