import { PropsWithChildren } from "react";
import { DefaultTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryProvider } from "../lib/queryClient";
import { AuthProvider } from "../features/auth/context/AuthContext";

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#0057B8",
    secondary: "#00A0B8",
  },
};

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
