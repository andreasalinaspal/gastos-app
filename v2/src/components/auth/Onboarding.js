import { useState } from "react";
import { C, FONT_TITLE, FONT_BODY } from "../../theme";
import { MicIcon } from "../shared/icons";
import { sharedStyle } from "../shared/globalStyles";
import { useStore } from "../../state/store";

// Quiz de diagnóstico (Fase 2.2): 3 preguntas al final de los slides.
// El resultado se guarda temporalmente en localStorage 'qori-quiz-result'
// (el usuario aún no tiene data cargada) y GastosApp lo persiste en
// data.education.quizResult al entrar al app.
const QUIZ_Q1 = { question: "¿Tienes tarjeta de crédito?", options: ["No, ninguna", "Sí, una", "Sí, varias"] };
const QUIZ_Q2_CON_TARJETA = { question: "¿Sabes cuándo es el corte de tu tarjeta?", options: ["¿El qué? 😅", "Más o menos", "Al día, y el de pago también"] };
const QUIZ_Q2_SIN_TARJETA = { question: "¿Qué tanto sabes de tarjetas de crédito?", options: ["Nada aún", "Lo básico", "Bastante"] };
const QUIZ_Q3 = { question: "¿Qué quieres lograr con Qori?", options: ["Ordenar mis gastos", "Construir mi historial", "Dominar mi tarjeta"] };

// Heurística simple: sin tarjeta → "sin-tarjeta"; con tarjeta y dominio alto → "avanzado"; el resto → "tengo-no-domino"
function computeSegment(answers) {
  if (answers[0] === 0) return "sin-tarjeta";
  if (answers[1] === 2) return "avanzado";
  return "tengo-no-domino";
}

export default function Onboarding() {
  const setAuthPhase = useStore(s => s.setAuthPhase);
  const [obSlide, setObSlide] = useState(0);
  const [quizIdx, setQuizIdx] = useState(null); // null = slides; 0..2 = pregunta actual
  const [quizAnswers, setQuizAnswers] = useState([]);

  const finish = () => { localStorage.setItem('qori-onboarding', '1'); setAuthPhase("auth"); };

  const answerQuiz = (idx) => {
    const answers = [...quizAnswers, idx];
    if (quizIdx < 2) { setQuizAnswers(answers); setQuizIdx(quizIdx + 1); return; }
    // Última pregunta: computar segmento y guardar temporalmente
    try {
      localStorage.setItem('qori-quiz-result', JSON.stringify({ segment: computeSegment(answers), answers, date: new Date().toISOString() }));
    } catch (e) {}
    finish();
  };
  const obSlides = [
    {
      bg: C.purple,
      title: "Registra al instante",
      desc: "Di el monto y listo. Qori entiende tu voz y registra tus gastos en segundos.",
      icon: (
        <div style={{ position: "relative", width: 260, height: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
          <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)", animation: "ripple 2s ease-out infinite" }} />
          <div style={{ position: "absolute", width: 175, height: 175, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.22)", animation: "ripple 2s ease-out infinite 0.6s" }} />
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 2 }}>
            <MicIcon size={44} color="#fff" />
          </div>
          <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 700, color: "#fff", animation: "float 3s ease-in-out infinite" }}>🍽️ S/ 25</div>
          <div style={{ position: "absolute", bottom: 22, left: 8, background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontWeight: 700, color: "#fff", animation: "float 3s ease-in-out infinite 1s" }}>🚌 S/ 4.50</div>
          <div style={{ position: "absolute", top: 58, right: 0, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)", animation: "float 3s ease-in-out infinite 0.5s" }}>✅ Guardado</div>
        </div>
      )
    },
    {
      bg: C.green,
      title: "Controla tu mes",
      desc: "Ve tus gastos fijos, ingresos y balance de un vistazo. Sin complicaciones.",
      icon: (
        <div style={{ position: "relative", width: 260, height: 210, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 24, background: "rgba(255,255,255,0.07)" }} />
          <div style={{ position: "absolute", top: 10, right: 12, background: "rgba(255,255,255,0.18)", borderRadius: 14, padding: "10px 14px", animation: "float 3s ease-in-out infinite" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>Balance</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>S/ 1,240</div>
          </div>
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "flex-end", gap: 12, padding: "0 16px 4px" }}>
            {[
              { h: 105, emoji: "🍽️", amt: "S/320", op: 0.25 },
              { h: 68, emoji: "🚌", amt: "S/180", op: 0.32 },
              { h: 88, emoji: "🏠", amt: "S/240", op: 1, white: true },
              { h: 40, emoji: "💊", amt: "S/90", op: 0.25 },
              { h: 28, emoji: "🎉", amt: "S/60", op: 0.2 },
            ].map((b, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>{b.amt}</div>
                <div style={{ width: 34, height: b.h, background: b.white ? "#fff" : `rgba(255,255,255,${b.op})`, borderRadius: "7px 7px 0 0" }} />
                <div style={{ fontSize: 11 }}>{b.emoji}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      bg: C.orange,
      title: "Tu data, segura",
      desc: "Sincronización automática en la nube. Cambia de dispositivo sin perder nada.",
      icon: (
        <div style={{ position: "relative", width: 260, height: 210, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 2.5s ease-in-out infinite", position: "relative", zIndex: 2 }}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
            </svg>
          </div>
          <div style={{ position: "absolute", left: 10, top: 28, background: "rgba(255,255,255,0.18)", borderRadius: 14, padding: "10px 12px", animation: "float 3s ease-in-out infinite", textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>📱</div>
            <div style={{ fontSize: 10, color: "#fff", fontWeight: 700, marginTop: 4 }}>iPhone</div>
          </div>
          <div style={{ position: "absolute", right: 10, top: 28, background: "rgba(255,255,255,0.18)", borderRadius: 14, padding: "10px 12px", animation: "float 3s ease-in-out infinite 1s", textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>💻</div>
            <div style={{ fontSize: 10, color: "#fff", fontWeight: 700, marginTop: 4 }}>Mac</div>
          </div>
          <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.18)", borderRadius: 20, padding: "8px 16px", animation: "float 3s ease-in-out infinite 0.5s", whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>🔒 Cifrado seguro</span>
          </div>
        </div>
      )
    },
  ];
  const slide = obSlides[obSlide];

  // ── Vista de quiz de diagnóstico ──
  if (quizIdx !== null) {
    const q = quizIdx === 0 ? QUIZ_Q1 : quizIdx === 1 ? (quizAnswers[0] === 0 ? QUIZ_Q2_SIN_TARJETA : QUIZ_Q2_CON_TARJETA) : QUIZ_Q3;
    return (
      <div style={{ fontFamily: FONT_BODY, position: "fixed", inset: 0, background: C.purple, display: "flex", flexDirection: "column" }}>
        <style>{sharedStyle}</style>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "60px 32px 20px" }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: "rgba(255,255,255,0.55)", letterSpacing: -1, fontFamily: FONT_TITLE }}>Qori.</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: 1.5, marginBottom: 10 }}>PREGUNTA {quizIdx + 1} DE 3</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1.25, fontFamily: FONT_TITLE }}>{q.question}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => answerQuiz(i)} style={{ width: "100%", padding: "16px 18px", borderRadius: 16, background: "rgba(255,255,255,0.14)", border: "2px solid rgba(255,255,255,0.35)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>{opt}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: "0 32px 52px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: i === quizIdx ? 24 : 8, height: 8, borderRadius: 4, background: i === quizIdx ? "#fff" : "rgba(255,255,255,0.35)", transition: "all 0.3s" }} />)}
          </div>
          <button onClick={finish} style={{ padding: "10px 0", background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Prefiero explorar sola</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT_BODY, position: "fixed", inset: 0, background: slide.bg, display: "flex", flexDirection: "column", transition: "background 0.4s ease" }}>
      <style>{sharedStyle}</style>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 40px 20px", gap: 24 }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: "rgba(255,255,255,0.55)", letterSpacing: -1, alignSelf: "flex-start", fontFamily: FONT_TITLE }}>Qori.</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{slide.icon}</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#fff", marginBottom: 12, lineHeight: 1.2, fontFamily: FONT_TITLE }}>{slide.title}</div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{slide.desc}</div>
        </div>
      </div>
      <div style={{ padding: "0 32px 52px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 4 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: i === obSlide ? 24 : 8, height: 8, borderRadius: 4, background: i === obSlide ? "#fff" : "rgba(255,255,255,0.35)", transition: "all 0.3s" }} />)}
        </div>
        {obSlide < 2 ? (
          <button onClick={() => setObSlide(obSlide + 1)} style={{ width: "100%", padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.4)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Siguiente</button>
        ) : (
          <button onClick={() => setQuizIdx(0)} style={{ width: "100%", padding: 18, borderRadius: 16, background: "#fff", border: "none", color: C.purple, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>Comenzar →</button>
        )}
        <button onClick={finish} style={{ padding: "10px 0", background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Omitir</button>
      </div>
    </div>
  );
}
