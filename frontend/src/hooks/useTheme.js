import { useEffect, useState } from "react";

export const useTheme = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem("trade-os-theme") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("trade-os-theme", theme);
  }, [theme]);
  const toggle = () => setTheme(t => (t === "light" ? "dark" : "light"));
  return { theme, toggle };
};
