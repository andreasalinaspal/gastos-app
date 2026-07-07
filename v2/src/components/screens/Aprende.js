import { useState } from "react";
import { C, FONT_TITLE, cardStyle } from "../../theme";
import { subStyle, subHeader } from "../shared/subnav";
import { LESSONS } from "../../content/lessons";
import { useStore } from "../../state/store";

// Pantalla Aprende (Fase 2.2): lista de micro-lecciones + vista de lección con
// slides y quiz. Completar es opcional — sin streaks, sin bloqueos.
export function AprendeScreen({ subScreen, setSubScreen }) {
  const data = useStore(s => s.data);
  const setData = useStore(s => s.setData);
  const [lessonId, setLessonId] = useState(null); // lección abierta (null = lista)
  const [slideIdx, setSlideIdx] = useState(0);
  const [quizPick, setQuizPick] = useState(null); // índice elegido en el quiz

  const completed = data.education?.completedLessons || [];
  const lesson = LESSONS.find(l => l.id === lessonId) || null;
  const inQuiz = lesson && slideIdx >= lesson.slides.length;

  const openLesson = (id) => { setLessonId(id); setSlideIdx(0); setQuizPick(null); };
  const backToList = () => { setLessonId(null); setSlideIdx(0); setQuizPick(null); };

  const finishLesson = () => {
    const id = lesson.id;
    setData(p => {
      const edu = p.education || { completedLessons: [], quizResult: null, simulatorState: null };
      const done = edu.completedLessons || [];
      if (done.includes(id)) return p;
      return { ...p, education: { ...edu, completedLessons: [...done, id] } };
    });
    backToList();
  };

  const dotCount = lesson ? lesson.slides.length + 1 : 0; // slides + quiz

  return (
    <div style={subStyle(subScreen, "aprende")}>
      {subHeader("Aprende", () => { if (lesson) backToList(); else setSubScreen(null); })}

      {!lesson && (
        <div style={{ padding: "8px 20px 40px" }}>
          <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>
            Historial crediticio sin floro. Lecciones de 2 minutos, a tu ritmo.
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.purple, marginBottom: 16 }}>
            {completed.length} de {LESSONS.length} lecciones completadas
          </div>
          {LESSONS.map(l => {
            const done = completed.includes(l.id);
            return (
              <div key={l.id} onClick={() => openLesson(l.id)} style={{ ...cardStyle, padding: "14px 16px", marginBottom: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: done ? "#E8F5EC" : C.purpleSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{l.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.black, lineHeight: 1.3 }}>{l.title}</div>
                  <div style={{ fontSize: 12, color: done ? C.green : C.muted, fontWeight: 600, marginTop: 2 }}>
                    {done ? "✓ Completada" : `${l.slides.length} pasos + quiz`}
                  </div>
                </div>
                <div style={{ fontSize: 20, color: C.muted, flexShrink: 0 }}>›</div>
              </div>
            );
          })}
        </div>
      )}

      {lesson && (
        <div style={{ padding: "4px 20px 40px", display: "flex", flexDirection: "column", flex: 1 }}>
          {/* Dots de progreso (slides + quiz), misma mecánica del onboarding */}
          <div style={{ display: "flex", justifyContent: "center", gap: 7, margin: "6px 0 18px" }}>
            {Array.from({ length: dotCount }).map((_, i) => (
              <div key={i} style={{ width: i === Math.min(slideIdx, dotCount - 1) ? 22 : 7, height: 7, borderRadius: 4, background: i === Math.min(slideIdx, dotCount - 1) ? C.purple : "#D4D0C8", transition: "all 0.3s" }} />
            ))}
          </div>

          {!inQuiz ? (
            <>
              <div style={{ ...cardStyle, padding: "26px 22px", textAlign: "center" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>{lesson.emoji}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.black, fontFamily: FONT_TITLE, lineHeight: 1.3, marginBottom: 14 }}>{lesson.title}</div>
                <div style={{ fontSize: 15, color: C.black, lineHeight: 1.65 }}>{lesson.slides[slideIdx]}</div>
              </div>
              <div style={{ marginTop: "auto", paddingTop: 20, display: "flex", gap: 10 }}>
                {slideIdx > 0 && (
                  <button onClick={() => setSlideIdx(slideIdx - 1)} style={{ flex: 1, padding: 15, borderRadius: 14, background: "#fff", border: "1.5px solid #D4D0C8", color: C.black, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Atrás</button>
                )}
                <button onClick={() => setSlideIdx(slideIdx + 1)} style={{ flex: 2, padding: 15, borderRadius: 14, background: C.purple, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {slideIdx < lesson.slides.length - 1 ? "Siguiente" : "Ir al quiz →"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ ...cardStyle, padding: "22px 20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: 1.2, marginBottom: 10 }}>QUIZ RÁPIDO</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.black, lineHeight: 1.4, marginBottom: 16 }}>{lesson.quiz.question}</div>
                {lesson.quiz.options.map((opt, i) => {
                  const picked = quizPick !== null;
                  const isCorrect = i === lesson.quiz.correctIndex;
                  const isMine = quizPick === i;
                  let border = "1.5px solid #D4D0C8", bg = "#FAFAF5";
                  if (picked && isCorrect) { border = `2px solid ${C.green}`; bg = "#E8F5EC"; }
                  else if (picked && isMine && !isCorrect) { border = `2px solid ${C.orange}`; bg = "#FDEEE7"; }
                  return (
                    <button key={i} disabled={picked} onClick={() => setQuizPick(i)} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 12, border, background: bg, color: C.black, fontSize: 14, fontWeight: 600, lineHeight: 1.4, cursor: picked ? "default" : "pointer", fontFamily: "inherit", marginBottom: 8, opacity: picked && !isCorrect && !isMine ? 0.55 : 1 }}>
                      {opt}{picked && isCorrect ? " ✓" : picked && isMine ? " ✕" : ""}
                    </button>
                  );
                })}
                {quizPick !== null && (
                  <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 12, background: quizPick === lesson.quiz.correctIndex ? "#E8F5EC" : "#FDEEE7", border: `1.5px solid ${quizPick === lesson.quiz.correctIndex ? C.green : C.orange}` }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: quizPick === lesson.quiz.correctIndex ? C.green : C.orange, marginBottom: 4 }}>
                      {quizPick === lesson.quiz.correctIndex ? "¡Bien ahí! 🎉" : "Casi — así funciona:"}
                    </div>
                    <div style={{ fontSize: 13, color: C.black, lineHeight: 1.55 }}>{lesson.quiz.explanation}</div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: "auto", paddingTop: 20 }}>
                {quizPick !== null && (
                  <button onClick={finishLesson} style={{ width: "100%", padding: 15, borderRadius: 14, background: C.green, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Terminar ✓</button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
