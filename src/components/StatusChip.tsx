import { Chip } from "react-native-paper";
import { ProcedimentoStatus } from "../types/app";
import { procedimentoStatusLabel } from "../lib/status";

const statusColor: Record<ProcedimentoStatus, string> = {
  realizado: "#9E9E9E",
  faturado: "#1E88E5",
  glosa: "#E53935",
  recebido: "#43A047",
  cancelado: "#616161",
};

type Props = {
  status: ProcedimentoStatus;
};

export function StatusChip({ status }: Props) {
  return <Chip style={{ backgroundColor: `${statusColor[status]}22` }}>{procedimentoStatusLabel(status)}</Chip>;
}
