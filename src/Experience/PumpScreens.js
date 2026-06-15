import * as THREE from 'three'

import Experience from './Experience.js'

// Watched token: live data pulled from the DexScreener public API
const TOKEN_ADDRESS = 'CTEQjcZwFfsLavSWSiQn4VYKgYXqnevUdxfcbLELpump'
const DEX_API = 'https://api.dexscreener.com/latest/dex/tokens/' + TOKEN_ADDRESS
const FETCH_INTERVAL = 30000

// Animated dashboards rendered to canvas textures: the desk monitor shows a
// DexScreener view of the watched token, the laptop a pump.fun launchpad.
export default class PumpScreens
{
    constructor()
    {
        this.experience = new Experience()
        this.resources = this.experience.resources
        this.scene = this.experience.scene
        this.time = this.experience.time

        this.lastDraw = 0
        this.lastCandle = 0
        this.lastFetch = -Infinity

        this.dex = {
            status: 'loading',
            symbol: null,
            priceUsd: null,
            change24h: null,
            volume24h: null,
            liquidity: null,
            marketCap: null,
            buys: null,
            sells: null
        }

        this.setTrading()
        this.setLaunchpad()
        this.fetchDex()
    }

    fetchDex()
    {
        fetch(DEX_API)
            .then(response => response.json())
            .then(data =>
            {
                const pair = data && data.pairs && data.pairs[0]

                if(!pair)
                {
                    this.dex.status = 'waiting'
                    this.drawTrading()
                    return
                }

                this.dex.status = 'live'
                this.dex.symbol = pair.baseToken && pair.baseToken.symbol ? pair.baseToken.symbol : 'TOKEN'
                this.dex.priceUsd = parseFloat(pair.priceUsd)
                if(!isNaN(this.dex.priceUsd))
                    this.onPrice(this.dex.priceUsd)
                this.dex.change24h = pair.priceChange ? pair.priceChange.h24 : null
                this.dex.volume24h = pair.volume ? pair.volume.h24 : null
                this.dex.liquidity = pair.liquidity ? pair.liquidity.usd : null
                this.dex.marketCap = pair.marketCap || pair.fdv || null
                this.dex.buys = pair.txns && pair.txns.h24 ? pair.txns.h24.buys : null
                this.dex.sells = pair.txns && pair.txns.h24 ? pair.txns.h24.sells : null
                this.drawTrading()
            })
            .catch(() =>
            {
                if(this.dex.status === 'loading')
                    this.dex.status = 'waiting'
                this.drawTrading()
            })
    }

    formatUsd(_value)
    {
        if(_value === null || _value === undefined || isNaN(_value))
            return '—'
        if(_value >= 1e9) return '$' + (_value / 1e9).toFixed(2) + 'B'
        if(_value >= 1e6) return '$' + (_value / 1e6).toFixed(2) + 'M'
        if(_value >= 1e3) return '$' + (_value / 1e3).toFixed(1) + 'K'
        return '$' + _value.toFixed(2)
    }

    formatPrice(_value)
    {
        if(_value === null || _value === undefined || isNaN(_value))
            return '—'
        if(_value >= 1) return '$' + _value.toFixed(4)
        return '$' + _value.toPrecision(4)
    }

    roundRect(_ctx, _x, _y, _w, _h, _r)
    {
        _ctx.beginPath()
        _ctx.moveTo(_x + _r, _y)
        _ctx.arcTo(_x + _w, _y, _x + _w, _y + _h, _r)
        _ctx.arcTo(_x + _w, _y + _h, _x, _y + _h, _r)
        _ctx.arcTo(_x, _y + _h, _x, _y, _r)
        _ctx.arcTo(_x, _y, _x + _w, _y, _r)
        _ctx.closePath()
    }

    setTrading()
    {
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 512

        this.trading = {}
        this.trading.canvas = canvas
        this.trading.context = canvas.getContext('2d')
        this.trading.candles = []
        this.trading.seeded = false

        this.trading.texture = new THREE.CanvasTexture(canvas)
        this.trading.texture.encoding = THREE.sRGBEncoding

        const mesh = this.resources.items.pcScreenModel.scene.children[0]
        mesh.material = new THREE.MeshBasicMaterial({ map: this.trading.texture })
        this.scene.add(mesh)

        this.drawTrading()
    }

    // A new candle is added only when a fresh real price arrives from the
    // API — the chart stays perfectly still between trades
    onPrice(_price)
    {
        const candles = this.trading.candles

        if(!this.trading.seeded)
        {
            // Deterministic gentle history ending at the current price
            let previous = _price * 0.86
            for(let i = 0; i < 40; i++)
            {
                const t = i / 39
                const value = _price * (0.86 + 0.14 * t + Math.sin(i * 0.9) * 0.012)
                candles.push({
                    open: previous,
                    close: value,
                    high: Math.max(previous, value) * 1.004,
                    low: Math.min(previous, value) * 0.996
                })
                previous = value
            }
            this.trading.seeded = true
            return
        }

        const open = candles[candles.length - 1].close

        if(open === _price)
        {
            // No movement: flat doji, nothing jumps
            candles.push({ open, close: _price, high: _price * 1.001, low: _price * 0.999 })
        }
        else
        {
            candles.push({
                open,
                close: _price,
                high: Math.max(open, _price) * 1.003,
                low: Math.min(open, _price) * 0.997
            })
        }

        if(candles.length > 40)
            candles.shift()
    }

    drawTrading()
    {
        const ctx = this.trading.context
        const dex = this.dex
        const candles = this.trading.candles
        const w = 1024
        const h = 512

        // Dark gradient backdrop
        const bg = ctx.createLinearGradient(0, 0, 0, h)
        bg.addColorStop(0, '#0c1410')
        bg.addColorStop(1, '#070a09')
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, w, h)

        // Header bar
        ctx.fillStyle = '#111916'
        ctx.fillRect(0, 0, w, 72)

        ctx.fillStyle = '#4ade80'
        ctx.font = '900 22px Arial'
        ctx.textAlign = 'left'
        ctx.fillText('DexScreener', 20, 44)

        const statusColor = dex.status === 'live' ? '#4ade80' : '#7c8b80'
        ctx.fillStyle = statusColor
        ctx.font = '700 16px Arial'
        ctx.textAlign = 'right'
        const statusLabel = dex.status === 'live' ? '● LIVE' : dex.status === 'waiting' ? '○ WAITING' : '… LOADING'
        ctx.fillText(statusLabel, w - 20, 44)
        ctx.textAlign = 'left'

        // Token row
        const symbol = dex.symbol ? '$' + dex.symbol : '$A1LON9ROOM'
        ctx.fillStyle = '#ffffff'
        ctx.font = '900 34px Arial'
        ctx.fillText(symbol, 20, 108)

        if(dex.status === 'live' && dex.priceUsd !== null)
        {
            const change = dex.change24h
            const changeColor = change >= 0 ? '#4ade80' : '#f87171'
            ctx.fillStyle = '#eaffd6'
            ctx.font = '900 28px Arial'
            ctx.fillText(this.formatPrice(dex.priceUsd), 20, 148)

            if(change !== null && !isNaN(change))
            {
                ctx.fillStyle = changeColor
                ctx.font = '700 22px Arial'
                ctx.fillText((change >= 0 ? '+' : '') + change.toFixed(2) + '%', 220, 148)
            }
        }
        else
        {
            ctx.fillStyle = '#7c8b80'
            ctx.font = '700 24px Arial'
            ctx.fillText(dex.status === 'waiting' ? 'Waiting for launch…' : 'Fetching market data…', 20, 148)
        }

        // Stats row
        const stats = [
            { label: 'MCap', value: this.formatUsd(dex.marketCap) },
            { label: 'Liq', value: this.formatUsd(dex.liquidity) },
            { label: 'Vol 24h', value: this.formatUsd(dex.volume24h) },
            { label: 'Buys', value: dex.buys !== null ? String(dex.buys) : '—' },
            { label: 'Sells', value: dex.sells !== null ? String(dex.sells) : '—' }
        ]

        const statW = (w - 40) / stats.length
        ctx.font = '700 13px Arial'
        for(let i = 0; i < stats.length; i++)
        {
            const x = 20 + i * statW
            ctx.fillStyle = '#6f7a72'
            ctx.fillText(stats[i].label, x, 182)
            ctx.fillStyle = '#d6e8dc'
            ctx.font = '900 18px Arial'
            ctx.fillText(stats[i].value, x, 206)
            ctx.font = '700 13px Arial'
        }

        // Chart area
        const chartX = 20
        const chartY = 228
        const chartW = w - 40
        const chartH = h - chartY - 20

        ctx.fillStyle = '#0a100d'
        this.roundRect(ctx, chartX, chartY, chartW, chartH, 10)
        ctx.fill()

        if(candles.length >= 2)
        {
            let min = Infinity
            let max = -Infinity
            for(const c of candles)
            {
                min = Math.min(min, c.low)
                max = Math.max(max, c.high)
            }
            const pad = (max - min) * 0.08 || max * 0.01
            min -= pad
            max += pad
            const range = max - min || 1

            const candleW = chartW / candles.length
            const bodyW = Math.max(4, candleW * 0.55)

            for(let i = 0; i < candles.length; i++)
            {
                const c = candles[i]
                const bullish = c.close >= c.open
                const color = bullish ? '#4ade80' : '#f87171'
                const cx = chartX + i * candleW + candleW * 0.5

                const yHigh = chartY + chartH - ((c.high - min) / range) * chartH
                const yLow = chartY + chartH - ((c.low - min) / range) * chartH
                const yOpen = chartY + chartH - ((c.open - min) / range) * chartH
                const yClose = chartY + chartH - ((c.close - min) / range) * chartH

                ctx.strokeStyle = color
                ctx.lineWidth = 2
                ctx.beginPath()
                ctx.moveTo(cx, yHigh)
                ctx.lineTo(cx, yLow)
                ctx.stroke()

                const top = Math.min(yOpen, yClose)
                const bodyH = Math.max(2, Math.abs(yClose - yOpen))
                ctx.fillStyle = color
                ctx.fillRect(cx - bodyW * 0.5, top, bodyW, bodyH)
            }
        }
        else
        {
            ctx.fillStyle = '#4ade80'
            ctx.font = '700 20px Arial'
            ctx.textAlign = 'center'
            ctx.fillText('Chart warming up…', w * 0.5, chartY + chartH * 0.5)
            ctx.textAlign = 'left'
        }

        // Contract footer
        ctx.fillStyle = '#3d4a42'
        ctx.font = '700 14px monospace'
        ctx.textAlign = 'center'
        const shortAddr = TOKEN_ADDRESS.slice(0, 6) + '…' + TOKEN_ADDRESS.slice(-6)
        ctx.fillText(shortAddr, w * 0.5, h - 10)
        ctx.textAlign = 'left'

        this.trading.texture.needsUpdate = true
    }

    setLaunchpad()
    {
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 640

        this.launchpad = {}
        this.launchpad.canvas = canvas
        this.launchpad.context = canvas.getContext('2d')
        this.launchpad.texture = new THREE.CanvasTexture(canvas)
        this.launchpad.texture.encoding = THREE.sRGBEncoding
        this.launchpad.tick = 0

        const mesh = this.resources.items.macScreenModel.scene.children[0]
        mesh.material = new THREE.MeshBasicMaterial({ map: this.launchpad.texture })
        this.scene.add(mesh)

        this.drawLaunchpad()
    }

    // pump.fun homepage: sidebar, search, top bounties, trending now
    drawLaunchpad()
    {
        const ctx = this.launchpad.context
        this.launchpad.tick++

        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'

        ctx.fillStyle = '#0d0f0e'
        ctx.fillRect(0, 0, 1024, 640)

        // ---- Sidebar
        ctx.fillStyle = '#0a0c0b'
        ctx.fillRect(0, 0, 230, 640)

        // Logo: little pill + wordmark
        ctx.fillStyle = '#4ade80'
        this.roundRect(ctx, 24, 26, 40, 22, 11)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        this.roundRect(ctx, 24, 26, 20, 22, 11)
        ctx.fill()
        ctx.font = '900 26px Arial'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('Pump.fun', 76, 47)

        // Nav: Home highlighted
        ctx.fillStyle = '#1a201c'
        this.roundRect(ctx, 16, 84, 198, 44, 10)
        ctx.fill()

        const nav = ['Home', 'GO', 'Communities', 'Callouts', 'Live', 'Support', 'Terminal']
        ctx.font = '700 21px Arial'
        for(let i = 0; i < nav.length; i++)
        {
            const y = 113 + i * 48
            ctx.fillStyle = i === 0 ? '#4ade80' : '#39413c'
            ctx.beginPath()
            ctx.arc(40, y - 7, 7, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = i === 0 ? '#ffffff' : '#9aa39c'
            ctx.fillText(nav[i], 62, y)
        }

        // Create button
        ctx.fillStyle = '#4ade80'
        this.roundRect(ctx, 20, 462, 190, 48, 24)
        ctx.fill()
        ctx.fillStyle = '#0a0c0b'
        ctx.font = '900 23px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('Create', 115, 494)
        ctx.textAlign = 'left'

        // Creator rewards
        ctx.fillStyle = '#9aa39c'
        ctx.font = '700 17px Arial'
        ctx.fillText('Creator rewards', 24, 545)
        ctx.fillStyle = '#4ade80'
        this.roundRect(ctx, 158, 530, 48, 20, 6)
        ctx.fill()
        ctx.fillStyle = '#0a0c0b'
        ctx.font = '900 14px Arial'
        ctx.fillText('New', 168, 545)
        ctx.fillStyle = '#ffffff'
        ctx.font = '900 22px Arial'
        ctx.fillText('$0.00', 24, 575)

        ctx.fillStyle = '#9aa39c'
        ctx.font = '700 19px Arial'
        ctx.fillText('Holdings  ▾', 24, 618)

        // ---- Top bar
        ctx.fillStyle = '#15191c'
        this.roundRect(ctx, 252, 18, 360, 44, 22)
        ctx.fill()
        ctx.fillStyle = '#8b95a5'
        ctx.font = '700 19px Arial'
        ctx.fillText('🔍 Search for coins...', 274, 46)
        ctx.fillText('⌘K', 568, 46)

        ctx.fillStyle = '#15191c'
        this.roundRect(ctx, 640, 18, 138, 44, 22)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillText('Voice chat', 666, 46)

        ctx.fillStyle = '#15191c'
        this.roundRect(ctx, 792, 18, 108, 44, 22)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillText('+ Create', 812, 46)

        ctx.fillStyle = '#4ade80'
        this.roundRect(ctx, 914, 18, 96, 44, 22)
        ctx.fill()
        ctx.fillStyle = '#0a0c0b'
        ctx.font = '900 19px Arial'
        ctx.fillText('Sign in', 932, 46)

        // ---- Top bounties
        ctx.fillStyle = '#ffffff'
        ctx.font = '900 28px Arial'
        ctx.fillText('Top bounties', 252, 116)
        ctx.fillStyle = '#8b95a5'
        ctx.font = '700 19px Arial'
        ctx.fillText('View all', 940, 114)

        const bounties = [
            { img: '#33415c', title1: 'Send EnHeng To', title2: 'SpaceX', reward: '$59 092', left: '6d 8h left' },
            { img: '#5a7184', title1: 'Place a Bet on Howl', title2: 'at Mt. Everest', reward: '$53 203', left: '28d 5h left' }
        ]

        for(let i = 0; i < bounties.length; i++)
        {
            const b = bounties[i]
            const x = 252 + i * 392

            ctx.fillStyle = '#131715'
            this.roundRect(ctx, x, 136, 372, 150, 14)
            ctx.fill()

            // Image block + OPEN chip
            ctx.fillStyle = b.img
            this.roundRect(ctx, x + 14, 150, 122, 122, 10)
            ctx.fill()
            ctx.fillStyle = '#4ade80'
            this.roundRect(ctx, x + 22, 158, 56, 24, 8)
            ctx.fill()
            ctx.fillStyle = '#0a0c0b'
            ctx.font = '900 15px Arial'
            ctx.fillText('OPEN', x + 31, 175)

            ctx.fillStyle = '#ffffff'
            ctx.font = '700 21px Arial'
            ctx.fillText(b.title1, x + 152, 178)
            ctx.fillText(b.title2, x + 152, 204)

            ctx.fillStyle = '#4ade80'
            ctx.font = '900 28px Arial'
            ctx.fillText(b.reward, x + 152, 240)
            ctx.fillStyle = '#8b95a5'
            ctx.font = '700 16px Arial'
            ctx.fillText('REWARD', x + 282, 238)
            ctx.fillText(b.left, x + 152, 266)
        }

        // ---- Trending now
        ctx.fillStyle = '#ffffff'
        ctx.font = '900 28px Arial'
        ctx.fillText('Trending now', 252, 348)

        const trending = [
            { img: '#c9a87a', label: 'KINTARA', dark: true, mc: '$6.56M', name: 'Kintara' },
            { img: '#f2f2f0', label: 'BOUNTY', dark: true, mc: '$678K', name: 'Bountywork', live: true },
            { img: '#8a6a4f', label: 'JOTCHUA', dark: false, mc: '$3.03M', name: 'Jotchua' },
            { img: '#c9a227', label: 'WORLDCUP', dark: false, mc: '$4.47M', name: 'World Cup' }
        ]

        for(let i = 0; i < trending.length; i++)
        {
            const t = trending[i]
            const x = 252 + i * 196

            ctx.fillStyle = '#131715'
            this.roundRect(ctx, x, 368, 180, 240, 14)
            ctx.fill()

            ctx.fillStyle = t.img
            this.roundRect(ctx, x + 10, 378, 160, 130, 10)
            ctx.fill()

            ctx.fillStyle = t.dark ? '#15191c' : 'rgba(255,255,255,0.92)'
            ctx.font = '900 22px Arial'
            ctx.textAlign = 'center'
            ctx.fillText(t.label, x + 90, 450)
            ctx.textAlign = 'left'

            if(t.live)
            {
                ctx.fillStyle = '#4ade80'
                this.roundRect(ctx, x + 108, 386, 54, 22, 8)
                ctx.fill()
                ctx.fillStyle = '#0a0c0b'
                ctx.font = '900 14px Arial'
                ctx.fillText('LIVE', x + 122, 402)
            }

            ctx.fillStyle = '#ffffff'
            ctx.font = '900 24px Arial'
            ctx.fillText(t.mc, x + 14, 548)
            ctx.fillStyle = '#8b95a5'
            ctx.font = '700 19px Arial'
            ctx.fillText(t.name, x + 14, 580)
        }

        this.launchpad.texture.needsUpdate = true
    }

    update()
    {
        const elapsed = this.time.elapsed

        if(elapsed - this.lastFetch > FETCH_INTERVAL)
        {
            this.lastFetch = elapsed
            this.fetchDex()
        }

        if(elapsed - this.lastDraw > 180)
        {
            this.lastDraw = elapsed
            this.drawTrading()
            this.drawLaunchpad()
        }
    }
}
