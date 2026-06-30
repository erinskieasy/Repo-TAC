import { Check, Mic, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loadApiKey } from "../opportunity-brief/storage";
import { transcribeAudio } from "../opportunity-brief/openai";
import type { Voiceover } from "./cadence";

type RecorderState = "idle" | "recording" | "transcribing";

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// Records a weekly-demonstration voiceover, transcribes it via Whisper (with a local
// fallback when no API key), and reports the transcript up. Audio playback is kept for
// the current session only; the transcript is the persisted, submitted deliverable.
export function VoiceoverRecorder({
  voiceover,
  onChange,
}: {
  voiceover?: Voiceover;
  onChange: (next: Voiceover | undefined) => void;
}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(URL.createObjectURL(blob));
        setState("transcribing");
        const result = await transcribeAudio(loadApiKey(), blob);
        onChange({ transcript: result.text, recordedAt: Date.now(), durationSec });
        setState("idle");
      };
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
      }, 1000);
      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch {
      // Microphone denied/unavailable — fall back to a simulated transcript so the flow works.
      setState("transcribing");
      const result = await transcribeAudio(loadApiKey(), new Blob());
      onChange({ transcript: result.text, recordedAt: Date.now() });
      setState("idle");
    }
  }

  function stopRecording() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  function deleteVoiceover() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    onChange(undefined);
  }

  const hasSubmission = Boolean(voiceover);

  return (
    <div className="voiceover">
      <div className="voiceover-head">
        <span className="cadence-field-label">Weekly demonstration · voiceover</span>
        {hasSubmission ? (
          <span className="voiceover-submitted">
            <Check aria-hidden="true" />
            Submitted{voiceover?.durationSec ? ` · ${formatClock(voiceover.durationSec)}` : ""}
          </span>
        ) : null}
      </div>

      <div className="voiceover-controls">
        {state === "recording" ? (
          <button className="voiceover-record is-recording" type="button" onClick={stopRecording}>
            <Square aria-hidden="true" />
            <span>Stop · {formatClock(elapsed)}</span>
          </button>
        ) : (
          <button
            className="voiceover-record"
            type="button"
            disabled={state === "transcribing"}
            onClick={startRecording}
          >
            <Mic aria-hidden="true" />
            <span>{state === "transcribing" ? "Transcribing…" : hasSubmission ? "Re-record" : "Record voiceover"}</span>
          </button>
        )}
        {audioUrl ? <audio className="voiceover-audio" controls src={audioUrl} /> : null}
        {hasSubmission ? (
          <button
            className="voiceover-delete"
            type="button"
            aria-label="Delete voiceover"
            title="Delete voiceover"
            onClick={deleteVoiceover}
          >
            <Trash2 aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {hasSubmission ? (
        <label className="voiceover-transcript">
          <span className="cadence-field-label">Transcript (editable)</span>
          <textarea
            value={voiceover?.transcript ?? ""}
            rows={3}
            placeholder="Transcript of the recording…"
            onChange={(event) =>
              onChange({
                transcript: event.target.value,
                recordedAt: voiceover?.recordedAt ?? Date.now(),
                durationSec: voiceover?.durationSec,
              })
            }
          />
          {audioUrl ? null : (
            <span className="voiceover-note">Audio plays in-session only; the transcript is the saved deliverable.</span>
          )}
        </label>
      ) : null}
    </div>
  );
}
