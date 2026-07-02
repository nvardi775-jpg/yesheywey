import express from "express";
import { createServer as createViteServer } from "vite";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";

const app = express();
app.use(express.json());

// Initialize SQLite database
let db: any;
const dbPromise = (async () => {
  try {
    db = await open({
      filename: path.join(process.cwd(), 'database.sqlite'),
      driver: sqlite3.Database
    });
  } catch (err: any) {
    console.error("Failed to open physical SQLite database, falling back to in-memory database:", err);
    db = await open({
      filename: ':memory:',
      driver: sqlite3.Database
    });
  }

  try {
    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT,
        role TEXT,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        patientName TEXT,
        age TEXT,
        sex TEXT,
        address TEXT,
        complaint TEXT,
        symptoms TEXT,
        selectedSymptoms TEXT,
        tongue TEXT,
        pulse TEXT,
        diagnosis TEXT,
        timestamp INTEGER,
        medicalHistory TEXT,
        biomedicalDiagnosis TEXT,
        icd10 TEXT
      );
    `);

    // Seed default admin if not exists
    const adminExists = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!adminExists) {
      await db.run('INSERT INTO users (username, password, role, createdAt) VALUES (?, ?, ?, ?)', ['admin', '', 'admin', Date.now()]);
    }
  } catch (err: any) {
    console.error("Failed to initialize database tables or seed data:", err);
  }
})();

// Ensure database is initialized before handling requests
app.use(async (req, res, next) => {
  await dbPromise;
  next();
});

// Lazy initializer helper
function getGeminiClient(apiKeys?: any[]) {
  let keyToUse = "";
  if (apiKeys && apiKeys.length > 0) {
    const availableKey = apiKeys.find((k: any) => !k.isExhausted && k.key && k.key.trim() !== "");
    if (availableKey) {
      keyToUse = availableKey.key;
    }
  }

  if (!keyToUse) {
    keyToUse = process.env.GEMINI_API_KEY || "";
  }

  if (!keyToUse) {
    throw new Error("No Gemini API key found. Silakan tambahkan API Key di menu Settings.");
  }

  return new GoogleGenAI({
    apiKey: keyToUse,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

  // Tongue Analysis Proxy
  app.post("/api/gemini/analyze-tongue", async (req, res) => {
    try {
      const { base64Image, apiKeys } = req.body;
      if (!base64Image) {
        res.status(400).json({ error: "Image data is required" });
        return;
      }

      const ai = getGeminiClient(apiKeys);
      
      const [mimeTypePrefix, base64Data] = base64Image.split(';base64,');
      const mimeType = mimeTypePrefix ? mimeTypePrefix.split(':')[1] : "image/jpeg";

      const prompt = `
  Kamu adalah ahli diagnosis lidah TCM (Traditional Chinese Medicine) tingkat profesor.
  Analisis foto lidah ini dengan sangat detail dan akurat.
  Jawab dalam Bahasa Indonesia, format:

  1. Warna badan lidah: ...
  2. Warna lapisan/sabur: ...
  3. Kualitas sabur: ...
  4. Fitur khusus: (crack, teeth marks, red points, deviated, swollen, thin, dll)
  5. Kesimpulan pola utama: (contoh: Kidney Yin Deficiency with Empty Heat, Spleen Qi Deficiency with Dampness, Liver Fire, dll)
  6. Rekomendasi titik akupuntur tambahan (3-5 titik): ...

  Hanya jawab berdasarkan foto lidah ini, jangan tambah-tambah.
  `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        },
        config: {
          maxOutputTokens: 1024,
          temperature: 0.1,
        }
      });

      res.json({ text: response.text || "Maaf, tidak dapat menganalisis gambar ini." });
    } catch (e: any) {
      console.error("Server Tongue Analysis Error:", e);
      res.status(500).json({ error: e.message || "Gagal melakukan analisis lidah." });
    }
  });

  // Diagnose/Chat Proxy
  app.post("/api/gemini/diagnose", async (req, res) => {
    try {
      const { message, image, history, language, cdssAnalysis, apiKeys } = req.body;
      
      const ai = getGeminiClient(apiKeys);

      const parts: any[] = [{ text: message }];
      if (image) {
        const mimeType = image.split(';')[0].split(':')[1];
        const base64Data = image.split(',')[1];
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data
          }
        });
      }

      const historyParts = (history || [])
        .filter((msg: any) => (msg.role === 'user' || msg.role === 'model') && !msg.isError)
        .slice(-6)
        .map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text.substring(0, 1000) }]
        }));

      const contents = [
        ...historyParts,
        { role: 'user', parts }
      ];

      const topSyndrome = cdssAnalysis && cdssAnalysis.length > 0 ? cdssAnalysis[0].syndrome : null;
      const tpContext = topSyndrome?.treatment_principle?.length ? `\nPRINSIP TERAPI DARI CDSS: ${topSyndrome.treatment_principle.join(', ')}` : '';
      const herbContext = topSyndrome?.herbal_prescription ? `\nRESEP KLASIK DARI CDSS: ${topSyndrome.herbal_prescription}` : '';

      const systemInstruction = `Anda adalah Pakar Senior TCM (Giovanni Maciocia). 
Tugas: Diagnosis instan dalam JSON.
WAJIB: 10-12 titik akupunktur + Master Tung jika relevan.
ANALISIS: Pisahkan BEN (Akar) dan BIAO (Cabang).
SKOR: Sertakan "score" (0-100) untuk setiap item diferensiasi.${tpContext}${herbContext}
Gunakan PRINSIP TERAPI dan RESEP KLASIK dari CDSS jika tersedia.
Lakukan diferensiasi 8 Prinsip dan Organ Zang-Fu.
OBESITAS: Berikan analisis jika ada indikasi.
KECANTIKAN: Berikan saran jika relevan.

Bahasa: ${language || "English"}.
HANYA kembalikan JSON. Jangan ada teks lain sebelum atau sesudah JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              conversationalResponse: { type: Type.STRING },
              diagnosis: {
                type: Type.OBJECT,
                properties: {
                  patternId: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  differentiation: {
                    type: Type.OBJECT,
                    properties: {
                      ben: { 
                        type: Type.ARRAY, 
                        items: { 
                          type: Type.OBJECT,
                          properties: {
                            label: { type: Type.STRING },
                            value: { type: Type.STRING },
                            score: { type: Type.NUMBER }
                          }
                        }
                      },
                      biao: { 
                        type: Type.ARRAY, 
                        items: { 
                          type: Type.OBJECT,
                          properties: {
                            label: { type: Type.STRING },
                            value: { type: Type.STRING },
                            score: { type: Type.NUMBER }
                          }
                        }
                      }
                    }
                  },
                  treatment_principle: { type: Type.ARRAY, items: { type: Type.STRING } },
                  classical_prescription: { type: Type.STRING },
                  recommendedPoints: { 
                    type: Type.ARRAY, 
                    items: { 
                      type: Type.OBJECT,
                      properties: {
                        code: { type: Type.STRING },
                        description: { type: Type.STRING }
                      }
                    }
                  },
                  masterTungPoints: { 
                    type: Type.ARRAY, 
                    items: { 
                      type: Type.OBJECT,
                      properties: {
                        code: { type: Type.STRING },
                        description: { type: Type.STRING }
                      }
                    }
                  },
                  wuxingElement: { type: Type.STRING },
                  lifestyleAdvice: { type: Type.STRING },
                  herbal_recommendation: { 
                    type: Type.OBJECT,
                    properties: {
                      formula_name: { type: Type.STRING },
                      chief: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                  },
                  obesity_indication: { type: Type.STRING },
                  beauty_acupuncture: { type: Type.STRING }
                }
              }
            }
          },
          temperature: 0.1,
          maxOutputTokens: 4096,
        }
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error("Server Diagnostics Error:", e);
      res.status(500).json({ error: e.message || "Gagal memproses diagnosis dari AI." });
    }
  });

  // --- API Routes ---

  // Users API
  app.get("/api/users", async (req, res) => {
    try {
      const users = await db.all('SELECT * FROM users');
      res.json(users || []);
    } catch (e: any) {
      console.error("GET /api/users error:", e);
      res.status(500).json({ error: e.message || "Failed to retrieve users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    const { username, password, role, createdAt } = req.body;
    try {
      await db.run('INSERT INTO users (username, password, role, createdAt) VALUES (?, ?, ?, ?)', [username, password, role, createdAt]);
      res.json({ success: true });
    } catch (e: any) {
      console.error("POST /api/users error:", e);
      res.status(400).json({ error: e.message || 'User already exists' });
    }
  });

  app.delete("/api/users/:username", async (req, res) => {
    try {
      await db.run('DELETE FROM users WHERE username = ?', [req.params.username]);
      res.json({ success: true });
    } catch (e: any) {
      console.error("DELETE /api/users/:username error:", e);
      res.status(500).json({ error: e.message || "Failed to delete user" });
    }
  });

  // Patients API
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await db.all('SELECT * FROM patients ORDER BY timestamp DESC');
      // Parse JSON fields back to objects
      const parsedPatients = (patients || []).map(p => ({
        ...p,
        selectedSymptoms: JSON.parse(p.selectedSymptoms || '[]'),
        tongue: JSON.parse(p.tongue || '{}'),
        pulse: JSON.parse(p.pulse || '{}'),
        diagnosis: JSON.parse(p.diagnosis || '{}')
      }));
      res.json(parsedPatients);
    } catch (e: any) {
      console.error("GET /api/patients error:", e);
      res.status(500).json({ error: e.message || "Failed to retrieve patients" });
    }
  });

  app.post("/api/patients", async (req, res) => {
    const p = req.body;
    try {
      await db.run(`
        INSERT OR REPLACE INTO patients (id, patientName, age, sex, address, complaint, symptoms, selectedSymptoms, tongue, pulse, diagnosis, timestamp, medicalHistory, biomedicalDiagnosis, icd10)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        p.id, p.patientName, p.age, p.sex, p.address, p.complaint, p.symptoms,
        JSON.stringify(p.selectedSymptoms), JSON.stringify(p.tongue), JSON.stringify(p.pulse),
        JSON.stringify(p.diagnosis), p.timestamp, p.medicalHistory, p.biomedicalDiagnosis, p.icd10
      ]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Server save patient error:', e);
      res.status(500).json({ error: e.message || 'Failed to save patient' });
    }
  });

  app.delete("/api/patients/:id", async (req, res) => {
    try {
      await db.run('DELETE FROM patients WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e: any) {
      console.error("DELETE /api/patients/:id error:", e);
      res.status(500).json({ error: e.message || "Failed to delete patient" });
    }
  });

async function startServer() {
  if (!process.env.VERCEL) {
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
