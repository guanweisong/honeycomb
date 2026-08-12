"use server";
import { revalidatePath } from "next/cache";

/**
 * 刷新指定路径的缓存。
 * 用于在数据更新后，强制 Next.js 重新验证并渲染页面。
 * @param {string} path - 要刷新的路径。
 */
export const refreshPath = async (path: string) => {
  revalidatePath(path);
};
