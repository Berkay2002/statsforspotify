import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { FloatingPlayer } from "../../components/ui/floating-player";

function Fixture() {
  const [mounted, setMounted] = useState(true);
  return <React.StrictMode>
    <button onClick={() => setMounted(false)}>Unmount player</button>
    {mounted && <FloatingPlayer />}
  </React.StrictMode>;
}

createRoot(document.getElementById("root")!).render(<Fixture />);
