/** 分类路径只接受能独立存放在单个 URL 段中的文字、数字和安全标点。 */
export function isCategoryPathSegment(value: string) {
  return (
    /^[\p{L}\p{M}\p{N}_.-]+$/u.test(value) && value !== "." && value !== ".."
  );
}
