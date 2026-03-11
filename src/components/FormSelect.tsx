import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { List, Text, TextInput } from "react-native-paper";

type Option = {
  label: string;
  value: string;
};

type Props = {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
};

export function FormSelect({ label, value, onChange, options, disabled }: Props) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <TextInput
        label={label}
        value={selected?.label ?? ""}
        mode="outlined"
        editable={false}
        right={<TextInput.Icon icon="menu-down" onPress={() => !disabled && setVisible(true)} />}
        onPressIn={() => !disabled && setVisible(true)}
      />
      <Modal visible={visible} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text variant="titleMedium" style={styles.title}>
              {label}
            </Text>
            <ScrollView style={styles.list}>
              {options.map((option) => (
                <List.Item
                  key={option.value}
                  title={option.label}
                  onPress={() => {
                    onChange(option.value);
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
