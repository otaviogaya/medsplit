import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../features/auth/context/AuthContext";
import { LoginScreen } from "../features/auth/screens/LoginScreen";
import { SignupScreen } from "../features/auth/screens/SignupScreen";
import { HomeScreen } from "../features/dashboard/screens/HomeScreen";
import { ProcedimentosScreen } from "../features/procedimentos/screens/ProcedimentosScreen";
import { NovoProcedimentoScreen } from "../features/procedimentos/screens/NovoProcedimentoScreen";
import { ProcedimentoDetailScreen } from "../features/procedimentos/screens/ProcedimentoDetailScreen";
import { RepassesScreen } from "../features/repasses/screens/RepassesScreen";
import { RelatoriosScreen } from "../features/relatorios/screens/RelatoriosScreen";
import { CadastrosScreen } from "../features/cadastros/screens/CadastrosScreen";
import { GlosasScreen } from "../features/glosas/screens/GlosasScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  function getTabIcon(routeName: string) {
    switch (routeName) {
      case "Home":
        return "home-variant-outline";
      case "Procedimentos":
        return "clipboard-pulse-outline";
      case "Repasses":
        return "cash-multiple";
      case "Relatorios":
        return "file-chart-outline";
      case "Glosas":
        return "alert-circle-outline";
      case "Cadastros":
        return "cog-outline";
      default:
        return "circle-outline";
    }
  }

  return (
    <Tab.Navigator
      initialRouteName="Procedimentos"
      screenOptions={({ route }) => ({
        headerRight: () => <IconButton icon="logout" onPress={signOut} />,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={getTabIcon(route.name)}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Procedimentos" component={ProcedimentosScreen} />
      <Tab.Screen name="Repasses" component={RepassesScreen} />
      <Tab.Screen name="Relatorios" component={RelatoriosScreen} />
      <Tab.Screen name="Glosas" component={GlosasScreen} />
      <Tab.Screen name="Cadastros" component={CadastrosScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, alignSelf: "center" }} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session ? (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="NovoProcedimento"
              component={NovoProcedimentoScreen}
              options={{ title: "Novo Procedimento" }}
            />
            <Stack.Screen
              name="DetalheProcedimento"
              component={ProcedimentoDetailScreen}
              options={{ title: "Detalhe do Procedimento" }}
            />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Criar Usuario" }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
