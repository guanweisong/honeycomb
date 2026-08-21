/**
 * 应用用例的最小契约。
 *
 * 用例只负责协调输入、授权、事务和领域行为；传输层不得把这些职责重新实现一遍。
 */
export interface UseCase<Input, Output> {
  execute(input: Input): Output | Promise<Output>;
}

/**
 * 为同步或异步实现提供统一的函数式用例类型，便于逐步迁移现有 service。
 */
export type UseCaseHandler<Input, Output> = (
  input: Input,
) => Output | Promise<Output>;

/**
 * 将函数适配为标准应用用例，避免为了统一接口制造无职责的包装层。
 */
export function defineUseCase<Input, Output>(
  handler: UseCaseHandler<Input, Output>,
): UseCase<Input, Output> {
  return {
    execute: handler,
  };
}
