import { useState, useRef, useCallback } from "react";

const STORAGE_KEY = "psycho_notes_v1";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

async function callClaude(messages, systemPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages,
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "";
}

// ─── Storage ─────────────────────────────────────────────────────────────────

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0e0e10;
    --surface: #17171a;
    --surface2: #1f1f24;
    --border: #2a2a30;
    --accent: #c8f04a;
    --accent2: #7f5af0;
    --text: #e8e8ec;
    --muted: #6b6b78;
    --danger: #ff6b6b;
    --success: #4ade80;
    --radius: 14px;
  }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

  .app {
    min-height: 100vh;
    max-width: 820px;
    margin: 0 auto;
    padding: 0 16px 80px;
    display: flex;
    flex-direction: column;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28px 0 24px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 28px;
  }
  .logo {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 22px;
    letter-spacing: -0.5px;
  }
  .logo span { color: var(--accent); }
  .note-count {
    font-size: 13px;
    color: var(--muted);
    background: var(--surface2);
    padding: 5px 12px;
    border-radius: 20px;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 28px;
    background: var(--surface);
    padding: 5px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
  }
  .tab {
    flex: 1;
    padding: 9px 0;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--muted);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .tab.active {
    background: var(--surface2);
    color: var(--text);
  }
  .tab:hover:not(.active) { color: var(--text); }

  /* Cards */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 14px;
  }
  .card-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 16px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-meta {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 10px;
  }
  .card-summary {
    font-size: 14px;
    line-height: 1.65;
    color: #b0b0bc;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }

  /* Upload zone */
  .upload-zone {
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 24px;
    background: var(--surface);
  }
  .upload-zone:hover, .upload-zone.drag-over {
    border-color: var(--accent);
    background: #c8f04a0d;
  }
  .upload-icon { font-size: 36px; margin-bottom: 10px; }
  .upload-label {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 16px;
    margin-bottom: 6px;
  }
  .upload-hint { font-size: 13px; color: var(--muted); }

  /* Buttons */
  .btn {
    padding: 9px 18px;
    border: none;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.18s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .btn-accent {
    background: var(--accent);
    color: #0e0e10;
  }
  .btn-accent:hover { background: #d4f55a; }
  .btn-ghost {
    background: var(--surface2);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .btn-danger {
    background: transparent;
    color: var(--danger);
    border: 1px solid #ff6b6b44;
  }
  .btn-danger:hover { background: #ff6b6b18; }
  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .btn-sm { padding: 6px 12px; font-size: 13px; }

  /* Tag */
  .tag {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
  }
  .tag-math { background: #7f5af022; color: var(--accent2); border: 1px solid #7f5af044; }
  .tag-english { background: #4ade8022; color: var(--success); border: 1px solid #4ade8044; }
  .tag-verbal { background: #fb923c22; color: #fb923c; border: 1px solid #fb923c44; }
  .tag-general { background: #c8f04a22; color: var(--accent); border: 1px solid #c8f04a44; }

  /* Practice */
  .practice-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px 24px;
    margin-bottom: 14px;
  }
  .question-type {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 12px;
  }
  .question-text {
    font-family: 'Syne', sans-serif;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.5;
    margin-bottom: 20px;
  }
  .options-grid {
    display: grid;
    gap: 10px;
    margin-bottom: 18px;
  }
  .option-btn {
    width: 100%;
    text-align: right;
    padding: 13px 16px;
    border-radius: 10px;
    border: 1.5px solid var(--border);
    background: var(--surface2);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.18s;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .option-btn:hover:not(:disabled) { border-color: var(--accent); }
  .option-btn.correct { border-color: var(--success); background: #4ade8018; color: var(--success); }
  .option-btn.wrong { border-color: var(--danger); background: #ff6b6b18; color: var(--danger); }
  .option-label {
    width: 26px; height: 26px;
    border-radius: 50%;
    background: var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    flex-shrink: 0;
  }

  /* Flashcard */
  .flashcard-wrapper {
    perspective: 1000px;
    margin-bottom: 18px;
  }
  .flashcard {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 40px 24px;
    text-align: center;
    cursor: pointer;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    transition: all 0.2s;
  }
  .flashcard:hover { border-color: var(--accent2); }
  .flashcard-hint { font-size: 12px; color: var(--muted); }
  .flashcard-content { font-size: 18px; line-height: 1.6; font-weight: 500; }
  .flashcard-answer {
    background: #7f5af015;
    border-color: var(--accent2);
    border-width: 1.5px;
  }

  /* Open question */
  .open-question-input {
    width: 100%;
    min-height: 90px;
    padding: 14px;
    border-radius: 10px;
    border: 1.5px solid var(--border);
    background: var(--surface2);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    resize: vertical;
    margin-bottom: 14px;
    transition: border-color 0.2s;
    direction: rtl;
  }
  .open-question-input:focus { outline: none; border-color: var(--accent2); }

  /* Feedback box */
  .feedback-box {
    padding: 14px 16px;
    border-radius: 10px;
    margin-top: 14px;
    font-size: 14px;
    line-height: 1.65;
  }
  .feedback-correct { background: #4ade8018; border: 1px solid #4ade8044; color: var(--success); }
  .feedback-wrong { background: #ff6b6b18; border: 1px solid #ff6b6b44; color: #ff9999; }
  .feedback-neutral { background: var(--surface2); border: 1px solid var(--border); color: var(--text); }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--muted);
  }
  .empty-icon { font-size: 48px; margin-bottom: 14px; }
  .empty-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 8px; }

  /* Loading */
  .spinner {
    display: inline-block;
    width: 18px; height: 18px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Progress bar */
  .progress-bar {
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin-bottom: 22px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  /* Score badge */
  .score-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 28px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    text-align: center;
    margin-bottom: 18px;
  }
  .score-number {
    font-family: 'Syne', sans-serif;
    font-size: 56px;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .score-label { color: var(--muted); font-size: 14px; margin-top: 6px; }

  /* Section title */
  .section-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 18px;
    margin-bottom: 16px;
    color: var(--text);
  }

  /* Practice mode selector */
  .mode-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 24px;
  }
  .mode-card {
    padding: 16px 12px;
    border-radius: var(--radius);
    border: 1.5px solid var(--border);
    background: var(--surface);
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;
  }
  .mode-card:hover { border-color: var(--accent); }
  .mode-card.selected { border-color: var(--accent); background: #c8f04a12; }
  .mode-icon { font-size: 24px; margin-bottom: 8px; }
  .mode-name { font-size: 13px; font-weight: 600; }

  /* Chip */
  .chip-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
  .chip {
    padding: 5px 13px;
    border-radius: 20px;
    border: 1.5px solid var(--border);
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.18s;
  }
  .chip.active { border-color: var(--accent); color: var(--accent); background: #c8f04a12; }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0;
    background: #00000088;
    display: flex; align-items: center; justify-content: center;
    z-index: 100;
    padding: 20px;
  }
  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    width: 100%;
    max-width: 480px;
    max-height: 80vh;
    overflow-y: auto;
  }
  .modal-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 18px;
    margin-bottom: 14px;
  }
  .modal-text { font-size: 14px; line-height: 1.7; color: #b0b0bc; white-space: pre-wrap; }
  .modal-actions { display: flex; gap: 10px; margin-top: 18px; justify-content: flex-end; }

  /* RTL form */
  input[type="text"] {
    width: 100%;
    padding: 11px 14px;
    border-radius: 8px;
    border: 1.5px solid var(--border);
    background: var(--surface2);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    direction: rtl;
    margin-bottom: 12px;
    transition: border-color 0.2s;
  }
  input[type="text"]:focus { outline: none; border-color: var(--accent2); }

  /* Status */
  .status-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--muted);
    margin-bottom: 18px;
  }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }

  @media (max-width: 480px) {
    .mode-grid { grid-template-columns: repeat(3, 1fr); }
    .question-text { font-size: 16px; }
  }
`;

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("library");
  const [notes, setNotes] = useState(loadNotes);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [viewNote, setViewNote] = useState(null);
  const fileInputRef = useRef();

  // Practice state
  const [practiceMode, setPracticeMode] = useState(null); // null = choose, "mc" | "flash" | "open"
  const [practiceNote, setPracticeNote] = useState("all");
  const [question, setQuestion] = useState(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [answered, setAnswered] = useState(null); // { correct: bool, explanation: string }
  const [flashShown, setFlashShown] = useState(false);
  const [openAnswer, setOpenAnswer] = useState("");
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });

  const persistNotes = (n) => { setNotes(n); saveNotes(n); };

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleFiles = useCallback(async (files) => {
    if (!files.length) return;
    setUploading(true);
    const file = files[0];
    const title = uploadTitle.trim() || file.name.replace(/\.[^.]+$/, "");
    setUploadTitle("");

    try {
      const base64 = await fileToBase64(file);
      const mediaType = file.type || "image/jpeg";

      const resp = await callClaude(
        [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: `זהו סיכום לימודי למבחן הפסיכומטרי.
בצע את הדברים הבאים:
1. סכם את כל תוכן הסיכום בעברית בצורה ברורה ומפורטת (אל תוותר על פרטים).
2. זהה את הנושא הראשי (בחר אחד: כמותי/מתמטיקה, אנגלית, מילולי, כללי).
3. רשום 3-5 נקודות המפתח הראשיות.

השב בפורמט JSON בלבד (ללא backticks):
{"summary": "...", "subject": "כמותי|אנגלית|מילולי|כללי", "keyPoints": ["...", "..."]}`
            }
          ]
        }],
        "אתה עוזר ללמידה למבחן פסיכומטרי. ענה אך ורק ב-JSON תקין."
      );

      let parsed;
      try {
        parsed = JSON.parse(resp.trim());
      } catch {
        parsed = { summary: resp, subject: "כללי", keyPoints: [] };
      }

      const newNote = {
        id: Date.now(),
        title,
        subject: parsed.subject || "כללי",
        summary: parsed.summary || "לא ניתן לחלץ תוכן.",
        keyPoints: parsed.keyPoints || [],
        date: new Date().toLocaleDateString("he-IL"),
      };

      persistNotes([newNote, ...notes]);
    } catch (e) {
      alert("שגיאה בעיבוד הקובץ. נסה שוב.");
    } finally {
      setUploading(false);
    }
  }, [notes, uploadTitle]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Practice ────────────────────────────────────────────────────────────────

  const subjectForNote = () => {
    if (practiceNote === "all") return null;
    const n = notes.find(n => String(n.id) === practiceNote);
    return n || null;
  };

  const getContext = () => {
    if (practiceNote === "all") {
      return notes.map(n => `# ${n.title}\n${n.summary}`).join("\n\n---\n\n");
    }
    const n = subjectForNote();
    return n ? `# ${n.title}\n${n.summary}` : "";
  };

  const generateQuestion = async (mode) => {
    setLoadingQ(true);
    setQuestion(null);
    setAnswered(null);
    setFlashShown(false);
    setOpenAnswer("");
    const ctx = getContext();

    let prompt = "";
    if (mode === "mc") {
      prompt = `בהתבסס על החומר הבא, צור שאלה אמריקאית (4 אפשרויות) על נושא כמותי/מתמטיקה.
ענה ב-JSON בלבד: {"question":"...","options":["א","ב","ג","ד"],"correctIndex":0,"explanation":"..."}

חומר:
${ctx}`;
    } else if (mode === "flash") {
      prompt = `בהתבסס על החומר הבא, צור כרטיס זיכרון קצר ותמציתי.
ענה ב-JSON בלבד: {"front":"מושג או נוסחה קצרים","back":"הגדרה או הסבר קצר"}

חומר:
${ctx}`;
    } else if (mode === "open") {
      prompt = `בהתבסס על החומר הבא, צור שאלה פתוחה שדורשת הסבר או פתרון.
ענה ב-JSON בלבד: {"question":"...","idealAnswer":"..."}

חומר:
${ctx}`;
    }

    try {
      const resp = await callClaude(
        [{ role: "user", content: prompt }],
        "אתה מורה לפסיכומטרי. ענה אך ורק ב-JSON תקין ללא backticks."
      );
      const clean = resp.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setQuestion({ ...parsed, mode });
    } catch {
      setQuestion({ mode, error: true, question: "שגיאה ביצירת שאלה, נסה שוב." });
    } finally {
      setLoadingQ(false);
    }
  };

  const checkOpenAnswer = async () => {
    if (!openAnswer.trim()) return;
    setLoadingFeedback(true);
    try {
      const resp = await callClaude(
        [{ role: "user", content: `שאלה: ${question.question}\nתשובה אידיאלית: ${question.idealAnswer}\nתשובת הסטודנט: ${openAnswer}\n\nהעריך את התשובה בקצרה (2-3 משפטים), ציין האם נכונה, ומה חסר אם יש. ענה בעברית.` }],
        "אתה מעריך תשובות למבחן פסיכומטרי. היה ממוקד ועדכותי."
      );
      setAnswered({ feedback: resp, correct: null });
      setSessionScore(s => ({ ...s, total: s.total + 1 }));
    } catch {
      setAnswered({ feedback: "שגיאה בבדיקה.", correct: null });
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleMCAnswer = (idx) => {
    if (answered) return;
    const correct = idx === question.correctIndex;
    setAnswered({ correct, explanation: question.explanation });
    setSessionScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  };

  const subjectTag = (s) => {
    const map = { "כמותי": "tag-math", "מתמטיקה": "tag-math", "אנגלית": "tag-english", "מילולי": "tag-verbal", "כללי": "tag-general" };
    return map[s] || "tag-general";
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{css}</style>
      <div className="app" dir="rtl">
        {/* Header */}
        <div className="header">
          <div className="logo">פסיכו<span>בוט</span></div>
          <div className="note-count">{notes.length} סיכומים</div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab === "library" ? "active" : ""}`} onClick={() => setTab("library")}>📚 ספרייה</button>
          <button className={`tab ${tab === "practice" ? "active" : ""}`} onClick={() => setTab("practice")}>🎯 תרגול</button>
          <button className={`tab ${tab === "upload" ? "active" : ""}`} onClick={() => setTab("upload")}>➕ העלאה</button>
        </div>

        {/* ── LIBRARY TAB ── */}
        {tab === "library" && (
          <div>
            {notes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📂</div>
                <div className="empty-title">הספרייה ריקה</div>
                <p>העלה את הסיכום הראשון שלך דרך טאב ״העלאה״</p>
              </div>
            ) : (
              notes.map(note => (
                <div className="card" key={note.id}>
                  <div className="card-title">
                    {note.title}
                    <span className={`tag ${subjectTag(note.subject)}`}>{note.subject}</span>
                  </div>
                  <div className="card-meta">{note.date}</div>
                  <div className="card-summary">{note.summary}</div>
                  <div className="card-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewNote(note)}>קרא</button>
                    <button className="btn btn-danger btn-sm" onClick={() => persistNotes(notes.filter(n => n.id !== note.id))}>מחק</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── UPLOAD TAB ── */}
        {tab === "upload" && (
          <div>
            <div className="section-title">העלאת סיכום חדש</div>
            {uploading && (
              <div className="status-pill">
                <div className="spinner" style={{ borderTopColor: "var(--accent)" }} />
                מעבד את הסיכום עם Claude...
              </div>
            )}
            <input
              type="text"
              placeholder="שם הסיכום (אופציונלי)"
              value={uploadTitle}
              onChange={e => setUploadTitle(e.target.value)}
            />
            <div
              className={`upload-zone ${dragOver ? "drag-over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <div className="upload-icon">🖼️</div>
              <div className="upload-label">גרור תמונה לכאן או לחץ להעלאה</div>
              <div className="upload-hint">PNG, JPG, WEBP — Claude יקרא ויסכם אוטומטית</div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />

            {notes.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 10 }}>סיכומים שהועלו</div>
                {notes.map(n => (
                  <div className="card" key={n.id} style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{n.title}</span>
                        <span className={`tag ${subjectTag(n.subject)}`}>{n.subject}</span>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => persistNotes(notes.filter(x => x.id !== n.id))}>✕</button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── PRACTICE TAB ── */}
        {tab === "practice" && (
          <div>
            {notes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <div className="empty-title">אין סיכומים לתרגול</div>
                <p>העלה לפחות סיכום אחד כדי להתחיל לתרגל</p>
              </div>
            ) : (
              <>
                {/* Score */}
                {sessionScore.total > 0 && (
                  <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
                    <div className="status-pill">
                      <div className="status-dot" />
                      ציון סשן: {sessionScore.correct}/{sessionScore.total}
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSessionScore({ correct: 0, total: 0 })}>אפס</button>
                  </div>
                )}

                {/* Source filter */}
                <div className="chip-row">
                  <button className={`chip ${practiceNote === "all" ? "active" : ""}`} onClick={() => setPracticeNote("all")}>כל הסיכומים</button>
                  {notes.map(n => (
                    <button key={n.id} className={`chip ${practiceNote === String(n.id) ? "active" : ""}`} onClick={() => setPracticeNote(String(n.id))}>{n.title}</button>
                  ))}
                </div>

                {/* Mode selector */}
                <div className="mode-grid">
                  {[
                    { id: "mc", icon: "🔤", label: "אמריקאית" },
                    { id: "flash", icon: "🃏", label: "פלאשקארד" },
                    { id: "open", icon: "✏️", label: "פתוחה" },
                  ].map(m => (
                    <div key={m.id} className={`mode-card ${practiceMode === m.id ? "selected" : ""}`} onClick={() => { setPracticeMode(m.id); generateQuestion(m.id); }}>
                      <div className="mode-icon">{m.icon}</div>
                      <div className="mode-name">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Question area */}
                {loadingQ && (
                  <div className="practice-card" style={{ textAlign: "center", color: "var(--muted)" }}>
                    <div className="spinner" style={{ borderTopColor: "var(--accent)", width: 28, height: 28 }} />
                    <div style={{ marginTop: 12, fontSize: 14 }}>יוצר שאלה...</div>
                  </div>
                )}

                {question && !loadingQ && (
                  <div className="practice-card">
                    <div className="question-type">
                      {{ mc: "שאלה אמריקאית", flash: "כרטיס זיכרון", open: "שאלה פתוחה" }[question.mode]}
                    </div>

                    {/* MC */}
                    {question.mode === "mc" && (
                      <>
                        <div className="question-text">{question.question}</div>
                        <div className="options-grid">
                          {question.options?.map((opt, i) => {
                            let cls = "";
                            if (answered) {
                              if (i === question.correctIndex) cls = "correct";
                              else if (i === answered.chosen) cls = "wrong";
                            }
                            return (
                              <button key={i} className={`option-btn ${cls}`} disabled={!!answered} onClick={() => { handleMCAnswer(i); setAnswered(prev => ({ ...prev, chosen: i })); }}>
                                <span className="option-label">{["א", "ב", "ג", "ד"][i]}</span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {answered && (
                          <div className={`feedback-box ${answered.correct ? "feedback-correct" : "feedback-wrong"}`}>
                            {answered.correct ? "✅ נכון!" : "❌ לא נכון."} {answered.explanation}
                          </div>
                        )}
                      </>
                    )}

                    {/* Flashcard */}
                    {question.mode === "flash" && (
                      <>
                        <div className={`flashcard ${flashShown ? "flashcard-answer" : ""}`} onClick={() => setFlashShown(!flashShown)}>
                          <div className="flashcard-content">{flashShown ? question.back : question.front}</div>
                          <div className="flashcard-hint">{flashShown ? "📖 תשובה" : "לחץ לחשיפת התשובה"}</div>
                        </div>
                        {flashShown && (
                          <div style={{ display: "flex", gap: 10 }}>
                            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { setSessionScore(s => ({ correct: s.correct + 1, total: s.total + 1 })); generateQuestion("flash"); }}>✅ ידעתי</button>
                            <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => { setSessionScore(s => ({ ...s, total: s.total + 1 })); generateQuestion("flash"); }}>❌ לא ידעתי</button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Open */}
                    {question.mode === "open" && (
                      <>
                        <div className="question-text">{question.question}</div>
                        <textarea
                          className="open-question-input"
                          placeholder="כתוב את תשובתך כאן..."
                          value={openAnswer}
                          onChange={e => setOpenAnswer(e.target.value)}
                          disabled={!!answered}
                        />
                        {!answered && (
                          <button className="btn btn-accent" disabled={loadingFeedback || !openAnswer.trim()} onClick={checkOpenAnswer}>
                            {loadingFeedback ? <><div className="spinner" />בודק...</> : "בדוק תשובה"}
                          </button>
                        )}
                        {answered && (
                          <div className="feedback-box feedback-neutral">💬 {answered.feedback}</div>
                        )}
                      </>
                    )}

                    {/* Next */}
                    {(answered || (question.mode === "flash" && flashShown)) && question.mode !== "flash" && (
                      <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => generateQuestion(question.mode)}>
                        שאלה הבאה ➡️
                      </button>
                    )}
                  </div>
                )}

                {!practiceMode && !loadingQ && !question && (
                  <div className="empty-state" style={{ paddingTop: 20 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>👆</div>
                    <p style={{ color: "var(--muted)" }}>בחר מצב תרגול למעלה</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Note modal */}
      {viewNote && (
        <div className="modal-overlay" onClick={() => setViewNote(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="modal-title">{viewNote.title}</div>
            <span className={`tag ${subjectTag(viewNote.subject)}`} style={{ marginBottom: 14, display: "inline-block" }}>{viewNote.subject}</span>
            {viewNote.keyPoints?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>נקודות מפתח</div>
                {viewNote.keyPoints.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 14, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }}>•</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-text">{viewNote.summary}</div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setViewNote(null)}>סגור</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
