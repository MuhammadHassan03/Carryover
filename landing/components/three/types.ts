import type * as THREE from "three";

export type View = {
  el: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  fit?: (aspect: number) => void;
};

export type ChapterMod = {
  view?: View;
  /** Called every frame while the chapter is near the viewport. Return true to keep rendering. */
  update?: (p: number, dt: number, t: number) => boolean | void;
};

export type GLHandle = {
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  render: (views: View[]) => void;
  resize: () => void;
  dispose: () => void;
};

export type Api = {
  reduced: () => boolean;
  wide: () => boolean;
  getGL: () => Promise<GLHandle | null>;
  kick: () => void;
};

export type Chapter = {
  key: string;
  sec: HTMLElement;
  stage: HTMLElement | null;
  p: number;
  target: number;
  near: boolean;
  mod: ChapterMod | null;
  loading: boolean;
  free?: boolean;
};

export type ChapterInit = (api: Api, ch: Chapter) => Promise<ChapterMod> | ChapterMod;
