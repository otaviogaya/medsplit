import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet } from "react-native";
import { List, Text, TextInput } from "react-native-paper";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function MonthInput({ label, value, onChange }: Props) {
  const [visible, setVisible] = useState(false);

  const options = useMemo(() => {
    return Array.from({ length: 24 }).map((_, index) => {
      const date = dayjs().subtract(index, "month");
      return {
        value: date.format("YYYY-MM"),
        label: date.format("MM/YYYY"),
      };
    });
  }, []);

  const selectedLabel = options.find((item) => item.value === value)?.label ?? "";

  return (
    <>
      <TextInput
        mode="outlined"
        label={label}
        value={selectedLabel}
        editable={false}
        right={<TextInput.Icon icon="calendar-month" onPress={() => setVisible(true)} />}
        onPressIn={() => setVisible(true)}
      />
      <Modal visible={visible} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text variant="titleMedium" style={styles.title}>
              {label}
            </Text>
            <ScrollView style={styles.list}>
              {options.map((item) => (
                <List.Item
                  key={item.value}
                  title={item.label}
                  onPress={() => {
                    onChange(item.value);
                    setVisible(false);
                  }}
                />
              ))}
            </ScrollView>
            <List.Item title="Fechar" onPress={() => setVisible(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
  },
  title: { padding: 16 },
  list: { maxHeight: 320 },
});
