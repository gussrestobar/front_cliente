import React, { useEffect, useState } from "react";
import logo from "../assets/logo-guss.png";
import fondo from "../assets/fondo-dashboard.png";
import qrPago from "../assets/Qr empresa.png";
import { getSucursales, getMenus } from "../api";
import axios from 'axios';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [sucursales, setSucursales] = useState([]);
  const [selectedSucursal, setSelectedSucursal] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [suggestedSucursal, setSuggestedSucursal] = useState(null);
  const [mesasDisponibles, setMesasDisponibles] = useState([]);
  const [reservaData, setReservaData] = useState({
    cliente_nombre: "",
    personas: "",
    fecha: "",
    hora: "",
    mesa_id: "",
    estado: "pendiente",
    tenant_id: null
  });
  const [showQR, setShowQR] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [waitingForComprobante, setWaitingForComprobante] = useState(false);
  const [reservaPendiente, setReservaPendiente] = useState(null);
  const [showComprobanteButtons, setShowComprobanteButtons] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [isFarewell, setIsFarewell] = useState(false);
  const [isLastMessage, setIsLastMessage] = useState(false);

  // Horarios disponibles
  const horariosDisponibles = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00"
  ];

  // Obtener días disponibles del mes actual
  const getDiasDisponibles = () => {
    const hoy = new Date();
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const dias = [];
    for (let i = hoy.getDate(); i <= ultimoDia; i++) {
      dias.push(i);
    }
    return dias;
  };

  // Obtener mesas disponibles del backend
  const fetchMesasDisponibles = async (tenantId) => {
    try {
      console.log('Obteniendo mesas disponibles para tenant:', tenantId);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/mesas/disponibles/${tenantId}`);
      console.log('Respuesta de mesas disponibles:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        setMesasDisponibles(response.data);
      } else {
        console.error('Formato de respuesta de mesas inválido:', response.data);
        setMessages(prev => [
          ...prev,
          { from: "bot", text: "Error al cargar las mesas disponibles. Por favor, intenta de nuevo." }
        ]);
      }
    } catch (error) {
      console.error('Error al obtener mesas:', error);
      setMessages(prev => [
        ...prev,
        { from: "bot", text: "Error al cargar las mesas disponibles. Por favor, intenta de nuevo." }
      ]);
    }
  };

  useEffect(() => {
    const fetchSucursales = async () => {
      try {
        console.log('Intentando obtener sucursales...');
        const response = await getSucursales();
        console.log('Datos de sucursales:', response.data);
        
        if (!response.data || !Array.isArray(response.data)) {
          console.error('La respuesta no es un array:', response.data);
          setMessages([{ from: "bot", text: "Error al cargar las sucursales. Por favor, intenta de nuevo." }]);
          return;
        }

        setSucursales(response.data);
        const bienvenida = `Bienvenido a Guss Restobar 🍽️. ¿En qué sucursal estás interesado?`;
    setMessages([{ from: "bot", text: bienvenida }]);
      } catch (error) {
        console.error('Error completo:', error);
        setMessages([{ from: "bot", text: "Error al cargar las sucursales. Por favor, intenta de nuevo." }]);
      }
    };

    fetchSucursales();
  }, []);

  const handleSucursalSelect = async (sucursal) => {
    setInput(sucursal.nombre);
    await handleSend(sucursal.nombre);
  };

  const handleItemSelect = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      }
      return [...prev, item];
    });
    setShowConfirmButton(true);
  };

  const handleConfirmSelection = () => {
    if (selectedItems.length === 0) {
      setMessages(prev => [
        ...prev,
        { from: "bot", text: "Por favor, selecciona al menos un plato antes de continuar." }
      ]);
      return;
    }

    // Agrupar items por nombre y contar cantidad
    const itemsAgrupados = selectedItems.reduce((acc, item) => {
      if (!acc[item.nombre]) {
        acc[item.nombre] = {
          cantidad: 0,
          precio: parseFloat(item.precio) || 0,
          total: 0
        };
      }
      acc[item.nombre].cantidad += 1;
      acc[item.nombre].total = acc[item.nombre].cantidad * acc[item.nombre].precio;
      return acc;
    }, {});

    // Crear el resumen del pedido
    const resumen = Object.entries(itemsAgrupados).map(([nombre, datos]) => 
      `- ${nombre} x${datos.cantidad}: Bs. ${Number(datos.total).toFixed(2)}`
    ).join('\n');

    // Calcular el total
    const total = selectedItems.reduce((sum, item) => {
      const precio = parseFloat(item.precio) || 0;
      return sum + precio;
    }, 0);

    setMessages(prev => [
      ...prev,
      { from: "bot", text: `Tu pedido:\n${resumen}\n\nTotal: Bs. ${Number(total).toFixed(2)}` },
      { from: "bot", text: "¿Querés hacer una reserva para disfrutar estos platos?" }
    ]);
    setStep(2);
    setShowConfirmButton(false);
  };

  const findSimilarSucursal = (input) => {
    const inputLower = input.toLowerCase().trim();
    
    // Función para normalizar texto (eliminar acentos y caracteres especiales)
    const normalizeText = (text) => {
      return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    };

    // Primero intentamos una búsqueda exacta
    const exactMatch = sucursales.find(s => 
      normalizeText(s.nombre) === normalizeText(inputLower)
    );
    if (exactMatch) return exactMatch;

    // Mapeo de palabras clave para cada sucursal (sin acentos)
    const sucursalKeywords = {
      'quillacollo': ['quilla', 'quillacollo'],
      'america': ['america', 'america', 'la america', 'el america', 'americas', 'americas'],
      'centro': ['centro', 'el centro', 'la centro'],
      'norte': ['norte', 'el norte', 'la norte'],
      'sur': ['sur', 'el sur', 'la sur']
    };

    // Luego buscamos coincidencias parciales
    const partialMatches = sucursales.filter(s => {
      const sucursalName = normalizeText(s.nombre);
      // Eliminamos "guss restobar" y "restobar" para hacer la búsqueda más flexible
      const cleanSucursalName = sucursalName
        .replace("guss restobar", "")
        .replace("restobar", "")
        .trim();

      // Buscar en las palabras clave específicas de cada sucursal
      const sucursalKey = Object.keys(sucursalKeywords).find(key => 
        cleanSucursalName.includes(normalizeText(key))
      );

      if (sucursalKey) {
        return sucursalKeywords[sucursalKey].some(keyword => 
          normalizeText(inputLower).includes(normalizeText(keyword)) || 
          normalizeText(keyword).includes(normalizeText(inputLower))
        );
      }
      
      return cleanSucursalName.includes(normalizeText(inputLower)) || 
             normalizeText(inputLower).includes(cleanSucursalName);
    });

    // Si encontramos una única coincidencia parcial, la devolvemos
    if (partialMatches.length === 1) {
      return partialMatches[0];
    }

    // Si encontramos múltiples coincidencias, devolvemos la más relevante
    if (partialMatches.length > 1) {
      // Priorizamos coincidencias que contengan la palabra completa
      const bestMatch = partialMatches.find(s => {
        const cleanName = normalizeText(s.nombre)
          .replace("guss restobar", "")
          .replace("restobar", "")
          .trim();
        return cleanName.includes(normalizeText(inputLower)) || 
               normalizeText(inputLower).includes(cleanName);
      });
      if (bestMatch) return bestMatch;
      
      // Si no hay una coincidencia exacta, devolvemos la primera
      return partialMatches[0];
    }

    return null;
  };

  const guardarReserva = async () => {
    try {
      const reserva = {
        ...reservaData,
        tenant_id: selectedSucursal.id
      };

      console.log('Enviando reserva:', reserva);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/reservas`, reserva);
      
      if (response.data) {
        setStep(0);
        setReservaData({
          cliente_nombre: "",
          personas: "",
          fecha: "",
          hora: "",
          mesa_id: "",
          estado: "pendiente",
          tenant_id: null
        });
        setShowQR(false);
        setWaitingForPayment(false);
        setWaitingForComprobante(false);
        setReservaPendiente(null);
      }
    } catch (error) {
      console.error('Error al guardar la reserva:', error);
      setMessages(prev => [
        ...prev,
        { from: "bot", text: "Lo siento, hubo un error al procesar tu reserva. Por favor, intenta de nuevo." }
      ]);
    }
  };

  const handleReservaInput = async (inputText) => {
    const currentStep = step;
    const newData = { ...reservaData };

    switch (currentStep) {
      case 3: // Nombre
        newData.cliente_nombre = inputText;
        setReservaData(newData);
        setMessages(prev => [
          ...prev,
          { from: "bot", text: "¿Para cuántas personas es la reserva?" }
        ]);
        setStep(4);
        break;

      case 4: // Número de personas
        const personas = parseInt(inputText);
        if (isNaN(personas) || personas < 1 || personas > 8) {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "Por favor, ingresa un número válido de personas (1-8)." }
          ]);
          return;
        }
        newData.personas = personas;
        setReservaData(newData);
        setMessages(prev => [
          ...prev,
          { from: "bot", text: "¿Qué día del mes prefieres? (Ingresa el número del día)" }
        ]);
        setStep(5);
        break;

      case 5: // Fecha
        const dia = parseInt(inputText);
        const diasDisponibles = getDiasDisponibles();
        if (isNaN(dia) || !diasDisponibles.includes(dia)) {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: `Por favor, ingresa un día válido (${diasDisponibles.join(", ")})` }
          ]);
          return;
        }
        // Formatear la fecha como YYYY-MM-DD
        const hoy = new Date();
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
        newData.fecha = fecha.toISOString().split('T')[0];
        setReservaData(newData);
        setMessages(prev => [
          ...prev,
          { from: "bot", text: "¿A qué hora prefieres? (Ingresa la hora en formato HH:MM)" }
        ]);
        setStep(6);
        break;

      case 6: // Hora
        if (!horariosDisponibles.includes(inputText)) {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: `Por favor, ingresa una hora válida (${horariosDisponibles.join(", ")})` }
          ]);
          return;
        }
        newData.hora = inputText;
        setReservaData(newData);
        setMessages(prev => [
          ...prev,
          { from: "bot", text: "Selecciona una mesa:" }
        ]);
        setStep(7);
        break;

      case 7: // Mesa
        console.log('Mesa seleccionada:', inputText);
        console.log('Mesas disponibles:', mesasDisponibles);
        
        const mesaSeleccionada = mesasDisponibles.find(m => m.numero.toString() === inputText.replace('Mesa ', ''));
        if (!mesaSeleccionada) {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "Por favor, selecciona una mesa válida de la lista." }
          ]);
          return;
        }
        
        newData.mesa_id = mesaSeleccionada.id;
        setReservaData(newData);
        
        // Mostrar resumen de la reserva
        const resumen = `Resumen de la reserva:\n
Nombre: ${newData.cliente_nombre}
Personas: ${newData.personas}
Fecha: ${newData.fecha}
Hora: ${newData.hora}
Mesa: Mesa ${mesaSeleccionada.numero} (${mesaSeleccionada.capacidad} personas)

¿Los datos son correctos? (Responde sí o no)`;
        
        setMessages(prev => [
          ...prev,
          { from: "bot", text: resumen }
        ]);
        setStep(8);
        break;

      case 8: // Confirmación
        const confirmacion = inputText.toLowerCase().includes('si') || 
                           inputText.toLowerCase().includes('sí') || 
                           inputText.toLowerCase().includes('correcto') ||
                           inputText.toLowerCase().includes('exacto') ||
                           inputText.toLowerCase().includes('por supuesto') ||
                           inputText.toLowerCase().includes('claro') ||
                           inputText.toLowerCase().includes('ok') ||
                           inputText.toLowerCase().includes('okay') ||
                           inputText.toLowerCase().includes('vale') ||
                           inputText.toLowerCase().includes('bueno') ||
                           inputText.toLowerCase().includes('perfecto') ||
                           inputText.toLowerCase().includes('genial') ||
                           inputText.toLowerCase().includes('excelente');

        if (confirmacion) {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "¿Querés confirmar el pago por QR?" }
          ]);
          setShowQR(true);
          setWaitingForPayment(true);
          setReservaPendiente(reservaData);
          setInputDisabled(true);
        } else {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "¿Qué dato deseas modificar? (nombre, personas, fecha, hora, mesa)" }
          ]);
          setStep(9);
        }
        break;

      case 9: // Modificación
        const datoAModificar = inputText.toLowerCase();
        if (['nombre', 'personas', 'fecha', 'hora', 'mesa'].includes(datoAModificar)) {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: `Ingresa el nuevo ${datoAModificar}:` }
          ]);
          setStep(3 + ['nombre', 'personas', 'fecha', 'hora', 'mesa'].indexOf(datoAModificar));
        } else {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "Por favor, especifica qué dato deseas modificar (nombre, personas, fecha, hora, mesa)" }
          ]);
        }
        break;
    }
  };

  const handleSend = async (inputText = input) => {
    if (!inputText.trim() || inputDisabled) return;
    const newMessages = [...messages, { from: "user", text: inputText }];
    setMessages(newMessages);
    setInput("");

    setTimeout(async () => {
      if (step === 2) {
        const negacion = inputText.toLowerCase().includes('no') || 
                        inputText.toLowerCase().includes('todavía') ||
                        inputText.toLowerCase().includes('aun') ||
                        inputText.toLowerCase().includes('aún') ||
                        inputText.toLowerCase().includes('por ahora') ||
                        inputText.toLowerCase().includes('después') ||
                        inputText.toLowerCase().includes('luego') ||
                        inputText.toLowerCase().includes('más tarde') ||
                        inputText.toLowerCase().includes('quizás') ||
                        inputText.toLowerCase().includes('quizas') ||
                        inputText.toLowerCase().includes('tal vez') ||
                        inputText.toLowerCase().includes('mejor no') ||
                        inputText.toLowerCase().includes('no gracias') ||
                        inputText.toLowerCase().includes('no quiero') ||
                        inputText.toLowerCase().includes('no deseo');

        if (negacion) {
          const mensajeSucursal = selectedSucursal.nombre.toLowerCase().includes('quillacollo')
            ? "Te esperamos en nuestra sucursal de Quillacollo para que pruebes nuestros famosos platos. ¡Será un placer atenderte! 😊"
            : `Te esperamos en nuestra sucursal ${selectedSucursal.nombre} para que disfrutes de nuestra deliciosa comida. ¡Será un placer atenderte! 😊`;

          setMessages(prev => [
            ...prev,
            { from: "bot", text: mensajeSucursal }
          ]);

          // Esperar 4 segundos antes de mostrar el mensaje de reinicio
          setTimeout(() => {
            setMessages(prev => [
              ...prev,
              { from: "bot", text: "Reiniciando el chat para una nueva interacción..." }
            ]);

            // Esperar 2 segundos más antes de reiniciar
            setTimeout(() => {
              setStep(0);
              setMessages([{ from: "bot", text: "Bienvenido a Guss Restobar 🍽️. ¿En qué sucursal estás interesado?" }]);
              setSelectedItems([]);
              setShowConfirmButton(false);
              setInputDisabled(false);
              setIsFarewell(false);
              setIsLastMessage(false);
              setShowQR(false);
              setWaitingForPayment(false);
              setWaitingForComprobante(false);
              setReservaPendiente(null);
              setReservaData({
                cliente_nombre: "",
                personas: "",
                fecha: "",
                hora: "",
                mesa_id: "",
                estado: "pendiente",
                tenant_id: null
              });
            }, 2000);
          }, 4000);
          return;
        } else {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "Por favor, ingresa tu nombre completo:" },
            { from: "bot", text: "⚠️ Importante: El nombre debe coincidir con el titular del QR de pago para evitar problemas con tu reserva." }
          ]);
          setStep(3);
        }
        return;
      }

      if (isLastMessage) {
        setMessages(prev => [
          ...prev,
          { from: "bot", text: "¡Muchas gracias! Te esperamos en nuestra sucursal. ¡Que tengas un excelente día! 😊" },
          { from: "bot", text: "Reiniciando el chat para una nueva interacción..." }
        ]);
        setTimeout(() => {
          setStep(0);
          setMessages([{ from: "bot", text: "Bienvenido a Guss Restobar 🍽️. ¿En qué sucursal estás interesado?" }]);
          setSelectedItems([]);
          setShowConfirmButton(false);
          setInputDisabled(false);
          setIsFarewell(false);
          setIsLastMessage(false);
          setShowQR(false);
          setWaitingForPayment(false);
          setWaitingForComprobante(false);
          setReservaPendiente(null);
          setReservaData({
            cliente_nombre: "",
            personas: "",
            fecha: "",
            hora: "",
            mesa_id: "",
            estado: "pendiente",
            tenant_id: null
          });
        }, 2000);
        return;
      }

      if (isFarewell) {
        setMessages(prev => [
          ...prev,
          { from: "bot", text: "¡Gracias por preferirnos en Guss Restobar! 😊" },
          { from: "bot", text: "Reiniciando el chat para una nueva interacción..." }
        ]);
        setTimeout(() => {
          setStep(0);
          setMessages([{ from: "bot", text: "Bienvenido a Guss Restobar 🍽️. ¿En qué sucursal estás interesado?" }]);
          setSelectedItems([]);
          setShowConfirmButton(false);
          setInputDisabled(false);
          setIsFarewell(false);
          setShowQR(false);
          setWaitingForPayment(false);
          setWaitingForComprobante(false);
          setReservaPendiente(null);
          setReservaData({
            cliente_nombre: "",
            personas: "",
            fecha: "",
            hora: "",
            mesa_id: "",
            estado: "pendiente",
            tenant_id: null
          });
        }, 2000);
        return;
      }

      if (step === 0) {
        // Si hay una sucursal sugerida y el usuario confirma
        if (suggestedSucursal && (
          inputText.toLowerCase().includes('si') || 
          inputText.toLowerCase().includes('sí') || 
          inputText.toLowerCase().includes('correcto') ||
          inputText.toLowerCase().includes('exacto') ||
          inputText.toLowerCase().includes('por supuesto') ||
          inputText.toLowerCase().includes('claro') ||
          inputText.toLowerCase().includes('por favor') ||
          inputText.toLowerCase().includes('dale') ||
          inputText.toLowerCase().includes('ok') ||
          inputText.toLowerCase().includes('okay') ||
          inputText.toLowerCase().includes('vale') ||
          inputText.toLowerCase().includes('bueno') ||
          inputText.toLowerCase().includes('perfecto') ||
          inputText.toLowerCase().includes('genial') ||
          inputText.toLowerCase().includes('excelente') ||
          inputText.toLowerCase().includes('me parece bien') ||
          inputText.toLowerCase().includes('está bien') ||
          inputText.toLowerCase().includes('está perfecto') ||
          inputText.toLowerCase().includes('me gusta') ||
          inputText.toLowerCase().includes('me interesa') ||
          inputText.toLowerCase().includes('quiero') ||
          inputText.toLowerCase().includes('deseo') ||
          inputText.toLowerCase().includes('me encanta') ||
          inputText.toLowerCase().includes('me agrada')
        )) {
          setSelectedSucursal(suggestedSucursal);
          setSuggestedSucursal(null);
          try {
            const menuResponse = await getMenus(suggestedSucursal.id);
            const items = menuResponse.data;
            setMenuItems(items);
            await fetchMesasDisponibles(suggestedSucursal.id);
            
            let menuMessage = `¡Perfecto! Has seleccionado la sucursal ${suggestedSucursal.nombre}.\n\nAhora, toca los platos que te gustaría ordenar. Puedes seleccionar varios platos y luego confirmar tu selección:`;
            
            setMessages(prev => [
              ...prev,
              { from: "bot", text: menuMessage }
            ]);
            setStep(1);
            return;
          } catch (error) {
            console.error('Error al obtener el menú:', error);
            setMessages(prev => [
              ...prev,
              { from: "bot", text: "Error al cargar el menú. Por favor, intenta de nuevo." }
            ]);
            return;
          }
        }

        // Si no hay sucursal sugerida o el usuario no confirmó, buscamos una nueva
        const sucursalEncontrada = findSimilarSucursal(inputText);
        
        if (!sucursalEncontrada) {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "Lo siento, no pude entender bien qué sucursal buscas. ¿Podrías ser más específico? Por ejemplo: 'Quillacollo', 'Centro', 'Cochabamba', etc." }
          ]);
          return;
        }

        // Si la entrada del usuario es muy diferente del nombre de la sucursal
        if (!sucursalEncontrada.nombre.toLowerCase().includes(inputText.toLowerCase()) &&
            !inputText.toLowerCase().includes(sucursalEncontrada.nombre.toLowerCase())) {
          setSuggestedSucursal(sucursalEncontrada);
          setMessages(prev => [
            ...prev,
            { from: "bot", text: `¿Te refieres a la sucursal ${sucursalEncontrada.nombre}?` }
          ]);
          return;
        }

        setSelectedSucursal(sucursalEncontrada);
        
        try {
          const menuResponse = await getMenus(sucursalEncontrada.id);
          const items = menuResponse.data;
          setMenuItems(items);
          await fetchMesasDisponibles(sucursalEncontrada.id);
          
          let menuMessage = `¡Perfecto! Has seleccionado la sucursal ${sucursalEncontrada.nombre}.\n\nAhora, toca los platos que te gustaría ordenar. Puedes seleccionar varios platos y luego confirmar tu selección:`;
          
          setMessages(prev => [
          ...prev,
            { from: "bot", text: menuMessage }
        ]);
        setStep(1);
        } catch (error) {
          console.error('Error al obtener el menú:', error);
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "Error al cargar el menú. Por favor, intenta de nuevo." }
          ]);
        }
      } else if (step === 2) {
        if (inputText.toLowerCase().includes('si') || 
            inputText.toLowerCase().includes('sí') || 
            inputText.toLowerCase().includes('correcto')) {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "Por favor, ingresa tu nombre completo:" },
            { from: "bot", text: "⚠️ Importante: El nombre debe coincidir con el titular del QR de pago para evitar problemas con tu reserva." }
          ]);
          setStep(3);
          setInputDisabled(false);
        } else {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "Entendido. ¿Querés agregar más platos a tu pedido?" }
          ]);
          setStep(1);
          setInputDisabled(false);
        }
      } else if (step >= 3) {
        await handleReservaInput(inputText);
      }

      if (waitingForPayment) {
        setInputDisabled(true);
        const confirmacionPago = inputText.toLowerCase().includes('si') || 
                               inputText.toLowerCase().includes('sí') || 
                               inputText.toLowerCase().includes('correcto') ||
                               inputText.toLowerCase().includes('exacto') ||
                               inputText.toLowerCase().includes('por supuesto') ||
                               inputText.toLowerCase().includes('claro') ||
                               inputText.toLowerCase().includes('ok') ||
                               inputText.toLowerCase().includes('okay') ||
                               inputText.toLowerCase().includes('vale') ||
                               inputText.toLowerCase().includes('bueno') ||
                               inputText.toLowerCase().includes('perfecto') ||
                               inputText.toLowerCase().includes('genial') ||
                               inputText.toLowerCase().includes('excelente');

        if (confirmacionPago) {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "¡Excelente! Por favor, envía el comprobante de pago a través de WhatsApp:" },
            { from: "bot", text: "Haz clic aquí para enviar el comprobante: 👇" }
          ]);
          setShowQR(false);
          setWaitingForComprobante(true);
          setInputDisabled(true);
        } else {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "Entendido. Muchas gracias por tu interés. ¡Estamos aquí para lo que necesites! 😊" }
          ]);
          setStep(0);
          setShowQR(false);
          setWaitingForPayment(false);
          setReservaPendiente(null);
          setInputDisabled(false);
        }
        return;
      }

      if (waitingForComprobante) {
        setInputDisabled(true);
        const confirmacionComprobante = inputText.toLowerCase().includes('si') || 
                                      inputText.toLowerCase().includes('sí') || 
                                      inputText.toLowerCase().includes('correcto') ||
                                      inputText.toLowerCase().includes('exacto') ||
                                      inputText.toLowerCase().includes('por supuesto') ||
                                      inputText.toLowerCase().includes('claro') ||
                                      inputText.toLowerCase().includes('ok') ||
                                      inputText.toLowerCase().includes('okay') ||
                                      inputText.toLowerCase().includes('vale') ||
                                      inputText.toLowerCase().includes('bueno') ||
                                      inputText.toLowerCase().includes('perfecto') ||
                                      inputText.toLowerCase().includes('genial') ||
                                      inputText.toLowerCase().includes('excelente');

        if (confirmacionComprobante) {
          await handleComprobanteConfirmado();
        } else {
          setMessages(prev => [
            ...prev,
            { from: "bot", text: "Por favor, envía el comprobante antes de continuar. ¿Ya lo enviaste?" }
          ]);
        }
        return;
      }
    }, 800);
  };

  const handlePagoConfirmado = () => {
    setMessages(prev => [
      ...prev,
      { from: "bot", text: "¡Excelente! Por favor, envía el comprobante de pago a través de WhatsApp:" },
      { from: "bot", text: "Haz clic aquí para enviar el comprobante: 👇" }
    ]);
    setShowQR(false);
    setWaitingForComprobante(true);
    setShowComprobanteButtons(false);
    setInputDisabled(true);
  };

  const handleWhatsAppClick = () => {
    setMessages(prev => [
      ...prev,
      { from: "bot", text: "¿Ya enviaste el comprobante por WhatsApp?" }
    ]);
    setShowComprobanteButtons(true);
    setInputDisabled(true);
  };

  const handleComprobanteConfirmado = () => {
    setMessages(prev => [
      ...prev,
      { from: "bot", text: "¡Perfecto! Tu reserva y tus platos han sido confirmados. ¡Gracias por elegirnos! 🎉" },
      { from: "bot", text: "Te esperamos en nuestra sucursal. ¡Que tengas un excelente día! 😊" }
    ]);
    setInputDisabled(false);
    setIsFarewell(true);
    guardarReserva();
  };

  const handleComprobanteCancelado = () => {
    // Esperar 10 segundos antes de volver a preguntar
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { from: "bot", text: "¿Pudiste enviar el comprobante por WhatsApp?" }
      ]);
      setShowComprobanteButtons(true);
      setInputDisabled(true);
    }, 10000);
  };

  const handleComprobanteNoPudo = () => {
    const mensajeSucursal = selectedSucursal.nombre.toLowerCase().includes('quillacollo')
      ? "Te esperamos en nuestra sucursal de Quillacollo para que pruebes nuestros famosos platos. ¡Será un placer atenderte! 😊"
      : `Te esperamos en nuestra sucursal ${selectedSucursal.nombre} para que disfrutes de nuestra deliciosa comida. ¡Será un placer atenderte! 😊`;

    setMessages(prev => [
      ...prev,
      { from: "bot", text: mensajeSucursal }
    ]);

    // Esperar 4 segundos antes de mostrar el mensaje de reinicio
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { from: "bot", text: "Reiniciando el chat para una nueva interacción..." }
      ]);

      // Esperar 2 segundos más antes de reiniciar
      setTimeout(() => {
        setStep(0);
        setMessages([{ from: "bot", text: "Bienvenido a Guss Restobar 🍽️. ¿En qué sucursal estás interesado?" }]);
        setSelectedItems([]);
        setShowConfirmButton(false);
        setInputDisabled(false);
        setIsFarewell(false);
        setIsLastMessage(false);
        setShowQR(false);
        setWaitingForPayment(false);
        setWaitingForComprobante(false);
        setReservaPendiente(null);
        setReservaData({
          cliente_nombre: "",
          personas: "",
          fecha: "",
          hora: "",
          mesa_id: "",
          estado: "pendiente",
          tenant_id: null
        });
      }, 2000);
    }, 4000);
  };

  const handlePagoCancelado = () => {
    const mensajeSucursal = selectedSucursal.nombre.toLowerCase().includes('quillacollo')
      ? "Te esperamos en nuestra sucursal de Quillacollo para que pruebes nuestros famosos platos. ¡Será un placer atenderte! 😊"
      : `Te esperamos en nuestra sucursal ${selectedSucursal.nombre} para que disfrutes de nuestra deliciosa comida. ¡Será un placer atenderte! 😊`;

    setMessages(prev => [
      ...prev,
      { from: "bot", text: mensajeSucursal }
    ]);

    // Esperar 4 segundos antes de mostrar el mensaje de reinicio
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { from: "bot", text: "Reiniciando el chat para una nueva interacción..." }
      ]);

      // Esperar 2 segundos más antes de reiniciar
      setTimeout(() => {
        setStep(0);
        setMessages([{ from: "bot", text: "Bienvenido a Guss Restobar 🍽️. ¿En qué sucursal estás interesado?" }]);
        setSelectedItems([]);
        setShowConfirmButton(false);
        setInputDisabled(false);
        setIsFarewell(false);
        setIsLastMessage(false);
        setShowQR(false);
        setWaitingForPayment(false);
        setWaitingForComprobante(false);
        setReservaPendiente(null);
        setReservaData({
          cliente_nombre: "",
          personas: "",
          fecha: "",
          hora: "",
          mesa_id: "",
          estado: "pendiente",
          tenant_id: null
        });
      }, 2000);
    }, 4000);
  };

  const renderMenuItems = () => {
    const menuPorCategorias = menuItems.reduce((acc, item) => {
      const categoria = item.categoria || 'Sin categoría';
      if (!acc[categoria]) {
        acc[categoria] = [];
      }
      acc[categoria].push(item);
      return acc;
    }, {});

    // Ordenar las categorías: Combos primero, luego el resto
    const categoriasOrdenadas = Object.entries(menuPorCategorias).sort(([catA], [catB]) => {
      if (catA.toLowerCase().includes('combo')) return -1;
      if (catB.toLowerCase().includes('combo')) return 1;
      return catA.localeCompare(catB);
    });

    return (
      <div className="space-y-4">
        {categoriasOrdenadas.map(([categoria, items]) => (
          <div key={categoria} className="mb-4">
            <h3 className="text-xl font-bold text-orange-700 mb-3 border-b-2 border-orange-200 pb-2">
              {categoria}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleItemSelect(item)}
                  className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedItems.find(i => i.id === item.id)
                      ? 'border-orange-500 shadow-lg'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <div className="relative w-full h-36">
                    <img
                      src={item.imagen_url || 'https://via.placeholder.com/150'}
                      alt={item.nombre}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <h4 className="font-medium text-gray-800 text-base">{item.nombre}</h4>
                    <p className="text-sm text-gray-600 font-semibold">${item.precio}</p>
                    {item.descripcion && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.descripcion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {showConfirmButton && (
          <div className="sticky bottom-0 bg-white/80 backdrop-blur p-4 rounded-lg shadow-lg mt-4">
            <button
              onClick={handleConfirmSelection}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Confirmar Selección ({selectedItems.length} platos)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      <div className="w-full max-w-4xl bg-white/70 backdrop-blur p-6 rounded-2xl shadow-2xl">
        <div className="flex items-center mb-4">
          <img src={logo} alt="logo" className="w-10 h-10 rounded-full mr-2" />
          <h2 className="text-xl font-bold text-orange-700">Guss Restobot</h2>
        </div>

        {/* Lista de sucursales fija en la parte superior */}
        <div className="bg-white/80 p-3 rounded-lg mb-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Sucursales disponibles:</h3>
          <div className="flex flex-wrap gap-2">
            {sucursales.map((sucursal) => (
              <div
                key={sucursal.id}
                className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm"
              >
                {sucursal.nombre}
              </div>
            ))}
          </div>
        </div>

        <div className="h-[500px] overflow-y-auto mb-4 space-y-2 pr-1">
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
                {msg.text.includes("Haz clic aquí para enviar el comprobante") && (
                  <a
                    href="https://wa.me/59160715776?text=Hola,%20aquí%20está%20mi%20comprobante%20de%20pago%20para%20la%20reserva"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleWhatsAppClick}
                    className="block mt-2 bg-green-500 text-white px-4 py-2 rounded-lg text-center hover:bg-green-600 transition-colors"
                  >
                    📱 Enviar comprobante por WhatsApp
                  </a>
                )}
                {msg.text.includes("¿Ya enviaste el comprobante por WhatsApp?") && showComprobanteButtons && (
                  <div className="flex gap-4 mt-4">
                    <button
                      onClick={handleComprobanteConfirmado}
                      className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                    >
                      <span>✅ Sí, ya lo envié</span>
                    </button>
                    <button
                      onClick={handleComprobanteNoPudo}
                      className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      <span>😢 No pude</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {showQR && (
            <div className="flex flex-col items-center my-4 space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <img src={qrPago} alt="QR de pago" className="w-48 h-48 object-contain" />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handlePagoConfirmado}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <span>✅ Ya pagué</span>
                </button>
                <button
                  onClick={handlePagoCancelado}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <span>❌ Aún no</span>
                </button>
              </div>
            </div>
          )}
          {step === 1 && renderMenuItems()}
          {step === 6 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {horariosDisponibles.map((hora) => (
                <div
                  key={hora}
                  className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm cursor-pointer"
                  onClick={() => handleSend(hora)}
                >
                  {hora}
                </div>
              ))}
            </div>
          )}
          {step === 7 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {mesasDisponibles.length > 0 ? (
                mesasDisponibles.map((mesa) => (
                  <div
                    key={mesa.id}
                    className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-orange-200"
                    onClick={() => handleSend(`Mesa ${mesa.numero}`)}
                  >
                    Mesa {mesa.numero} ({mesa.capacidad} personas)
                  </div>
                ))
              ) : (
                <div className="text-gray-600">Cargando mesas disponibles...</div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !inputDisabled && handleSend()}
            className={`flex-1 p-2 rounded-lg border ${
              inputDisabled || showQR || step === 1 || step === 6 || step === 7
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'border-gray-300 focus:outline-none text-gray-800'
            }`}
            placeholder={
              inputDisabled || showQR || step === 1
                ? "Por favor, usa los botones de acción..."
                : step === 6
                ? "Por favor, selecciona una hora de la lista..."
                : step === 7
                ? "Por favor, selecciona una mesa de la lista..."
                : isLastMessage
                ? "Escribe un mensaje de despedida..."
                : isFarewell
                ? "Escribe un mensaje de despedida..."
                : "Escribí tu mensaje..."
            }
            disabled={inputDisabled || showQR || step === 1 || step === 6 || step === 7}
          />
          <button
            onClick={() => !inputDisabled && handleSend()}
            className={`px-4 py-2 rounded-lg text-white ${
              inputDisabled || showQR || step === 1 || step === 6 || step === 7
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
            disabled={inputDisabled || showQR || step === 1 || step === 6 || step === 7}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
