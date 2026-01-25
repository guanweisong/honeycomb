declare module "list-to-tree-lite" {
  interface Options {
    idKey?: string;
    parentKey?: string;
  }
  function listToTree<T extends Record<string, any>>(
    list: T[],
    options?: Options,
  ): (T & { children?: T[] })[];
  export default listToTree;
}
