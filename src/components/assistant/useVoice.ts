"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceSession } from "@/app/api/voice/session/route";

export type VoiceState =
  "idle" | "connecting" | "listening" | "thinking" | "speaking" | "recording";
export type VoiceMode = "realtime" | "fallback";

const REALTIME_URL = "https://api.openai.com/v1/realtime/calls";
/** Past this, a WebRTC connection that has not opened falls back to recording. */
const CONNECT_TIMEOUT_MS = 15_000;

type Options = {
  conversationId: string | null;
  onConversation: (id: string) => void;
  /** Something was stored (a transcript, a tool call): reload the conversation. */
  onTurn: (conversationId: string) => void;
  /** Fallback: send the transcribed text through the text assistant; resolves with its answer. */
  sendText: (text: string) => Promise<string>;
  onError: (key: string) => void;
};

type RealtimeEvent = {
  type: string;
  delta?: string;
  transcript?: string;
  item?: { type?: string; call_id?: string; name?: string; arguments?: string };
};

async function postTurn(body: Record<string, unknown>): Promise<{ output?: string }> {
  const res = await fetch("/api/voice/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok ? res.json() : {};
}

/**
 * Talking to the assistant. Realtime: the microphone and the answer stream
 * over WebRTC straight to OpenAI with a one-minute client secret; transcripts
 * and tool calls go through our server (tools run there, writes stay
 * proposals). Fallback (no WebRTC, voice off, connection refused): record,
 * transcribe, answer with the text assistant, read the answer aloud.
 */
export function useVoice({ conversationId, onConversation, onTurn, sendText, onError }: Options) {
  const [state, setState] = useState<VoiceState>("idle");
  const [mode, setMode] = useState<VoiceMode | null>(null);
  const [heard, setHeard] = useState("");
  const [saying, setSaying] = useState("");
  const live = useRef<{
    pc?: RTCPeerConnection;
    stream?: MediaStream;
    audio?: HTMLAudioElement;
    recorder?: MediaRecorder;
    chunks: Blob[];
    conversationId: string | null;
    speak: boolean;
    pendingCalls: Promise<void>[];
  }>({ chunks: [], conversationId, speak: true, pendingCalls: [] });

  useEffect(() => {
    live.current.conversationId = conversationId;
  }, [conversationId]);

  const stop = useCallback(() => {
    const l = live.current;
    if (l.recorder?.state === "recording") l.recorder.stop();
    l.pc?.close();
    l.stream?.getTracks().forEach((t) => t.stop());
    l.audio?.pause();
    Object.assign(l, {
      pc: undefined,
      stream: undefined,
      recorder: undefined,
      chunks: [],
      pendingCalls: [],
    });
    setState("idle");
    setMode(null);
    setHeard("");
    setSaying("");
  }, []);

  useEffect(() => stop, [stop]);

  // ---------- fallback: record → transcribe → text assistant → speech ----------

  const record = useCallback((stream: MediaStream) => {
    const l = live.current;
    const recorder = new MediaRecorder(stream);
    l.recorder = recorder;
    l.chunks = [];
    recorder.ondataavailable = (e) => e.data.size && l.chunks.push(e.data);
    recorder.start();
    setState("recording");
  }, []);

  const sendRecording = useCallback(async () => {
    const l = live.current;
    const recorder = l.recorder;
    if (!recorder || recorder.state !== "recording") return;
    const stopped = new Promise((resolve) => (recorder.onstop = resolve));
    recorder.stop();
    await stopped;
    setState("thinking");
    const form = new FormData();
    form.append("audio", new Blob(l.chunks, { type: recorder.mimeType || "audio/webm" }));
    const res = await fetch("/api/voice/transcribe", { method: "POST", body: form });
    const { text, error } = (await res.json().catch(() => ({}))) as {
      text?: string;
      error?: string;
    };
    if (!res.ok || !text) {
      onError(error ?? "assistant.voice.notHeard");
      if (l.stream) record(l.stream);
      return;
    }
    setHeard(text);
    const answer = await sendText(text);
    setHeard("");
    if (answer && l.speak) {
      const speech = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: answer.slice(0, 1500) }),
      });
      if (speech.ok) {
        setState("speaking");
        const audio = new Audio(URL.createObjectURL(await speech.blob()));
        l.audio = audio;
        await new Promise((resolve) => {
          audio.onended = resolve;
          audio.onerror = resolve;
          audio.play().catch(resolve);
        });
      }
    }
    // Ready for the next question.
    if (l.stream) record(l.stream);
  }, [onError, record, sendText]);

  // ---------- realtime over WebRTC ----------

  const realtime = useCallback(
    async (session: Extract<VoiceSession, { mode: "realtime" }>, stream: MediaStream) => {
      const l = live.current;
      const id = session.conversationId;
      const pc = new RTCPeerConnection();
      l.pc = pc;
      const audio = new Audio();
      audio.autoplay = true;
      l.audio = audio;
      pc.ontrack = (e) => (audio.srcObject = e.streams[0]);
      stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
      const channel = pc.createDataChannel("oai-events");
      const send = (event: object) =>
        channel.readyState === "open" && channel.send(JSON.stringify(event));

      channel.onmessage = (message) => {
        let event: RealtimeEvent;
        try {
          event = JSON.parse(message.data as string);
        } catch {
          return;
        }
        switch (event.type) {
          case "input_audio_buffer.speech_started":
            setState("listening");
            break;
          case "conversation.item.input_audio_transcription.delta":
            setHeard((h) => h + (event.delta ?? ""));
            break;
          case "conversation.item.input_audio_transcription.completed":
            setHeard("");
            if (event.transcript?.trim())
              postTurn({ conversationId: id, kind: "user", text: event.transcript.trim() }).then(
                () => onTurn(id),
              );
            break;
          case "response.created":
            setState("thinking");
            break;
          case "response.output_audio_transcript.delta":
            setState("speaking");
            setSaying((s) => s + (event.delta ?? ""));
            break;
          case "response.output_audio_transcript.done":
            setSaying("");
            if (event.transcript?.trim())
              postTurn({
                conversationId: id,
                kind: "assistant",
                text: event.transcript.trim(),
              }).then(() => onTurn(id));
            break;
          case "response.output_item.done": {
            const item = event.item;
            if (item?.type !== "function_call" || !item.call_id || !item.name) break;
            // Runs on our server, as the user; a write comes back as a pending proposal.
            l.pendingCalls.push(
              postTurn({
                conversationId: id,
                kind: "tool",
                callId: item.call_id,
                name: item.name,
                arguments: item.arguments ?? "{}",
              }).then(({ output }) => {
                send({
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: item.call_id,
                    output: output ?? "{}",
                  },
                });
                onTurn(id);
              }),
            );
            break;
          }
          case "response.done": {
            const calls = l.pendingCalls.splice(0);
            if (calls.length) Promise.all(calls).then(() => send({ type: "response.create" }));
            else setState("listening");
            break;
          }
          case "error":
            console.warn("[voice] realtime error", event);
            break;
        }
      };

      const opened = new Promise<void>((resolve, reject) => {
        channel.onopen = () => resolve();
        setTimeout(() => reject(new Error("timeout")), CONNECT_TIMEOUT_MS);
        pc.onconnectionstatechange = () =>
          pc.connectionState === "failed" && reject(new Error("failed"));
      });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const answer = await fetch(REALTIME_URL, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${session.clientSecret}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!answer.ok) throw new Error(`realtime refused: ${answer.status}`);
      await pc.setRemoteDescription({ type: "answer", sdp: await answer.text() });
      await opened;
      setState("listening");
    },
    [onTurn],
  );

  const start = useCallback(async () => {
    if (state !== "idle") return;
    setState("connecting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setState("idle");
      onError("assistant.voice.noMic");
      return;
    }
    const l = live.current;
    l.stream = stream;
    const res = await fetch("/api/voice/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: l.conversationId }),
    });
    const session = (await res.json().catch(() => ({}))) as VoiceSession & { error?: string };
    if (!res.ok || !("mode" in session)) {
      stop();
      onError(session.error ?? "assistant.voice.failed");
      return;
    }
    l.conversationId = session.conversationId;
    onConversation(session.conversationId);

    const canRealtime = session.mode === "realtime" && typeof RTCPeerConnection !== "undefined";
    if (canRealtime) {
      try {
        setMode("realtime");
        await realtime(session, stream);
        return;
      } catch (e) {
        console.warn("[voice] realtime unavailable, falling back", e);
        l.pc?.close();
        l.pc = undefined;
      }
    }
    l.speak = session.mode === "fallback" ? session.speak : true;
    setMode("fallback");
    record(stream);
  }, [state, onConversation, onError, realtime, record, stop]);

  return { state, mode, heard, saying, start, stop, sendRecording };
}
