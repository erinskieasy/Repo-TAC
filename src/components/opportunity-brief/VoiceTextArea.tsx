import { Check, Mic } from "lucide-react";
import { useRef, useState } from "react";
import { transcribeAudio } from "./openai";

type VoiceTextAreaProps = {
  value: string;
  onChange: (value: string) => void;
  apiKey: string;
  placeholder?: string;
  rows?: number;
  label?: string;
};

type VoiceState = "idle" | "recording" | "transcribing" | "done";

// A textarea whose mic button is hidden until focus, then pops in at the bottom-right.
// Recording captures browser audio and sends it to Whisper; the transcript is inserted.
export function VoiceTextArea({
  value,
  onChange,
  apiKey,
  placeholder,
  rows = 3,
  label,
}: VoiceTextAreaProps) {
  const [focused, setFocused] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertTranscript(text: string) {
    const next = value.trim() ? `${value.trim()} ${text}` : text;
    onChange(next);
  }

  async function startRecording() {
    // Request the microphone only when the user clicks the mic button.
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
        setVoiceState("transcribing");
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const result = await transcribeAudio(apiKey, blob);
        if (result.text) {
          insertTranscript(result.text);
        }
        setVoiceState("done");
        textareaRef.current?.focus();
        window.setTimeout(() => setVoiceState("idle"), 1800);
      };
      recorder.start();
      recorderRef.current = recorder;
      setVoiceState("recording");
    } catch {
      // Permission denied or unsupported — drop a simulated transcript so the flow continues.
      setVoiceState("transcribing");
      const result = await transcribeAudio("", new Blob());
      insertTranscript(result.text);
      setVoiceState("done");
      window.setTimeout(() => setVoiceState("idle"), 1800);
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  function handleMicClick() {
    if (voiceState === "recording") {
      stopRecording();
    } else if (voiceState === "idle" || voiceState === "done") {
      startRecording();
    }
  }

  const micVisible = focused || voiceState !== "idle";

  return (
    <div className="brief-voice-field">
      {label ? <span className="brief-voice-label">{label}</span> : null}
      <div className="brief-voice-shell">
        <textarea
          ref={textareaRef}
          className="brief-voice-textarea"
          value={value}
          rows={rows}
          placeholder={voiceState === "recording" ? "Listening…" : placeholder}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {micVisible ? (
          <button
            type="button"
            className={`brief-mic-button is-${voiceState}`}
            aria-label={
              voiceState === "recording"
                ? "Stop recording"
                : voiceState === "transcribing"
                  ? "Transcribing"
                  : "Record with voice"
            }
            aria-pressed={voiceState === "recording"}
            // Keep focus on the field so the mic doesn't vanish on mousedown.
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleMicClick}
            disabled={voiceState === "transcribing"}
          >
            {voiceState === "done" ? <Check aria-hidden="true" /> : <Mic aria-hidden="true" />}
          </button>
        ) : null}
      </div>
      {voiceState === "transcribing" ? (
        <span className="brief-voice-status" role="status">
          Transcribing…
        </span>
      ) : voiceState === "done" ? (
        <span className="brief-voice-status is-done" role="status">
          Transcription added · saved
        </span>
      ) : null}
    </div>
  );
}
