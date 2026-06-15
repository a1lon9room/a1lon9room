import Experience from './Experience.js'

// Alon's recorded intro (ElevenLabs voice). Browsers block audio until the
// user interacts, so it plays on the first click/tap. The calm ambient music
// starts once the intro finishes.
const INTRO_SRC = '/assets/alon-intro.mp3'

export default class Voice
{
    constructor()
    {
        this.experience = new Experience()
        this.targetElement = this.experience.targetElement
        this.played = false

        this.audio = new Audio(INTRO_SRC)
        this.audio.preload = 'auto'
        this.audio.volume = 1.0
        this.audio.addEventListener('ended', () => this.startAmbience())

        this.bind()
    }

    bind()
    {
        const start = () => this.play()

        // First user gesture unlocks audio in every browser
        window.addEventListener('pointerdown', start, { once: true })
        window.addEventListener('keydown', start, { once: true })

        // Optimistic attempt on load (works where autoplay is allowed)
        window.setTimeout(() => this.play(), 600)
    }

    play()
    {
        if(this.played)
            return
        this.played = true

        const playback = this.audio.play()
        if(playback && playback.catch)
        {
            playback.catch(() =>
            {
                // Autoplay was blocked — retry on the next user gesture
                this.played = false
            })
        }

        // Fallback: if the audio can't play at all, still bring in the music
        this.audio.addEventListener('error', () => this.startAmbience(), { once: true })
    }

    // Soft, slow, generative ambient pad (Web Audio) that underlines the cozy
    // night vibe of the room. Original — no audio files involved.
    startAmbience()
    {
        if(this.ambienceStarted)
            return
        this.ambienceStarted = true

        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if(!AudioCtx)
            return

        const ctx = new AudioCtx()
        this.audioCtx = ctx

        // Master chain: gentle low volume through a soft lowpass + slow tremolo
        const master = ctx.createGain()
        master.gain.value = 0.0
        master.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 4)

        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 900
        filter.Q.value = 0.6

        const reverbish = ctx.createGain()
        reverbish.gain.value = 0.8

        filter.connect(master)
        master.connect(ctx.destination)

        // Slow breathing tremolo on the master
        const lfo = ctx.createOscillator()
        const lfoGain = ctx.createGain()
        lfo.frequency.value = 0.08
        lfoGain.gain.value = 0.025
        lfo.connect(lfoGain)
        lfoGain.connect(master.gain)
        lfo.start()

        // A calm chord progression (Am9 — Fmaj7 — Cmaj7 — Gsus) in low octaves
        const chords = [
            [220.0, 261.6, 329.6, 392.0],   // A minor-ish
            [174.6, 220.0, 261.6, 329.6],   // F major 7-ish
            [196.0, 246.9, 293.7, 392.0],   // C/G warmth
            [196.0, 233.1, 293.7, 349.2]    // G sus
        ]

        // Persistent soft pad voices we retune per chord
        const voices = []
        for(let i = 0; i < 4; i++)
        {
            const osc = ctx.createOscillator()
            osc.type = i % 2 === 0 ? 'sine' : 'triangle'
            const g = ctx.createGain()
            g.gain.value = 0.25
            osc.connect(g)
            g.connect(filter)
            osc.frequency.value = chords[0][i]
            osc.start()
            voices.push(osc)
        }

        let step = 0
        const advance = () =>
        {
            step = (step + 1) % chords.length
            const now = ctx.currentTime
            for(let i = 0; i < voices.length; i++)
                voices[i].frequency.setTargetAtTime(chords[step][i], now, 1.4)
        }
        this.ambienceTimer = window.setInterval(advance, 7000)

        // Resume if the context starts suspended (autoplay policy)
        if(ctx.state === 'suspended')
            ctx.resume()
    }
}
