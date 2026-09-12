import { ModalType } from "./modal-type";

export type AdminDialogState<Record> = {
  type?: ModalType;
  open: boolean;
  record?: Record;
};

export function createInitialAdminDialogState<Record>(): AdminDialogState<Record> {
  return { type: ModalType.ADD, open: false };
}

export function openAddAdminDialog<Record>(): AdminDialogState<Record> {
  return { type: ModalType.ADD, open: true, record: undefined };
}

export function openEditAdminDialog<Record>(
  record: Record,
): AdminDialogState<Record> {
  return { type: ModalType.EDIT, open: true, record };
}

export function closeAdminDialog<Record>(): AdminDialogState<Record> {
  return { open: false };
}

export type AdminMutationState = "success" | "error" | "noop";
export type AdminTargetMutationState = AdminMutationState | "missing-target";

export type AdminMutationFeedback = {
  refetch: () => unknown;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
};

export type AdminListActionOptions<Record> = {
  selectedRows: Record[];
  onSelectionChange: (rows: Record[]) => void;
  refetch: () => unknown;
};

interface RunAdminMutationOptions<Input, Result>
  extends AdminMutationFeedback {
  input: Input;
  mutate: (input: Input) => Promise<Result>;
  isSuccess?: (result: Result) => boolean;
  successMessage: string;
  errorMessage: string;
}

/** Ensures an update targets the selected record, never a submitted id. */
export function withAdminRecordId<
  Record extends { id: string },
  Values extends object,
>(record: Record, values: Values): Values & { id: string } {
  return { ...values, id: record.id };
}

export async function runAdminMutation<Input, Result>({
  input,
  mutate,
  isSuccess,
  refetch,
  notifySuccess,
  notifyError,
  successMessage,
  errorMessage,
}: RunAdminMutationOptions<Input, Result>): Promise<AdminMutationState> {
  try {
    const result = await mutate(input);
    if (isSuccess && !isSuccess(result)) return "noop";
    refetch();
    notifySuccess(successMessage);
    return "success";
  } catch {
    notifyError(errorMessage);
    return "error";
  }
}

interface SubmitAdminBatchDeleteOptions<Selection> {
  selectedRows: readonly { id: string }[];
  deleteItems: (ids: string[]) => Promise<unknown>;
  onSelectionChange: (rows: Selection[]) => void;
}

export async function submitAdminBatchDelete<Selection>({
  selectedRows,
  deleteItems,
  onSelectionChange,
}: SubmitAdminBatchDeleteOptions<Selection>): Promise<void> {
  await deleteItems(selectedRows.map((row) => row.id));
  onSelectionChange([]);
}
