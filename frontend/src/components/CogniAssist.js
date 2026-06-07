// src/components/CogniAssist.js — Gemini-powered route chat assistant
import React, { useState, useRef, useEffect } from "react";
import { askCogniAssist } from "../utils/api";
import { formatDuration, formatDistance } from "../utils/api";

const SUGGESTIONS = [
  "Is this route safe?",
  "What's the weather like?",
  "Any toll booths on the way?",
  "Best time to leave?",
  "How's the air quality?",
];

export default function CogniAssist({ selectedRoute, origin, destination }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm CogniAssist 👋 Ask me anything about your route — tolls, weather, safety, fuel stops, anything!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Build route context to send with every question
  const buildContext = () => {
    if (!selectedRoute || !origin || !destination) return null;
    const { cognimapScore, duration, distance, aqi, weather, safetyReports } = selectedRoute;
    const eta = new Date(Date.now() + duration * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      origin: origin.displayName || origin.shortName,
      destination: destination.displayName || destination.shortName,
      duration: formatDuration(duration),
      distance: formatDistance(distance),
      score: cognimapScore.score,
      grade: cognimapScore.grade,
      aqi: aqi?.aqi,
      aqiLabel: aqi?.label,
      weatherDesc: weather?.description,
      temp: weather?.temp,
      humidity: weather?.humidity,
      windSpeed: weather?.windSpeed?.toFixed(1),
      weatherRisk: weather?.risk,
      safetyReports,
      eta,
    };
  };

  const sendMessage = async (text) => {
    const q = text || input.trim();
    if (!q) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const { answer } = await askCogniAssist(q, buildContext());
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, something went wrong. Try again!" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating chat button */}
      <button
        className={`cogniassist-fab ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Ask CogniAssist"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.06L2 22l4.94-1.37A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        )}
        {!open && <span className="cogniassist-label">Ask AI</span>}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="cogniassist-panel">
          <div className="cogniassist-header">
            <div className="cogniassist-title">
              <span className="cogniassist-dot" />
              CogniAssist
            </div>
            <span className="cogniassist-sub">Powered by Gemini</span>
          </div>

          <div className="cogniassist-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ca-msg ca-msg-${msg.role}`}>
                {msg.role === "assistant" && <span className="ca-avatar">✦</span>}
                <div className="ca-bubble">{msg.text}</div>
              </div>
            ))}
            {loading && (
              <div className="ca-msg ca-msg-assistant">
                <span className="ca-avatar">✦</span>
                <div className="ca-bubble ca-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions — shown only when no route context typed yet */}
          {messages.length <= 1 && (
            <div className="ca-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="ca-suggestion-btn" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="cogniassist-input-row">
            <input
              className="cogniassist-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
              placeholder="Ask anything about your route…"
              disabled={loading}
            />
            <button
              className="cogniassist-send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}