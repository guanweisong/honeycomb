import { EnableStatus } from "@/lib/validation/enable-status";
import { EnableStatusName } from "@/app/admin/(dashboard)/types/enable-status-name";

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
