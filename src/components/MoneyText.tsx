import { StyleProp, TextStyle } from "react-native";
import { Text } from "react-native-paper";
import { toMoney } from "../lib/format";

type Props = {
  value?: number | null;
  variant?: "bodyMedium" | "titleLarge" | "headlineSmall";
  style?: StyleProp<TextStyle>;
};

export function MoneyText({ value, variant = "bodyMedium", style }: Props) {
  return (
    <Text variant={variant} style={style}>
      {toMoney(value)}
    </Text>
  );
}
