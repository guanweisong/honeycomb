declare module "list-to-tree-lite" {
  interface Options {
    idKey?: string;
    parentKey?: string;
  }
  function listToTree<T extends Record<string, unknown>>(
    list: T[],
    options?: Options,
  ): (T & { children?: T[] })[];
  export default listToTree;
}

declare module "@nosferatu500/react-sortable-tree";
