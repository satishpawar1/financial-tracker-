'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// Feature support never changes during a session, so it's read via
// useSyncExternalStore rather than state+effect — this keeps the server-rendered
// pass (no `window`) and the client's first render consistent, avoiding a
// hydration mismatch on whether the mic button appears.
function subscribeNever() {
  return () => {}
}
function getSupportedSnapshot() {
  return getSpeechRecognitionConstructor() !== null
}
function getSupportedServerSnapshot() {
  return false
}

// How long to wait after the last bit of speech before treating the turn as
// finished. `continuous = true` keeps the recognizer alive across a short
// pause ("uh", "um", a breath) instead of the browser ending it there — this
// timer is what actually decides when a sentence is "done", not the browser.
const SILENCE_TIMEOUT_MS = 2000

export function useVoiceInput(onFinalResult: (text: string) => void) {
  const supported = useSyncExternalStore(subscribeNever, getSupportedSnapshot, getSupportedServerSnapshot)
  const [listening, setListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalResultRef = useRef(onFinalResult)
  const finalChunksRef = useRef<string[]>([])
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushedRef = useRef(true)

  useEffect(() => {
    onFinalResultRef.current = onFinalResult
  }, [onFinalResult])

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  // Ends the current turn: stops the recognizer and, unless already flushed
  // (or told not to), sends whatever was captured so far.
  const endTurn = useCallback((send: boolean) => {
    clearSilenceTimer()
    if (!flushedRef.current) {
      flushedRef.current = true
      const text = finalChunksRef.current.join(' ').trim()
      finalChunksRef.current = []
      if (send && text) onFinalResultRef.current(text)
    }
    setInterimTranscript('')
    recognitionRef.current?.stop()
  }, [clearSilenceTimer])

  const scheduleEndTurn = useCallback(() => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(() => endTurn(true), SILENCE_TIMEOUT_MS)
  }, [clearSilenceTimer, endTurn])

  const start = useCallback(() => {
    const RecognitionCtor = getSpeechRecognitionConstructor()
    if (!RecognitionCtor) return

    const recognition = new RecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    finalChunksRef.current = []
    flushedRef.current = false

    recognition.onresult = event => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        if (result.isFinal) {
          finalChunksRef.current.push(transcript.trim())
        } else {
          interim += transcript
        }
      }
      setInterimTranscript([...finalChunksRef.current, interim].filter(Boolean).join(' '))
      scheduleEndTurn()
    }
    recognition.onerror = () => {
      endTurn(true)
      setListening(false)
    }
    recognition.onend = () => {
      endTurn(true)
      setListening(false)
    }

    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
    scheduleEndTurn()
  }, [scheduleEndTurn, endTurn])

  // Manual "I'm done talking" — finalize and send right away instead of
  // waiting out the silence timer.
  const stop = useCallback(() => {
    endTurn(true)
  }, [endTurn])

  // Abort without sending — used when tearing down (closing the drawer,
  // turning voice mode off) rather than ending a turn the user meant to ask.
  const cancel = useCallback(() => {
    endTurn(false)
  }, [endTurn])

  useEffect(() => {
    return () => {
      endTurn(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { supported, listening, interimTranscript, start, stop, cancel }
}
