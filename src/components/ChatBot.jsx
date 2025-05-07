import React, { useEffect, useState } from "react";
import logo from "../assets/logo-guss.png";
import fondo from "../assets/fondo-dashboard.png";

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    let greeting = "Hola";
    if (hour < 12) greeting = "Buenos días";
    else if (hour < 18) greeting = "Buenas tardes";
    else greeting = "Buenas noches";

    const bienvenida = `${greeting}, bienvenido a Guss Restobar 🍽️. ¿En qué sucursal estás interesado?`;
    setMessages([{ from: "bot", text: bienvenida }]);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { from: "user", text: input }];
    setMessages(newMessages);
    setInput("");

    setTimeout(() => {
      if (step === 0) {
        const menu = [
          "Pizza Napolitana 🍕",
          "Empanadas Salteñas 🥟",
          "Milanesa con papas 🍽️",
        ];
        const recomendados = "Los platos más pedidos hoy son: " + menu.join(", ");

        setMessages((prev) => [
          ...prev,
          { from: "bot", text: `Perfecto, sucursal ${input} seleccionada.` },
          { from: "bot", text: recomendados },
          { from: "bot", text: "¿Querés hacer un pedido o reservar una mesa?" },
        ]);
        setStep(1);
      } else if (step === 1) {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: `¡Entendido! Vamos a ${input.toLowerCase()} entonces. 😄` },
          { from: "bot", text: "(Aquí continuaríamos con el proceso de reserva o pedido...)" },
        ]);
        setStep(2);
      } else {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: "¡Gracias por usar nuestro servicio! 🍷" },
        ]);
      }
    }, 800);
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      <div className="w-full max-w-md bg-white/70 backdrop-blur p-6 rounded-2xl shadow-2xl">
        <div className="flex items-center mb-4">
          <img src={logo} alt="logo" className="w-10 h-10 rounded-full mr-2" />
          <h2 className="text-xl font-bold text-orange-700">Guss Restobot</h2>
        </div>

        <div className="h-96 overflow-y-auto mb-4 space-y-2 pr-1">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.from === "bot" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`px-4 py-2 text-sm max-w-[75%] ${
                  msg.from === "bot"
                    ? "bg-white text-gray-800 rounded-2xl rounded-bl-none"
                    : "bg-green-500 text-white rounded-2xl rounded-br-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 p-2 rounded-lg border border-gray-300 focus:outline-none text-gray-800"
            placeholder="Escribí tu mensaje..."
          />
          <button
            onClick={handleSend}
            className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-white"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
