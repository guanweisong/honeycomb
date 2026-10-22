import { EnableStatus } from "@/lib/validation/enable-status";
import { EnableStatusName } from "../types/enable-status-name";

export const enableStatusOptions = [
  {
    label: EnableStatusName.ENABLE,
    value: EnableStatus.ENABLE,
  },
  {
    label: EnableStatusName.DISABLE,
    value: EnableStatus.DISABLE,
  },
];
