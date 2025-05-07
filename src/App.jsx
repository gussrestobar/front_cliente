import React from "react";
import ChatBot from "./components/ChatBot";
import "./App.css";

function App() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 bg-black/50">
      <img
        src="/src/assets/logo-guss.png"
        alt="Logo Guss"
        className="w-40 mt-4 mb-6"
      />
      <ChatBot />
    </div>
  );
}

export default App;
