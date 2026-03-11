import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "./src/providers/AppProviders";
import { AppNavigator } from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <AppNavigator />
    </AppProviders>
  );
}
