import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 一个用于合并 Tailwind CSS 类名的工具函数。
 * 结合了 `clsx` 和 `tailwind-merge`，能够智能地合并多个类名字符串，
 * 解决 Tailwind CSS 中类名冲突的问题，并提供更好的开发体验。
 * @param {...ClassValue[]} inputs - 任意数量的类名字符串、数组或对象。
 * @returns {string} 合并后的、无冲突的类名字符串。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
