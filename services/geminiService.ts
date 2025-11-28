
import { GoogleGenAI, Type, File as GeminiFile } from "@google/genai";
import type { FullAnalysis } from '../types';

// FIX: Per coding guidelines, the API key must be obtained from process.env.API_KEY.
// This also resolves the TypeScript error 'Property 'env' does not exist on type 'ImportMeta''.
// WORKAROUND: Provide an empty requestOptions object to prevent a suspected SDK bug
// in the file deletion method, which may be unsafely destructuring this property.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, requestOptions: {} });

/**
 * Polls the Gemini API until the file is in the ACTIVE state.
 * This is crucial for video files which require processing time on the server.
 */
const waitForFileActive = async (file: GeminiFile): Promise<GeminiFile> => {
    let currentFile = file;
    const maxRetries = 120; // Wait up to 4 minutes (2s interval)
    let retries = 0;

    console.log(`Aguardando processamento do arquivo: ${file.name} (Estado inicial: ${file.state})`);

    // If already active, return immediately
    if (currentFile.state === "ACTIVE") {
        return currentFile;
    }

    while (currentFile.state === 'PROCESSING' && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
            currentFile = await ai.files.get({ name: file.name });
            console.log(`Verificando estado do arquivo ${file.name}: ${currentFile.state}`);
        } catch (e) {
            console.warn("Erro temporário ao verificar estado do arquivo, tentando novamente...", e);
        }
        retries++;
    }

    if (currentFile.state !== 'ACTIVE') {
        throw new Error(`O arquivo não pôde ser processado a tempo. Estado final: ${currentFile.state}`);
    }

    console.log(`Arquivo processado e pronto para uso: ${currentFile.name}`);
    return currentFile;
};

/**
 * Uploads a file to the Gemini API for later processing.
 * This is used for large files to avoid loading them into memory.
 * @param file The file to upload.
 * @returns A promise that resolves to the uploaded file's metadata from Gemini.
 */
export const uploadFileToGemini = async (file: File): Promise<GeminiFile> => {
    if (!navigator.onLine) {
      throw new Error("Você parece estar offline. O envio de arquivos requer uma conexão com a internet.");
    }
    try {
      console.log(`Iniciando upload do arquivo: ${file.name}`);
      const uploadedFile = await ai.files.upload({
        file: file,
        displayName: file.name,
      });
      console.log(`Arquivo enviado ${uploadedFile.displayName} como: ${uploadedFile.name}`);
      
      // Wait for the file to be processed and become ACTIVE
      const activeFile = await waitForFileActive(uploadedFile);
      
      return activeFile;
    } catch (e: any) {
      console.error("Error uploading file to Gemini:", e);
      throw new Error(`Falha ao enviar o arquivo para a IA. ${e.message || "Erro desconhecido."}`);
    }
};

/**
 * Deletes a file from the Gemini API storage.
 * Used to clean up temporary files after analysis is complete.
 * @param fileName The name of the file to delete (e.g., 'files/your-file-id').
 */
export const deleteGeminiFile = async (fileName: string): Promise<void> => {
    try {
        // FIX: The delete method expects an object with the 'name' property.
        await ai.files.delete({ name: fileName });
        console.log(`Arquivo temporário ${fileName} deletado com sucesso.`);
    } catch (e: any) {
        // Log the error but don't re-throw, as this is a non-critical cleanup operation
        console.error(`Falha ao deletar o arquivo temporário ${fileName}:`, e);
    }
};


// Define the response schema for consistent JSON output
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.OBJECT,
            properties: {
                key_points: {
                    type: Type.ARRAY,
                    description: "Lista dos pontos-chave discutidos na reunião, cada um com seu respectivo timestamp.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            point: { type: Type.STRING, description: "O ponto-chave ou decisão." },
                            timestamp: { type: Type.STRING, description: "O timestamp (HH:MM:SS) de quando o ponto foi discutido." },
                        },
                        required: ["point", "timestamp"],
                     },
                },
                action_items: {
                    type: Type.ARRAY,
                    description: "Lista de ações a serem tomadas com responsáveis e timestamps.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            action: { type: Type.STRING, description: "A tarefa ou ação a ser executada." },
                            responsible: { type: Type.STRING, description: "A pessoa ou grupo responsável pela ação." },
                            timestamp: { type: Type.STRING, description: "O timestamp (HH:MM:SS) de quando a ação foi definida." },
                        },
                        required: ["action", "responsible", "timestamp"],
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


export const analyzeAudioAndTranscript = async (media: { mimeType: string, data?: string, uri?: string }, isDeepAnalysis: boolean = false): Promise<FullAnalysis> => {
  if (!navigator.onLine) {
    throw new Error("Você parece estar offline. Verifique sua conexão e tente novamente.");
  }

  try {
    let mediaPart;
    if (media.uri) {
        mediaPart = {
            fileData: {
                mimeType: media.mimeType,
                fileUri: media.uri,
            },
        };
    } else if (media.data) {
        mediaPart = {
            inlineData: {
                mimeType: media.mimeType,
                data: media.data,
            },
        };
    } else {
        throw new Error("Nem dados de mídia nem URI foram fornecidos para análise.");
    }


    const textPart = {
      text: `Sua tarefa é analisar a gravação (áudio ou vídeo) de uma reunião e gerar um resumo estruturado e uma transcrição completa em formato JSON.

Siga estas instruções rigorosamente:
1.  **Idioma:** Toda a sua resposta deve ser em português do Brasil.
2.  **Formato de Saída:** A saída DEVE ser um objeto JSON válido que corresponda ao schema fornecido. Não inclua nenhum texto ou formatação fora do objeto JSON (como '`+"`"+`json').
3.  **Análise do Conteúdo:**
    *   **Resumo (summary):**
        *   'key_points': Identifique e liste os pontos mais importantes e as decisões tomadas. Para cada item, inclua o texto do ponto ('point') e o 'timestamp' (HH:MM:SS) exato de quando ele foi mencionado na gravação.
        *   'action_items': Liste todas as tarefas ou ações definidas. Para cada item, especifique a ação ('action'), quem é o 'responsible' e o 'timestamp' (HH:MM:SS) exato de quando a ação foi definida na gravação.
    *   **Transcrição (transcript):**
        *   Transcreva a conversa na íntegra.
        *   Identifique cada locutor de forma consistente (ex: "Locutor A", "Locutor B").
        *   Forneça um 'timestamp' (HH:MM:SS) para o início de cada fala.
        *   **CRÍTICO:** Se um locutor se repetir ou gaguejar, transcreva o que foi dito de forma natural, mas evite gerar laços de repetição infinitos ou excessivamente longos. A transcrição deve ser um reflexo fiel, mas legível, da conversa.

Analise a gravação fornecida e gere o JSON.`,
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
        // FIX: The `contents` field for a request should be an array of `Content` objects.
        // Wrapping the parts in an array ensures the correct structure for multimodal requests.
        contents: [{ parts: [mediaPart, textPart] }],
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
    console.error("Error analyzing media with Gemini:", error);
    if (error.message) {
      throw error;
    }
    throw new Error("Ocorreu um erro ao analisar a mídia. Por favor, tente novamente.");
  }
};


export const analyzeTranscript = async (transcript: string, isDeepAnalysis: boolean = false): Promise<FullAnalysis> => {
   if (!navigator.onLine) {
    throw new Error("Você parece estar offline. Verifique sua conexão e tente novamente.");
  }
  
  try {
    const prompt = `Sua tarefa é analisar a transcrição de uma reunião e gerar um resumo estruturado e uma versão formatada da transcrição em JSON.

A transcrição bruta para análise é:
---
${transcript}
---

Siga estas instruções rigorosamente:
1.  **Idioma:** Toda a sua resposta deve ser em português do Brasil.
2.  **Formato de Saída:** A saída DEVE ser um objeto JSON válido que corresponda ao schema fornecido. Não inclua nenhum texto ou formatação fora do objeto JSON (como '`+"`"+`json').
3.  **Análise do Conteúdo:**
    *   **Resumo (summary):**
        *   'key_points': Com base na transcrição, identifique e liste os pontos mais importantes e as decisões tomadas. Para cada item, inclua o texto do ponto ('point') e o 'timestamp' (HH:MM:SS) aproximado de quando ele foi mencionado, baseado na transcrição.
        *   'action_items': Liste todas as tarefas ou ações definidas na transcrição. Para cada item, especifique a ação ('action'), quem é o 'responsible' e o 'timestamp' (HH:MM:SS) aproximado de quando a ação foi definida.
    *   **Transcrição (transcript):**
        *   Formate a transcrição fornecida.
        *   Tente identificar e separar os diferentes locutores de forma consistente (ex: "Locutor A", "Locutor B").
        *   Gere timestamps aproximados (HH:MM:SS) para cada fala, baseando-se na ordem da conversa.
        *   O texto de cada fala deve ser fiel à transcrição original.

Analise a transcrição fornecida e gere o JSON.`;
    
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
