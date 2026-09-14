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

export function useVoiceInput(onFinalResult: (text: string) => void) {
  const supported = useSyncExternalStore(subscribeNever, getSupportedSnapshot, getSupportedServerSnapshot)
  const [listening, setListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalResultRef = useRef(onFinalResult)

  useEffect(() => {
    onFinalResultRef.current = onFinalResult
  }, [onFinalResult])

  const start = useCallback(() => {
    const RecognitionCtor = getSpeechRecognitionConstructor()
    if (!RecognitionCtor) return

    const recognition = new RecognitionCtor()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = event => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        if (result.isFinal) {
          setInterimTranscript('')
          onFinalResultRef.current(transcript.trim())
        } else {
          interim += transcript
        }
      }
      if (interim) setInterimTranscript(interim)
    }
    recognition.onerror = () => {
      setListening(false)
      setInterimTranscript('')
    }
    recognition.onend = () => {
      setListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  return { supported, listening, interimTranscript, start, stop }
}
