import { GoogleGenAI, Type } from "@google/genai";
import type { FullAnalysis } from '../types';

// FIX: Per coding guidelines, the API key must be obtained from process.env.API_KEY.
// This also resolves the TypeScript error 'Property 'env' does not exist on type 'ImportMeta''.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the response schema for consistent JSON output
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.OBJECT,
            properties: {
                key_points: {
                    type: Type.ARRAY,
                    description: "Lista dos pontos-chave discutidos na reunião.",
                    items: { type: Type.STRING },
                },
                action_items: {
                    type: Type.ARRAY,
                    description: "Lista de ações a serem tomadas com seus respectivos responsáveis.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            action: { type: Type.STRING, description: "A tarefa ou ação a ser executada." },
                            responsible: { type: Type.STRING, description: "A pessoa ou grupo responsável pela ação." },
                        },
                        required: ["action", "responsible"],
                    },
                },
            },
            required: ["key_points", "action_items"],
        },
        transcript: {
            type: Type.ARRAY,
            description: "A transcrição completa da conversa, dividida por locutor.",
            items: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, description: "O nome do locutor ou um identificador genérico (ex: 'Locutor A')." },
                    text: { type: Type.STRING, description: "O texto falado pelo locutor." },
                    timestamp: { type: Type.STRING, description: "O timestamp (HH:MM:SS) do início da fala." },
                },
                required: ["speaker", "text", "timestamp"],
            },
        },
    },
    required: ["summary", "transcript"],
};


export const analyzeAudioAndTranscript = async (audio: { mimeType: string, data: string }, isDeepAnalysis: boolean = false): Promise<FullAnalysis> => {
  if (!navigator.onLine) {
    throw new Error("Você parece estar offline. Verifique sua conexão e tente novamente.");
  }

  try {
    const audioPart = {
      inlineData: {
        mimeType: audio.mimeType,
        data: audio.data,
      },
    };

    const textPart = {
      text: `Você é um assistente de IA especialista em analisar áudios de reuniões. Sua tarefa é processar o áudio e retornar um único objeto JSON estruturado contendo um resumo e a transcrição completa.

Siga estas regras estritamente:

**Idioma:**
- Todo o conteúdo do JSON (pontos-chave, ações, nomes, transcrição) DEVE estar em português do Brasil.

**Análise do Conteúdo:**
1.  **Resumo:** Extraia os pontos-chave e as ações a serem tomadas, identificando os responsáveis.
2.  **Transcrição:** Transcreva a conversa inteira, gerando timestamps (formato HH:MM:SS) para cada fala.

**Regras Cruciais de Identificação de Locutores:**
1.  **Prioridade a Nomes Reais:** Sua principal tarefa é identificar nomes reais. Preste atenção máxima a introduções ("Meu nome é João") ou quando as pessoas se chamam ("Obrigado, Maria"). Uma vez que um nome é identificado para uma voz, use-o consistentemente.
2.  **Rótulos Genéricos (Como Último Recurso):** Se, e SOMENTE SE, um nome real não for mencionado ou não puder ser determinado com certeza, use rótulos genéricos e consistentes ('Locutor A', 'Locutor B', etc.) para cada voz distinta. Mantenha o mesmo rótulo para a mesma pessoa durante toda a transcrição.
3.  **NÃO INVENTE NOMES:** É estritamente proibido adivinhar ou criar nomes (como "Homem 1", "Mulher com voz A"). A única alternativa aceitável para um nome não identificado é o rótulo genérico (ex: 'Locutor A').

Sua saída DEVE ser um objeto JSON válido que corresponda ao schema fornecido.`,
    };

    const modelName = isDeepAnalysis ? "gemini-2.5-pro" : "gemini-2.5-flash";
    const config: any = {
        responseMimeType: "application/json",
        responseSchema: responseSchema
    };

    if (isDeepAnalysis) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [audioPart, textPart] },
        config: config
    });

    const jsonText = response.text?.trim();
    if (!jsonText) {
        if (response.promptFeedback?.blockReason) {
          throw new Error(`A análise foi bloqueada. Motivo: ${response.promptFeedback.blockReason}. Por favor, ajuste o conteúdo e tente novamente.`);
        }
        throw new Error("A IA retornou uma resposta vazia. Isso pode ocorrer devido a filtros de segurança ou um problema temporário. Tente novamente.");
    }
    
    // Attempt to clean the JSON string by removing markdown fences
    let cleanedJson = jsonText;
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/s;
    const match = cleanedJson.match(jsonRegex);
    if (match && match[1]) {
      cleanedJson = match[1];
    }

    try {
      return JSON.parse(cleanedJson) as FullAnalysis;
    } catch (jsonError: any) {
      console.error("Failed to parse JSON response from Gemini:", jsonError);
      console.error("Original response text:", jsonText);
      throw new Error(`A IA retornou uma resposta mal formatada. Detalhes do erro: ${jsonError.message}`);
    }

  } catch (error: any) {
    console.error("Error analyzing audio with Gemini:", error);
    if (error.message) {
      throw error;
    }
    throw new Error("Ocorreu um erro ao analisar o áudio. Por favor, tente novamente.");
  }
};


export const analyzeTranscript = async (transcript: string, isDeepAnalysis: boolean = false): Promise<FullAnalysis> => {
   if (!navigator.onLine) {
    throw new Error("Você parece estar offline. Verifique sua conexão e tente novamente.");
  }
  
  try {
    const prompt = `Você é um assistente de IA especialista em analisar transcrições de reuniões. Sua tarefa é processar a transcrição fornecida e retornar um único objeto JSON estruturado contendo um resumo e a transcrição formatada.

A transcrição para análise é:
---
${transcript}
---

Siga estas regras estritamente:

**Idioma:**
- Todo o conteúdo do JSON (pontos-chave, ações, nomes, transcrição) DEVE estar em português do Brasil.

**Análise do Conteúdo:**
1.  **Resumo:** Extraia os pontos-chave e as ações a serem tomadas, identificando os responsáveis.
2.  **Transcrição:** Formate a transcrição, gerando timestamps (formato HH:MM:SS) para cada fala.

**Regras Cruciais de Identificação de Locutores:**
1.  **Prioridade a Nomes Reais:** Sua principal tarefa é identificar nomes reais. Preste atenção máxima a introduções ("Meu nome é João") ou quando as pessoas se chamam ("Obrigado, Maria"). Uma vez que um nome é identificado para uma voz, use-o consistentemente.
2.  **Rótulos Genéricos (Como Último Recurso):** Se, e SOMENTE SE, um nome real não for mencionado ou não puder ser determinado com certeza, use rótulos genéricos e consistentes ('Locutor A', 'Locutor B', etc.) para cada voz distinta. Mantenha o mesmo rótulo para a mesma pessoa durante toda a transcrição.
3.  **NÃO INVENTE NOMES:** É estritamente proibido adivinhar ou criar nomes (como "Homem 1", "Mulher com voz A"). A única alternativa aceitável para um nome não identificado é o rótulo genérico (ex: 'Locutor A').

Sua saída DEVE ser um objeto JSON válido que corresponda ao schema fornecido.`;
    
    const modelName = isDeepAnalysis ? "gemini-2.5-pro" : "gemini-2.5-flash";
    const config: any = {
        responseMimeType: "application/json",
        responseSchema: responseSchema
    };

    if (isDeepAnalysis) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: config
    });
    
    const jsonText = response.text?.trim();
    if (!jsonText) {
        if (response.promptFeedback?.blockReason) {
          throw new Error(`A análise foi bloqueada. Motivo: ${response.promptFeedback.blockReason}. Por favor, ajuste o conteúdo e tente novamente.`);
        }
        throw new Error("A IA retornou uma resposta vazia. Isso pode ocorrer devido a filtros de segurança ou um problema temporário. Tente novamente.");
    }

    // Attempt to clean the JSON string by removing markdown fences
    let cleanedJson = jsonText;
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/s;
    const match = cleanedJson.match(jsonRegex);
    if (match && match[1]) {
      cleanedJson = match[1];
    }

    try {
      return JSON.parse(cleanedJson) as FullAnalysis;
    } catch (jsonError: any) {
      console.error("Failed to parse JSON response from Gemini:", jsonError);
      console.error("Original response text:", jsonText);
      throw new Error(`A IA retornou uma resposta mal formatada. Detalhes do erro: ${jsonError.message}`);
    }

  } catch (error: any)
   {
    console.error("Error analyzing transcript with Gemini:", error);
    if (error.message) {
      throw error;
    }
    throw new Error("Ocorreu um erro ao analisar a transcrição. Por favor, tente novamente.");
  }
};