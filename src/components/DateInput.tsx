import { useMemo, useState } from "react";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { TextInput } from "react-native-paper";
import { toDate, toIsoDateLocal } from "../lib/format";

type Props = {
  label: string;
  value?: string;
  onChangeText: (value: string) => void;
};

export function DateInput({ label, value, onChangeText }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const selectedDate = useMemo(() => {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [value]);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      setShowPicker(false);
      return;
    }

    if (date) {
      onChangeText(toIsoDateLocal(date));
    }
    setShowPicker(false);
  };

  return (
    <>
      <TextInput
        label={label}
        mode="outlined"
        value={value ? toDate(value) : ""}
        placeholder="dd/mm/aaaa"
        editable={false}
        right={<TextInput.Icon icon="calendar" onPress={() => setShowPicker(true)} />}
        onPressIn={() => setShowPicker(true)}
      />
      {showPicker && (
        <DateTimePicker
          mode="date"
          value={selectedDate}
          display="default"
          onChange={handleDateChange}
        />
      )}
    </>
  );
}
