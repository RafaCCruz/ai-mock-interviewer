"use client";

import { useState, useRef } from "react";

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      // 1. Pede permissão para acessar o microfone do usuário
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 2. Inicializa o MediaRecorder com o stream do microfone
      mediaRecorderRef.current = new MediaRecorder(stream);

      // 3. Sempre que tiver um "pedacinho" (chunk) de áudio pronto, salva na nossa referência
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // 4. O que acontece quando paramos a gravação?
      mediaRecorderRef.current.onstop = () => {
        // Junta todos os pedacinhos em um arquivo final (.webm)
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob)); // Cria uma URL temporária para podermos tocar no navegador
        chunksRef.current = []; // Limpa os pedaços para a próxima gravação
        
        // Desliga a luz vermelha da webcam/microfone do navegador
        stream.getTracks().forEach((track) => track.stop());
      };

      // 5. Dá o play na gravação
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Erro ao acessar o microfone:", error);
      alert("Por favor, permita o acesso ao microfone para usar o simulador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return { isRecording, audioBlob, audioUrl, startRecording, stopRecording };
};