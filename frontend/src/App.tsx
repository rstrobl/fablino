import { useState, useEffect, useCallback } from 'react'
import './App.css'

// Components
import { LandingPage } from './components/LandingPage'
import { LoadingPage } from './components/LoadingPage'
import { PreviewPage } from './components/PreviewPage'
import { StoryPlayer } from './components/StoryPlayer'
import { WaitlistForm } from './components/WaitlistForm'
import { ScriptView } from './components/ScriptView'
import { Impressum, Datenschutz } from './components/LegalPages'

// Types and utilities
import type { Story, ScriptPreview, View } from './types'
import { BASE_URL, GENERIC_LOADING, storyUrl } from './utils'

function App() {
  const [initialLoad, setInitialLoad] = useState(() => !!window.location.pathname.match(/\/(story|preview)\//))
  const [view, setView] = useState<View>('home')
  const [prompt, setPrompt] = useState('')
  const [heroName, setHeroName] = useState('')
  const [heroAge, setHeroAge] = useState('')
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [loadingMessages, setLoadingMessages] = useState<string[]>(GENERIC_LOADING)
  const [error, setError] = useState('')
  const [storyDurations, setStoryDurations] = useState<Record<string, number>>({})
  const [previewScript, setPreviewScript] = useState<ScriptPreview | null>(null)
  const [previewJobId, setPreviewJobId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false)
  const [waitlistMsg, setWaitlistMsg] = useState('')
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [reservedStoryId, setReservedStoryId] = useState<string | null>(null)
  const [waitlistChecked, setWaitlistChecked] = useState<string | null>(null)

  // Check waitlist registration for stories without audio
  useEffect(() => {
    if (!currentStory || currentStory.audioUrl || waitlistSubmitted) return;
    if (waitlistChecked === currentStory.id) return;
    setWaitlistChecked(currentStory.id);
    fetch(`/api/waitlist/${currentStory.id}`).then(r => r.json()).then(d => {
      if (d.registered) {
        setWaitlistSubmitted(true);
        setWaitlistMsg('Du bist bereits vorgemerkt! Wir melden uns, sobald dein Hörspiel bereit ist.');
      }
    }).catch(() => {});
  }, [currentStory, waitlistSubmitted, waitlistChecked])

  const navigateFromUrl = useCallback((storiesList?: Story[]) => {
    const list = storiesList || stories

    // Don't interfere with loading
    if (view === 'loading') return

    // Handle /preview/:jobId URLs
    const previewMatch = window.location.pathname.match(/\/preview\/([a-f0-9-]+)/)
    if (previewMatch) {
      const jobId = previewMatch[1]
      fetch(`${BASE_URL}/api/status/${jobId}`)
        .then(r => r.ok ? r.json() : { status: 'not_found' })
        .then(job => {
          if (job.status === 'preview') {
            setPreviewScript(job.script as ScriptPreview)
            setPreviewJobId(jobId)
            setView('preview')
          } else if (job.status === 'done') {
            const story = job.story as Story
            window.history.replaceState({}, '', `/story/${story.id}`)
            setCurrentStory(story)
            setStories(prev => prev.find(s => s.id === story.id) ? prev : [story, ...prev])
            setView('player')
          } else {
            setError(job.status === 'error' ? ((job.error as string) || 'Fehler bei der Generierung') : 'Vorschau nicht gefunden')
            setView('home')
          }
        })
        .catch(() => { setError('Vorschau konnte nicht geladen werden'); setView('home') })
      return
    }

    // Handle /story/:id URLs
    const storyMatch = window.location.pathname.match(/\/story\/([a-f0-9-]+)/)
    if (storyMatch) {
      const id = storyMatch[1]
      let story = list.find(s => s.id === id)
      if (story) {
        setCurrentStory(story)
        setView('player')
        return
      }
      fetch(`${BASE_URL}/api/story/${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(s => {
          if (s) {
            setCurrentStory(s as Story)
            setStories(prev => prev.find(st => st.id === s.id) ? prev : [s, ...prev])
            setView('player')
          } else {
            setError('Geschichte nicht gefunden')
            setView('home')
          }
        })
        .catch(() => { setError('Geschichte konnte nicht geladen werden'); setView('home') })
      return
    }

    // Default: home
    setView('home')
  }, [view, stories])

  // Initial route handling
  useEffect(() => {
    if (!initialLoad) return
    setInitialLoad(false)
    navigateFromUrl()
  }, [initialLoad, navigateFromUrl])

  // Load featured stories
  useEffect(() => {
    fetch('/api/stories')
      .then(r => r.json())
      .then(data => {
        setStories(data as Story[])
        navigateFromUrl(data)
      })
      .catch(() => {})
  }, [navigateFromUrl])

  const goHome = () => {
    setView('home')
    setCurrentStory(null)
    setError('')
    window.history.pushState({}, '', '/')
  }

  const playStory = (story: Story) => {
    setCurrentStory(story)
    setView('player')
    window.history.pushState({}, '', `/story/${story.id}`)
  }

  const generateStory = async () => {
    if (prompt.length < 10) return
    setError('')
    setView('loading')

    try {
      const { heroName: name, heroAge: age } = { heroName, heroAge }
      const body: any = { prompt, ageGroup: (parseInt(age) || 5) <= 5 ? '3-5' : '6-9' }
      if (name) body.characters = { hero: { name, age } }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()

      window.history.pushState({}, '', `/preview/${data.id}`)
      
      let msgIdx = 0
      const interval = setInterval(() => {
        setLoadingMsg(msgIdx % loadingMessages.length)
        msgIdx++
      }, 2000)

      const pollForScript = async () => {
        const statusRes = await fetch(`/api/status/${data.id}`)
        const job = await statusRes.json()

        if (job.status === 'preview') {
          clearInterval(interval)
          setPreviewScript(job.script as ScriptPreview)
          setPreviewJobId(data.id)
          setView('preview')
        } else if (job.status === 'error') {
          clearInterval(interval)
          setError(job.error || 'Fehler bei der Generierung')
          setView('home')
        } else {
          setTimeout(pollForScript, 2000)
        }
      }

      pollForScript()
    } catch {
      setError('Fehler bei der Generierung. Bitte versuche es erneut.')
      setView('home')
    }
  }

  const confirmScript = async () => {
    if (!previewJobId) return
    setConfirming(true)
    try {
      await fetch(`/api/generate/${previewJobId}/confirm`, { method: 'POST' })
      setView('loading')
      setLoadingMessages(['Stimmen werden aufgenommen...', 'Audio wird zusammengemischt...', 'Cover wird gemalt...', 'Fast fertig...'])
      
      let msgIdx = 0
      const interval = setInterval(() => {
        setLoadingMsg(msgIdx % 4)
        msgIdx++
      }, 3000)

      const pollForStory = async () => {
        const statusRes = await fetch(`/api/status/${previewJobId}`)
        const job = await statusRes.json()

        if (job.status === 'done') {
          clearInterval(interval)
          const story = job.story as Story
          window.history.replaceState({}, '', `/story/${story.id}`)
          setCurrentStory(story)
          setStories(prev => prev.find(s => s.id === story.id) ? prev : [story, ...prev])
          setView('player')
          setPreviewScript(null)
          setPreviewJobId(null)
        } else if (job.status === 'error') {
          clearInterval(interval)
          setError(job.error || 'Fehler bei der Audio-Generierung')
          setView('home')
        } else {
          setTimeout(pollForStory, 3000)
        }
      }

      pollForStory()
    } catch {
      setError('Fehler bei der Bestätigung')
      setView('home')
    } finally {
      setConfirming(false)
    }
  }

  const submitWaitlist = async (email: string) => {
    if (!currentStory) return
    
    setWaitlistLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          heroName,
          heroAge,
          prompt: currentStory.prompt,
          storyId: currentStory.id
        })
      })
      
      const data = await res.json()
      
      if (data.ok) {
        setWaitlistSubmitted(true)
        setWaitlistMsg(data.message)
        setWaitlistEmail('')
      } else {
        setError(data.error || 'Fehler beim Eintragen')
      }
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.')
    } finally {
      setWaitlistLoading(false)
    }
  }

  const cancelPreview = () => {
    setView('home')
    setPreviewScript(null)
    setPreviewJobId(null)
    window.history.pushState({}, '', '/')
  }

  return (
    <div className="app">
      {/* HOME */}
      {view === 'home' && (
        <LandingPage
          prompt={prompt}
          setPrompt={setPrompt}
          heroName={heroName}
          setHeroName={setHeroName}
          heroAge={heroAge}
          setHeroAge={setHeroAge}
          stories={stories}
          storyDurations={storyDurations}
          onGenerate={generateStory}
          onPlayStory={playStory}
          setView={setView}
        />
      )}

      {/* LOADING */}
      {view === 'loading' && (
        <LoadingPage message={loadingMessages[loadingMsg]} />
      )}

      {/* PREVIEW */}
      {view === 'preview' && previewScript && (
        <PreviewPage
          script={previewScript}
          onConfirm={confirmScript}
          onCancel={cancelPreview}
          confirming={confirming}
        />
      )}

      {/* PLAYER */}
      {view === 'player' && currentStory && (
        currentStory.audioUrl ? (
          <StoryPlayer story={currentStory} onGoHome={goHome} />
        ) : (
          <WaitlistForm
            story={currentStory}
            stories={stories}
            onSubmitWaitlist={submitWaitlist}
            onPlayStory={playStory}
            waitlistSubmitted={waitlistSubmitted}
            waitlistMsg={waitlistMsg}
            error={error}
          />
        )
      )}

      {/* SCRIPT */}
      {view === 'script' && currentStory && (
        <ScriptView
          story={currentStory}
          onBack={() => {
            window.history.pushState({}, '', `/story/${currentStory.id}`)
            setView('player')
          }}
        />
      )}

      {/* IMPRESSUM */}
      {view === 'impressum' && <Impressum onBack={() => setView('home')} />}

      {/* DATENSCHUTZ */}
      {view === 'datenschutz' && <Datenschutz onBack={() => setView('home')} />}
    </div>
  )
}

export default App