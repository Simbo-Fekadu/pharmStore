import { useContext } from "react";
import { ThemeContext } from "./ThemeProvider.jsx";

export const useTheme = () => useContext(ThemeContext);
