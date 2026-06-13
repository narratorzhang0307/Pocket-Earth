import { createRoot } from "react-dom/client";
import MyCityTab from "./app/components/MyCityTab";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <MyCityTab savedTreeIds={[]} />
);
