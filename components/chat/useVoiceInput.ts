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

interface SpeechRecognitionErrorEventLike {
  error: string
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
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
// finished — this timer, not the browser, decides when a sentence is "done".
const SILENCE_TIMEOUT_MS = 2000

// Chrome (and others) end the underlying recognition session on their own
// after a pause, even with continuous=true — long before our own silence
// timer fires. If we treated every `onend` as "the turn is over" we'd send
// on the browser's schedule instead of ours, cutting sentences short. So
// `onend` only finalizes when *we* already decided the turn was done
// (sessionActiveRef false); otherwise it's the browser jumping the gun, and
// we silently restart recognition underneath so the user never notices.
const MAX_AUTO_RESTARTS = 6

export function useVoiceInput(onFinalResult: (text: string) => void) {
  const supported = useSyncExternalStore(subscribeNever, getSupportedSnapshot, getSupportedServerSnapshot)
  const [listening, setListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalResultRef = useRef(onFinalResult)
  const finalChunksRef = useRef<string[]>([])
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionActiveRef = useRef(false)
  const restartCountRef = useRef(0)

  useEffect(() => {
    onFinalResultRef.current = onFinalResult
  }, [onFinalResult])

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  // Ends the turn for real: stops the recognizer and, unless told not to,
  // sends whatever was captured so far.
  const finalize = useCallback((send: boolean) => {
    clearSilenceTimer()
    sessionActiveRef.current = false
    const text = finalChunksRef.current.join(' ').trim()
    finalChunksRef.current = []
    setInterimTranscript('')
    setListening(false)
    recognitionRef.current?.stop()
    if (send && text) onFinalResultRef.current(text)
  }, [clearSilenceTimer])

  const scheduleFinalize = useCallback(() => {
    clearSilenceTimer()
    silenceTimerRef.current = setTimeout(() => finalize(true), SILENCE_TIMEOUT_MS)
  }, [clearSilenceTimer, finalize])

  const createRecognition = useCallback((): SpeechRecognitionLike | null => {
    const RecognitionCtor = getSpeechRecognitionConstructor()
    if (!RecognitionCtor) return null

    const recognition = new RecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = event => {
      restartCountRef.current = 0
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
      scheduleFinalize()
    }
    recognition.onerror = event => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        finalize(true)
      }
      // Other errors (no-speech, network, aborted) are followed by onend,
      // which decides whether to restart or finalize.
    }
    recognition.onend = () => {
      if (!sessionActiveRef.current) return

      if (restartCountRef.current >= MAX_AUTO_RESTARTS) {
        finalize(true)
        return
      }
      restartCountRef.current += 1

      const next = createRecognition()
      if (!next) {
        finalize(true)
        return
      }
      recognitionRef.current = next
      try {
        next.start()
      } catch {
        finalize(true)
      }
    }

    return recognition
  }, [scheduleFinalize, finalize])

  const start = useCallback(() => {
    const recognition = createRecognition()
    if (!recognition) return

    finalChunksRef.current = []
    restartCountRef.current = 0
    sessionActiveRef.current = true
    recognitionRef.current = recognition
    setListening(true)
    try {
      recognition.start()
    } catch {
      finalize(false)
      return
    }
    scheduleFinalize()
  }, [createRecognition, scheduleFinalize, finalize])

  // Manual "I'm done talking" — finalize and send right away instead of
  // waiting out the silence timer.
  const stop = useCallback(() => {
    finalize(true)
  }, [finalize])

  // Abort without sending — used when tearing down (closing the drawer,
  // turning voice mode off) rather than ending a turn the user meant to ask.
  const cancel = useCallback(() => {
    finalize(false)
  }, [finalize])

  useEffect(() => {
    return () => {
      finalize(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { supported, listening, interimTranscript, start, stop, cancel }
}
