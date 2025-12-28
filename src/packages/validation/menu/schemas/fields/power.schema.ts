import { z } from "zod";

/**
 * 菜单项的权重（power）字段验证 schema。
 * 'power' 通常用于菜单项的排序，值越大，排序越靠前。
 * 此 schema 确保权重值是一个整数。
 */
export const PowerSchema = z.number().int();
