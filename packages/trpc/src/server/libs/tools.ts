class Tools {
  /**
   * 根据controller的queries参数拼接prisma的查询条件
   * @param {*} queries controller的参数
   * @param {*} queryArray 允许查询的参数名数组
   * @param {*} multiLangQueries controller的多语言参数
   * @return {*} conditions 拼接完成prisma的查询条件
   */
  static getFindConditionsByQueries(
    queries: any,
    queryArray: string[],
    multiLangQueries?: any,
  ) {
    const conditions = {} as any;
    for (const item in queries) {
      if (typeof queries[item] !== "undefined") {
        const isEmptyArray =
          Array.isArray(queries[item]) && queries[item].length === 0;
        if (
          queryArray.includes(item) &&
          queries[item] !== "" &&
          !isEmptyArray
        ) {
          conditions[item] = { in: queries[item] };
        } else if (
          !queryArray.includes(item) &&
          queries[item] !== "" &&
          !isEmptyArray
        ) {
          conditions[item] = { contains: queries[item] };
        }
      }
    }

    for (const item in multiLangQueries) {
      if (typeof multiLangQueries[item] !== "undefined") {
        const value = multiLangQueries[item];
        conditions["OR"] = [
          { [item]: { is: { zh: value } } },
          { [item]: { is: { en: value } } },
        ];
      }
    }

    console.log("conditions", conditions);
    return conditions;
  }

  /**
   * 子孙树，获取某个ID下的分类
   */
  static sonsTree(arr: any, id: string) {
    const temp: any[] = [];
    let lev = 0;
    const forFn = (arr: any, id: string, lev: number) => {
      for (const value of arr) {
        if (
          (value.parent === null && id === undefined) ||
          value.parent?.toString() === id
        ) {
          value.deepPath = lev;
          temp.push(value);
          forFn(arr, value.id, lev + 1);
        }
      }
    };
    forFn(arr, id, lev);
    return temp;
  }
}

export default Tools;
