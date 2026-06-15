import * as THREE from 'three'

import Experience from './Experience.js'

// Pump.fun founder workspace: a few museum-grade designer collectibles,
// cinematic neon, gallery posters. Quality over quantity — no clutter.
// Room anchors (world space, measured from the baked mesh):
// floor y=0, desk top y=1.95 (front edge z=-3.22, x -2.2..2.6), back wall z=-4.95,
// right wall x=4.56 (window at z -1.3..-3), bookshelf x -4.8..-2.6 (old baked toys
// on top reach y~6.3 and can only be covered, the room is one merged mesh),
// sofa chaise z~4.1, coffee table top y=0.88, tv stand top y=1.05, ceiling y=6.4.
export default class PumpDecor
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.time = this.experience.time

        this.palette = {
            green: '#4ade80',
            pink: '#ff4fd8',
            purple: '#a78bfa',
            orange: '#fbbf24',
            white: '#ffffff',
            dark: '#15121f'
        }

        this.flickerMaterials = []
        this.blinkMaterials = []
        this.blink = null

        this.group = new THREE.Group()
        this.scene.add(this.group)

        this.setDeskItems()
        this.setToyBox()
        this.setWallDecor()
        this.setUpperWallArt()
        this.setFounderStory()
        this.setTvStandVitrine()
        this.setLedStrips()
        this.setLights()
    }

    /**
     * Canvas helpers
     */
    canvasTexture(_width, _height, _draw)
    {
        const canvas = document.createElement('canvas')
        canvas.width = _width
        canvas.height = _height
        _draw(canvas.getContext('2d'), _width, _height)

        const texture = new THREE.CanvasTexture(canvas)
        texture.encoding = THREE.sRGBEncoding
        texture.anisotropy = 4
        return texture
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

    /**
     * Designer collectible builders
     */

    // Gold pill trophy on a black base — founder memorabilia
    makeTrophyPill(_height)
    {
        const group = new THREE.Group()

        const gold = new THREE.MeshStandardMaterial({ color: '#f0c75e', roughness: 0.22, metalness: 0.6 })
        const u = _height

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(u * 0.3, u * 0.34, u * 0.12, 24),
            new THREE.MeshStandardMaterial({ color: '#0d0b12', roughness: 0.3 })
        )
        base.position.y = u * 0.06
        group.add(base)

        const r = u * 0.17
        const body = u * 0.5

        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, body, 32), gold)
        cyl.position.y = u * 0.12 + r + body * 0.5
        group.add(cyl)

        const capTop = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), gold)
        capTop.position.y = u * 0.12 + r + body
        group.add(capTop)

        const capBottom = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), gold)
        capBottom.position.y = u * 0.12 + r
        group.add(capBottom)

        // Seam ring
        const seam = new THREE.Mesh(
            new THREE.TorusGeometry(r * 1.01, r * 0.06, 8, 24),
            new THREE.MeshStandardMaterial({ color: '#0d0b12', roughness: 0.3 })
        )
        seam.rotation.x = Math.PI * 0.5
        seam.position.y = u * 0.12 + r + body * 0.5
        group.add(seam)

        return group
    }

    // Smooth two-tone pump.fun logo pill: white top, green bottom
    makeLogoPill(_radius, _bodyLength)
    {
        const group = new THREE.Group()

        const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.18 })
        const green = new THREE.MeshStandardMaterial({ color: this.palette.green, roughness: 0.18 })

        const r = _radius
        const body = _bodyLength

        const bottomCap = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), green)
        bottomCap.position.y = r
        group.add(bottomCap)

        const bottomCyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, body * 0.5, 32, 1, true), green)
        bottomCyl.position.y = r + body * 0.25
        group.add(bottomCyl)

        const topCyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, body * 0.5, 32, 1, true), white)
        topCyl.position.y = r + body * 0.75
        group.add(topCyl)

        const topCap = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), white)
        topCap.position.y = r + body
        group.add(topCap)

        // Subtle capsule seam
        const seam = new THREE.Mesh(
            new THREE.TorusGeometry(r * 1.002, r * 0.022, 8, 48),
            new THREE.MeshStandardMaterial({ color: '#c9d4cc', roughness: 0.35 })
        )
        seam.rotation.x = Math.PI * 0.5
        seam.position.y = r + body * 0.5
        group.add(seam)

        return group
    }

    // Neon sign: glowing canvas plane + additive halo.
    // _blink: occasional glitchy blinking instead of gentle breathing
    makeNeon(_width, _height, _draw, _haloColor, _blink = false)
    {
        const group = new THREE.Group()

        const texture = this.canvasTexture(Math.round(_width * 360), Math.round(_height * 360), _draw)
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })

        if(_blink)
            this.blinkMaterials.push(material)
        else
            this.flickerMaterials.push(material)

        const plane = new THREE.Mesh(new THREE.PlaneGeometry(_width, _height), material)
        group.add(plane)

        const haloTexture = this.canvasTexture(128, 128, (ctx) =>
        {
            const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 64)
            gradient.addColorStop(0, _haloColor + '55')
            gradient.addColorStop(1, _haloColor + '00')
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, 128, 128)
        })

        const haloMaterial = new THREE.MeshBasicMaterial({
            map: haloTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })

        if(_blink)
            this.blinkMaterials.push(haloMaterial)

        const halo = new THREE.Mesh(
            new THREE.PlaneGeometry(_width * 1.9, _height * 2.6),
            haloMaterial
        )
        halo.position.z = -0.02
        group.add(halo)

        return group
    }

    neonText(_ctx, _w, _h, _text, _color, _font)
    {
        _ctx.clearRect(0, 0, _w, _h)
        _ctx.font = _font
        _ctx.textAlign = 'center'
        _ctx.textBaseline = 'middle'

        // Glow scales with the sign size
        _ctx.shadowColor = _color
        _ctx.shadowBlur = _h * 0.16
        _ctx.fillStyle = _color
        _ctx.fillText(_text, _w * 0.5, _h * 0.54)
        _ctx.fillText(_text, _w * 0.5, _h * 0.54)
        _ctx.fillText(_text, _w * 0.5, _h * 0.54)

        _ctx.shadowBlur = _h * 0.05
        _ctx.fillStyle = '#eafff2'
        _ctx.fillText(_text, _w * 0.5, _h * 0.54)
    }

    // Framed poster
    makePoster(_width, _height, _draw)
    {
        const group = new THREE.Group()

        const frame = new THREE.Mesh(
            new THREE.BoxGeometry(_width + 0.06, _height + 0.06, 0.03),
            new THREE.MeshStandardMaterial({ color: '#0e0c14', roughness: 0.6 })
        )
        group.add(frame)

        const art = new THREE.Mesh(
            new THREE.PlaneGeometry(_width, _height),
            new THREE.MeshBasicMaterial({ map: this.canvasTexture(Math.round(_width * 300), Math.round(_height * 300), _draw) })
        )
        art.position.z = 0.017
        group.add(art)

        return group
    }

    /**
     * Placement
     */

    setDeskItems()
    {
        // One rare piece near the monitor: small chrome pill on an acrylic stand
        const stand = new THREE.Group()
        stand.position.set(2.15, 1.95, -3.9)
        this.group.add(stand)

        const acrylicBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.04, 0.22),
            new THREE.MeshStandardMaterial({ color: '#cfe9ff', roughness: 0.05, transparent: true, opacity: 0.35 })
        )
        acrylicBase.position.y = 0.02
        stand.add(acrylicBase)

        const chrome = new THREE.MeshStandardMaterial({ color: '#d8dde4', roughness: 0.15, metalness: 0.85 })
        const r = 0.05
        const body = 0.12

        const pillCyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, body, 16), chrome)
        pillCyl.position.y = 0.04 + r + body * 0.5
        stand.add(pillCyl)

        for(const end of [0, 1])
        {
            const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), chrome)
            cap.position.y = 0.04 + r + end * body
            stand.add(cap)
        }

        // Small engraved desk plaque — tasteful founder reference
        const plaque = new THREE.Mesh(
            new THREE.BoxGeometry(0.34, 0.1, 0.02),
            new THREE.MeshStandardMaterial({
                map: this.canvasTexture(340, 100, (ctx, w, h) =>
                {
                    ctx.fillStyle = '#101018'
                    ctx.fillRect(0, 0, w, h)
                    ctx.strokeStyle = '#f0c75e'
                    ctx.lineWidth = 3
                    ctx.strokeRect(8, 8, w - 16, h - 16)
                    ctx.fillStyle = '#f0c75e'
                    ctx.font = '700 30px Georgia'
                    ctx.textAlign = 'center'
                    ctx.fillText('FOUNDER — EST. 2024', w * 0.5, h * 0.62)
                }),
                roughness: 0.4
            })
        )
        plaque.position.set(-1.85, 2.0, -3.55)
        plaque.rotation.x = -0.18
        plaque.rotation.y = 0.25
        this.group.add(plaque)
    }

    // Big transparent collector box on the desk with the pump.fun logo pill inside
    setToyBox()
    {
        const box = new THREE.Group()
        box.position.set(-1.4, 1.95, -4.05)
        box.rotation.y = -0.25
        this.group.add(box)

        const W = 0.55
        const H = 0.72
        const D = 0.42

        // Dark base tray
        const tray = new THREE.Mesh(
            new THREE.BoxGeometry(W, 0.05, D),
            new THREE.MeshStandardMaterial({ color: this.palette.dark, roughness: 0.5 })
        )
        tray.position.y = 0.025
        box.add(tray)

        // Clear acrylic shell
        const shell = new THREE.Mesh(
            new THREE.BoxGeometry(W - 0.02, H - 0.1, D - 0.02),
            new THREE.MeshStandardMaterial({
                color: '#d6ecff',
                roughness: 0.04,
                transparent: true,
                opacity: 0.13
            })
        )
        shell.position.y = 0.05 + (H - 0.1) * 0.5
        box.add(shell)

        // Full edge frame (verticals + top and bottom rails) so the box
        // reads as a premium display case
        const edgeMaterial = new THREE.MeshStandardMaterial({ color: '#2a2438', roughness: 0.45 })
        const innerH = H - 0.1
        for(const sx of [-1, 1])
        {
            for(const sz of [-1, 1])
            {
                const edge = new THREE.Mesh(new THREE.BoxGeometry(0.022, innerH, 0.022), edgeMaterial)
                edge.position.set(sx * (W * 0.5 - 0.02), 0.05 + innerH * 0.5, sz * (D * 0.5 - 0.02))
                box.add(edge)
            }
        }
        for(const level of [0.05, 0.05 + innerH])
        {
            for(const sz of [-1, 1])
            {
                const railX = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 0.022, 0.022), edgeMaterial)
                railX.position.set(0, level, sz * (D * 0.5 - 0.02))
                box.add(railX)
            }
            for(const sx of [-1, 1])
            {
                const railZ = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, D - 0.02), edgeMaterial)
                railZ.position.set(sx * (W * 0.5 - 0.02), level, 0)
                box.add(railZ)
            }
        }

        // Plain dark lid, no branding
        const lid = new THREE.Mesh(
            new THREE.BoxGeometry(W, 0.06, D),
            new THREE.MeshStandardMaterial({ color: this.palette.dark, roughness: 0.5 })
        )
        lid.position.y = H - 0.03
        box.add(lid)

        // The logo pill: white top, green bottom, smooth and glossy
        const pill = this.makeLogoPill(0.105, 0.26)
        pill.position.y = 0.05
        pill.rotation.y = -0.3
        box.add(pill)

        // Soft LED under the pill
        const glow = new THREE.Mesh(
            new THREE.BoxGeometry(W - 0.08, 0.014, 0.014),
            new THREE.MeshBasicMaterial({ color: this.palette.green })
        )
        glow.position.set(0, 0.052, D * 0.5 - 0.045)
        box.add(glow)
    }

    setWallDecor()
    {
        // Big green a1lon9room neon, centered above the TV (right wall, facing -x),
        // blinks occasionally like a real gas tube
        const pumpNeon = this.makeNeon(4.3, 1.1, (ctx, w, h) =>
        {
            this.neonText(ctx, w, h, 'a1lon9room', this.palette.green, '900 ' + Math.round(h * 0.42) + 'px Arial')
        }, this.palette.green, true)
        pumpNeon.position.set(4.56, 4.85, 0.9)
        pumpNeon.rotation.y = - Math.PI * 0.5
        this.group.add(pumpNeon)

        // Soft pink neon above the desk
        const degenNeon = this.makeNeon(1.7, 0.55, (ctx, w, h) =>
        {
            this.neonText(ctx, w, h, 'ship fast', this.palette.pink, 'italic 700 ' + Math.round(h * 0.44) + 'px Georgia')
        }, this.palette.pink)
        degenNeon.position.set(2.0, 4.85, -4.92)
        this.group.add(degenNeon)

    }

    // Big "TO THE MOON" neon across the empty upper wall, plus a ceiling
    // cove LED strip
    setUpperWallArt()
    {
        // Punchy lime green + condensed Impact font, distinct from the
        // pump.fun / a1lon9room signs (those are Arial in palette green)
        const moonGreen = '#7bff2e'
        const moonNeon = this.makeNeon(5.2, 1.3, (ctx, w, h) =>
        {
            ctx.clearRect(0, 0, w, h)
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.font = '900 ' + Math.round(h * 0.66) + 'px "Impact", "Haettenschweiler", "Arial Narrow", sans-serif'

            // Glow passes
            ctx.shadowColor = moonGreen
            ctx.shadowBlur = h * 0.22
            ctx.fillStyle = moonGreen
            ctx.fillText('TO THE MOON', w * 0.5, h * 0.54)
            ctx.fillText('TO THE MOON', w * 0.5, h * 0.54)

            // Bright core
            ctx.shadowBlur = h * 0.06
            ctx.fillStyle = '#eaffd6'
            ctx.fillText('TO THE MOON', w * 0.5, h * 0.54)
        }, moonGreen)
        moonNeon.position.set(0.7, 5.55, -4.93)
        this.group.add(moonNeon)

        // Pink cove LED along the top of the back wall
        const cove = new THREE.Mesh(
            new THREE.BoxGeometry(6.6, 0.03, 0.03),
            new THREE.MeshBasicMaterial({ color: this.palette.pink })
        )
        cove.position.set(1.1, 6.27, -4.94)
        this.group.add(cove)
    }

    // Years of building pump.fun: whiteboard, pinned concepts, first deploy,
    // milestone plaque, conference badge, working notebook, term sheets
    setFounderStory()
    {
        const marker = "'Marker Felt', 'Comic Sans MS', cursive"

        // Whiteboard with hand-written launch notes (back wall, above desk)
        const whiteboard = new THREE.Group()
        whiteboard.position.set(-1.35, 3.7, -4.93)
        this.group.add(whiteboard)

        const wbFrame = new THREE.Mesh(
            new THREE.BoxGeometry(1.06, 0.84, 0.03),
            new THREE.MeshStandardMaterial({ color: '#b9bec6', roughness: 0.4 })
        )
        whiteboard.add(wbFrame)

        const wbSurface = new THREE.Mesh(
            new THREE.PlaneGeometry(1.0, 0.78),
            new THREE.MeshBasicMaterial({ map: this.canvasTexture(500, 390, (ctx, w, h) =>
            {
                ctx.fillStyle = '#f6f7f4'
                ctx.fillRect(0, 0, w, h)

                // Bonding curve sketch with axes
                ctx.strokeStyle = '#2b3137'
                ctx.lineWidth = 4
                ctx.beginPath()
                ctx.moveTo(40, 60)
                ctx.lineTo(40, 230)
                ctx.lineTo(230, 230)
                ctx.stroke()

                ctx.strokeStyle = '#22a85f'
                ctx.lineWidth = 5
                ctx.beginPath()
                ctx.moveTo(45, 225)
                ctx.quadraticCurveTo(140, 215, 180, 140)
                ctx.quadraticCurveTo(205, 95, 222, 70)
                ctx.stroke()

                ctx.fillStyle = '#2b3137'
                ctx.font = '22px ' + marker
                ctx.fillText('price', 46, 56)
                ctx.fillText('supply', 168, 256)

                // Circled note
                ctx.strokeStyle = '#e0484f'
                ctx.lineWidth = 4
                ctx.beginPath()
                ctx.ellipse(355, 90, 105, 42, -0.06, 0, Math.PI * 2)
                ctx.stroke()
                ctx.fillStyle = '#e0484f'
                ctx.font = '30px ' + marker
                ctx.textAlign = 'center'
                ctx.fillText('fair launch', 355, 100)

                // Checklist
                ctx.textAlign = 'left'
                ctx.fillStyle = '#2b3137'
                ctx.font = '24px ' + marker
                ctx.fillText('v0.1 devnet', 290, 170)
                ctx.fillText('curve audit', 290, 210)
                ctx.fillText('mainnet!!', 290, 250)
                ctx.fillStyle = '#22a85f'
                ctx.font = '28px ' + marker
                ctx.fillText('✓', 255, 172)
                ctx.fillText('✓', 255, 212)
                ctx.fillText('✓', 255, 252)

                // Bottom note + arrow to the curve
                ctx.fillStyle = '#3a6fd8'
                ctx.font = '26px ' + marker
                ctx.fillText('no presale. no team alloc.', 60, 320)
                ctx.fillText('everyone starts at 0', 60, 355)
            }) })
        )
        wbSurface.position.z = 0.017
        whiteboard.add(wbSurface)

        // Marker tray with two markers
        const tray = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.03, 0.06),
            new THREE.MeshStandardMaterial({ color: '#b9bec6', roughness: 0.4 })
        )
        tray.position.set(0, -0.45, 0.035)
        whiteboard.add(tray)

        for(const [i, color] of [['#22a85f'], ['#e0484f']].entries())
        {
            const pen = new THREE.Mesh(
                new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8),
                new THREE.MeshStandardMaterial({ color: color[0], roughness: 0.5 })
            )
            pen.rotation.z = Math.PI * 0.5
            pen.position.set(-0.08 + i * 0.17, -0.42, 0.045)
            whiteboard.add(pen)
        }

        // Pinned mascot concept sheets + sticky notes (back wall)
        const pinned = new THREE.Group()
        pinned.position.set(1.55, 3.55, -4.94)
        this.group.add(pinned)

        const sheetSpecs = [
            { x: -0.34, y: 0.18, r: 0.06, draw: (ctx, w, h) =>
            {
                ctx.strokeStyle = '#3a3f45'
                ctx.lineWidth = 5
                this.roundRect(ctx, w * 0.3, h * 0.25, w * 0.4, h * 0.5, w * 0.2)
                ctx.stroke()
                ctx.font = '26px ' + marker
                ctx.fillStyle = '#3a3f45'
                ctx.textAlign = 'center'
                ctx.fillText('v1', w * 0.5, h * 0.16)
            } },
            { x: 0.0, y: 0.16, r: -0.04, draw: (ctx, w, h) =>
            {
                ctx.strokeStyle = '#3a3f45'
                ctx.lineWidth = 5
                this.roundRect(ctx, w * 0.3, h * 0.25, w * 0.4, h * 0.5, w * 0.2)
                ctx.stroke()
                ctx.beginPath()
                ctx.arc(w * 0.42, h * 0.45, 4, 0, 7)
                ctx.arc(w * 0.58, h * 0.45, 4, 0, 7)
                ctx.fill()
                ctx.font = '26px ' + marker
                ctx.textAlign = 'center'
                ctx.fillText('v2 eyes?', w * 0.5, h * 0.16)
            } },
            { x: 0.34, y: 0.18, r: 0.05, draw: (ctx, w, h) =>
            {
                ctx.strokeStyle = '#22a85f'
                ctx.lineWidth = 6
                this.roundRect(ctx, w * 0.3, h * 0.25, w * 0.4, h * 0.5, w * 0.2)
                ctx.stroke()
                ctx.fillStyle = '#22a85f'
                this.roundRect(ctx, w * 0.3, h * 0.5, w * 0.4, h * 0.25, w * 0.2)
                ctx.fill()
                ctx.fillStyle = '#3a3f45'
                ctx.font = '26px ' + marker
                ctx.textAlign = 'center'
                ctx.fillText('FINAL', w * 0.5, h * 0.16)
            } }
        ]

        for(const spec of sheetSpecs)
        {
            const sheet = new THREE.Mesh(
                new THREE.PlaneGeometry(0.26, 0.34),
                new THREE.MeshBasicMaterial({ map: this.canvasTexture(130, 170, (ctx, w, h) =>
                {
                    ctx.fillStyle = '#fbfaf6'
                    ctx.fillRect(0, 0, w, h)
                    spec.draw(ctx, w, h)
                }) })
            )
            sheet.position.set(spec.x, spec.y, 0)
            sheet.rotation.z = spec.r

            const pin = new THREE.Mesh(
                new THREE.SphereGeometry(0.014, 8, 8),
                new THREE.MeshStandardMaterial({ color: '#e0484f', roughness: 0.4 })
            )
            pin.position.set(spec.x, spec.y + 0.15, 0.012)

            pinned.add(sheet)
            pinned.add(pin)
        }

        const stickySpecs = [
            { x: -0.2, y: -0.18, color: '#ffe66b', text: 'fee switch?', r: -0.08 },
            { x: 0.18, y: -0.2, color: '#7be3a1', text: 'ship friday', r: 0.1 }
        ]

        for(const spec of stickySpecs)
        {
            const sticky = new THREE.Mesh(
                new THREE.PlaneGeometry(0.16, 0.16),
                new THREE.MeshBasicMaterial({ map: this.canvasTexture(96, 96, (ctx, w, h) =>
                {
                    ctx.fillStyle = spec.color
                    ctx.fillRect(0, 0, w, h)
                    ctx.fillStyle = '#42463d'
                    ctx.font = '17px ' + marker
                    ctx.textAlign = 'center'
                    ctx.fillText(spec.text, w * 0.5, h * 0.55)
                }) })
            )
            sticky.position.set(spec.x, spec.y, 0)
            sticky.rotation.z = spec.r
            pinned.add(sticky)
        }

        // Framed first deploy terminal (above the pinned wall)
        const deployFrame = this.makePoster(0.6, 0.42, (ctx, w, h) =>
        {
            ctx.fillStyle = '#0a0e0a'
            ctx.fillRect(0, 0, w, h)
            ctx.font = '700 ' + Math.round(h * 0.105) + 'px Menlo, monospace'
            ctx.textAlign = 'left'
            ctx.fillStyle = '#4ade80'
            ctx.fillText('$ pump deploy --mainnet', w * 0.07, h * 0.22)
            ctx.fillStyle = '#9aa59b'
            ctx.fillText('building curve...', w * 0.07, h * 0.4)
            ctx.fillText('verifying program...', w * 0.07, h * 0.56)
            ctx.fillStyle = '#4ade80'
            ctx.fillText('✓ live — block 243,118,004', w * 0.07, h * 0.74)
            ctx.fillStyle = '#ffffff'
            ctx.fillText('jan 19 2024 — 14:02:33', w * 0.07, h * 0.9)
        })
        deployFrame.position.set(0.85, 4.3, -4.93)
        this.group.add(deployFrame)

        // Conference badge in a shadow box (right wall)
        const badge = this.makePoster(0.42, 0.56, (ctx, w, h) =>
        {
            ctx.fillStyle = '#181520'
            ctx.fillRect(0, 0, w, h)

            // Lanyard strap
            ctx.strokeStyle = '#4ade80'
            ctx.lineWidth = 10
            ctx.beginPath()
            ctx.moveTo(w * 0.3, 0)
            ctx.lineTo(w * 0.5, h * 0.3)
            ctx.lineTo(w * 0.7, 0)
            ctx.stroke()

            // Badge card
            ctx.fillStyle = '#f4f1ec'
            this.roundRect(ctx, w * 0.18, h * 0.3, w * 0.64, h * 0.56, 10)
            ctx.fill()
            ctx.fillStyle = '#15121f'
            ctx.textAlign = 'center'
            ctx.font = '900 ' + Math.round(h * 0.07) + 'px Arial'
            ctx.fillText('BREAKPOINT', w * 0.5, h * 0.44)
            ctx.fillStyle = '#8b86a0'
            ctx.font = '700 ' + Math.round(h * 0.045) + 'px Arial'
            ctx.fillText('SPEAKER', w * 0.5, h * 0.53)
            ctx.fillStyle = '#15121f'
            ctx.font = '900 ' + Math.round(h * 0.085) + 'px Arial'
            ctx.fillText('ALON', w * 0.5, h * 0.68)
            ctx.fillStyle = '#4ade80'
            ctx.font = '700 ' + Math.round(h * 0.04) + 'px Arial'
            ctx.fillText('pump.fun — founder', w * 0.5, h * 0.78)
        })
        badge.position.set(4.56, 3.22, 2.9)
        badge.rotation.y = - Math.PI * 0.5
        this.group.add(badge)

        // Open working notebook with pen on the desk
        const notebook = new THREE.Mesh(
            new THREE.PlaneGeometry(0.44, 0.3),
            new THREE.MeshBasicMaterial({ map: this.canvasTexture(440, 300, (ctx, w, h) =>
            {
                ctx.fillStyle = '#fbfaf6'
                ctx.fillRect(0, 0, w, h)
                ctx.strokeStyle = '#d9d5ca'
                ctx.lineWidth = 3
                ctx.beginPath()
                ctx.moveTo(w * 0.5, 8)
                ctx.lineTo(w * 0.5, h - 8)
                ctx.stroke()

                // Left page: wireframe sketch
                ctx.strokeStyle = '#5a626b'
                ctx.lineWidth = 3
                ctx.strokeRect(30, 40, 150, 90)
                ctx.strokeRect(40, 52, 60, 20)
                ctx.strokeRect(40, 80, 130, 14)
                ctx.strokeRect(40, 102, 130, 14)
                ctx.font = '20px ' + marker
                ctx.fillStyle = '#5a626b'
                ctx.fillText('launch flow', 40, 165)
                ctx.fillText('1 click = 1 coin', 40, 195)

                // Right page: numbers
                ctx.fillStyle = '#2b3137'
                ctx.fillText('today:', 250, 60)
                ctx.fillStyle = '#22a85f'
                ctx.fillText('+1,284 launches', 250, 95)
                ctx.fillText('96 graduated', 250, 125)
                ctx.fillStyle = '#e0484f'
                ctx.fillText('fix: curve rounding', 250, 170)
                ctx.fillStyle = '#2b3137'
                ctx.fillText('call w/ exchange 6pm', 250, 205)
            }) })
        )
        notebook.rotation.x = - Math.PI * 0.5
        notebook.rotation.z = 0.28
        notebook.position.set(-1.3, 1.953, -3.55)
        this.group.add(notebook)

        const pen = new THREE.Mesh(
            new THREE.CylinderGeometry(0.011, 0.011, 0.16, 8),
            new THREE.MeshStandardMaterial({ color: '#15121f', roughness: 0.3 })
        )
        pen.rotation.x = Math.PI * 0.5
        pen.rotation.z = 0.9
        pen.position.set(-1.08, 1.962, -3.52)
        this.group.add(pen)

        // Stack of startup documents in the desk corner
        const docs = new THREE.Group()
        docs.position.set(-2.07, 1.95, -3.85)
        this.group.add(docs)

        for(let i = 0; i < 3; i++)
        {
            const sheetStack = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.012, 0.4),
                new THREE.MeshStandardMaterial({ color: i === 2 ? '#f4f1ec' : '#e8e4da', roughness: 0.9 })
            )
            sheetStack.position.set((Math.random() - 0.5) * 0.02, 0.006 + i * 0.013, (Math.random() - 0.5) * 0.02)
            sheetStack.rotation.y = (Math.random() - 0.5) * 0.12
            docs.add(sheetStack)
        }

        const topSheet = new THREE.Mesh(
            new THREE.PlaneGeometry(0.28, 0.38),
            new THREE.MeshBasicMaterial({ map: this.canvasTexture(140, 190, (ctx, w, h) =>
            {
                ctx.fillStyle = '#f4f1ec'
                ctx.fillRect(0, 0, w, h)
                ctx.fillStyle = '#2b3137'
                ctx.font = '900 13px Georgia'
                ctx.textAlign = 'center'
                ctx.fillText('TERM SHEET', w * 0.5, 28)
                ctx.fillStyle = '#9a958a'
                for(let line = 0; line < 9; line++)
                    ctx.fillRect(18, 46 + line * 14, w - 36 - (line % 3) * 14, 4)
            }) })
        )
        topSheet.rotation.x = - Math.PI * 0.5
        topSheet.rotation.z = -0.06
        topSheet.position.set(-2.07, 1.995, -3.85)
        this.group.add(topSheet)

        // Extra whiteboards filling the empty back wall, evenly spaced,
        // all flush on the wall plane (z = -4.93) so nothing clips
        const makeBoard = (_w, _h, _draw) =>
        {
            const board = new THREE.Group()

            const frame = new THREE.Mesh(
                new THREE.BoxGeometry(_w + 0.06, _h + 0.06, 0.03),
                new THREE.MeshStandardMaterial({ color: '#b9bec6', roughness: 0.4 })
            )
            board.add(frame)

            const surface = new THREE.Mesh(
                new THREE.PlaneGeometry(_w, _h),
                new THREE.MeshBasicMaterial({ map: this.canvasTexture(Math.round(_w * 500), Math.round(_h * 500), (ctx, w, h) =>
                {
                    ctx.fillStyle = '#f6f7f4'
                    ctx.fillRect(0, 0, w, h)
                    _draw(ctx, w, h)
                }) })
            )
            surface.position.z = 0.017
            board.add(surface)

            return board
        }

        // Launch-day checklist, between the monitor and the deploy frame
        const boardChecklist = makeBoard(0.78, 0.56, (ctx, w, h) =>
        {
            ctx.fillStyle = '#2b3137'
            ctx.font = '34px ' + marker
            ctx.fillText('$SFS launch day!', 24, 50)

            ctx.font = '27px ' + marker
            ctx.fillText('1. ticker', 60, 105)
            ctx.fillText('2. meme', 60, 150)
            ctx.fillText('3. SHIP', 60, 195)

            ctx.fillStyle = '#22a85f'
            ctx.font = '30px ' + marker
            ctx.fillText('✓', 22, 107)
            ctx.fillText('✓', 22, 152)

            // Little rocket doodle
            ctx.strokeStyle = '#e0484f'
            ctx.lineWidth = 4
            ctx.beginPath()
            ctx.moveTo(260, 200)
            ctx.lineTo(290, 140)
            ctx.lineTo(320, 200)
            ctx.closePath()
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(290, 140)
            ctx.lineTo(290, 110)
            ctx.stroke()

            ctx.fillStyle = '#3a6fd8'
            ctx.font = '24px ' + marker
            ctx.fillText('no sleep till raydium', 24, 250)
        })
        boardChecklist.position.set(0.55, 3.74, -4.93)
        this.group.add(boardChecklist)

        // Graduation funnel, upper right wall
        const boardFunnel = makeBoard(0.75, 0.55, (ctx, w, h) =>
        {
            ctx.fillStyle = '#2b3137'
            ctx.font = '30px ' + marker
            ctx.fillText('graduation funnel', 24, 46)

            ctx.font = '26px ' + marker
            ctx.fillText('1284 launches', 40, 110)
            ctx.fillText('96 graduated', 70, 175)
            ctx.fillStyle = '#22a85f'
            ctx.fillText('7.5% — not bad!', 100, 240)

            ctx.strokeStyle = '#e0484f'
            ctx.lineWidth = 4
            for(const y of [125, 190])
            {
                ctx.beginPath()
                ctx.moveTo(150, y)
                ctx.lineTo(150, y + 25)
                ctx.lineTo(143, y + 16)
                ctx.moveTo(150, y + 25)
                ctx.lineTo(157, y + 16)
                ctx.stroke()
            }
        })
        boardFunnel.position.set(3.3, 4.45, -4.93)
        this.group.add(boardFunnel)

        // Roadmap board, upper left above the big whiteboard
        const boardRoadmap = makeBoard(0.85, 0.5, (ctx, w, h) =>
        {
            ctx.fillStyle = '#2b3137'
            ctx.font = '32px ' + marker
            ctx.fillText('roadmap:', 24, 50)

            ctx.font = '27px ' + marker
            ctx.fillStyle = '#22a85f'
            ctx.fillText('hold', 70, 110)
            ctx.fillStyle = '#2b3137'
            ctx.fillText('hold more', 170, 110)
            ctx.fillStyle = '#3a6fd8'
            ctx.fillText('moon', 330, 110)

            ctx.strokeStyle = '#e0484f'
            ctx.lineWidth = 4
            ctx.beginPath()
            ctx.moveTo(125, 102)
            ctx.lineTo(160, 102)
            ctx.moveTo(295, 102)
            ctx.lineTo(322, 102)
            ctx.stroke()

            ctx.fillStyle = '#e0484f'
            ctx.font = '24px ' + marker
            ctx.fillText('creator rewards -> buy back $SFS', 24, 180)
        })
        boardRoadmap.position.set(-1.5, 4.62, -4.93)
        this.group.add(boardRoadmap)

        // Hardware wallet by the monitor — small easter egg
        const wallet = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.018, 0.034),
            new THREE.MeshStandardMaterial({ color: '#1a1d24', roughness: 0.3, metalness: 0.4 })
        )
        wallet.position.set(2.0, 1.96, -3.55)
        wallet.rotation.y = 0.5
        this.group.add(wallet)

        const walletLed = new THREE.Mesh(
            new THREE.SphereGeometry(0.006, 6, 6),
            new THREE.MeshBasicMaterial({ color: this.palette.green })
        )
        walletLed.position.set(2.04, 1.97, -3.53)
        this.group.add(walletLed)
    }

    setTvStandVitrine()
    {
        // Elegant gold-trimmed display vitrine for the genesis pill, sitting
        // flat on the tv-stand top (surface height measured directly — the
        // raycast caught a thin back lip and was unreliable here).
        const px = 3.6
        const pz = 0.5
        const surfaceY = 1.305

        const vitrine = new THREE.Group()
        vitrine.position.set(px, surfaceY, pz)
        vitrine.scale.setScalar(0.5)
        this.group.add(vitrine)

        const dark = new THREE.MeshStandardMaterial({ color: '#13111b', roughness: 0.4, metalness: 0.2 })
        const gold = new THREE.MeshStandardMaterial({ color: '#e8c66a', roughness: 0.25, metalness: 0.85 })

        // Two-tier plinth base (wider bottom, stepped top) with a gold trim ring
        const baseBottom = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.62), dark)
        baseBottom.position.y = 0.03
        vitrine.add(baseBottom)

        const baseTop = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.52), dark)
        baseTop.position.y = 0.085
        vitrine.add(baseTop)

        const goldRing = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.012, 0.55),
            gold
        )
        goldRing.position.y = 0.062
        vitrine.add(goldRing)

        // Round pedestal the pill rests on
        const pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.15, 0.05, 24),
            gold
        )
        pedestal.position.y = 0.135
        vitrine.add(pedestal)

        // Brass plaque on the base front
        const plaque = new THREE.Mesh(
            new THREE.PlaneGeometry(0.34, 0.045),
            new THREE.MeshBasicMaterial({ map: this.canvasTexture(340, 46, (ctx, w, h) =>
            {
                ctx.fillStyle = '#0d0b12'
                ctx.fillRect(0, 0, w, h)
                ctx.strokeStyle = '#e8c66a'
                ctx.lineWidth = 2
                ctx.strokeRect(4, 4, w - 8, h - 8)
                ctx.fillStyle = '#f0c75e'
                ctx.font = '700 24px Georgia'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText('GENESIS PILL · 1 / 1', w * 0.5, h * 0.56)
            }) })
        )
        plaque.position.set(0, 0.085, 0.311)
        vitrine.add(plaque)

        // Slim gold corner posts
        const caseH = 0.6
        const postY = 0.11 + caseH * 0.5
        for(const sx of [-1, 1])
        {
            for(const sz of [-1, 1])
            {
                const post = new THREE.Mesh(new THREE.BoxGeometry(0.026, caseH, 0.026), gold)
                post.position.set(sx * 0.24, postY, sz * 0.24)
                vitrine.add(post)

                // little gold feet caps at the post bottoms
                const cap = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), gold)
                cap.position.set(sx * 0.24, 0.11, sz * 0.24)
                vitrine.add(cap)
            }
        }

        // Clear glass walls
        const glass = new THREE.Mesh(
            new THREE.BoxGeometry(0.47, caseH, 0.47),
            new THREE.MeshStandardMaterial({
                color: '#dff1ff',
                roughness: 0.03,
                metalness: 0,
                transparent: true,
                opacity: 0.1
            })
        )
        glass.position.y = postY
        vitrine.add(glass)

        // Stepped lid with a gold rim and a small finial on top
        const lid = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.56), dark)
        lid.position.y = 0.11 + caseH + 0.025
        vitrine.add(lid)

        const lidTrim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.014, 0.5), gold)
        lidTrim.position.y = 0.11 + caseH + 0.057
        vitrine.add(lidTrim)

        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), gold)
        finial.position.y = 0.11 + caseH + 0.085
        vitrine.add(finial)

        // Soft green base glow line
        const baseStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.014, 0.014),
            new THREE.MeshBasicMaterial({ color: this.palette.green })
        )
        baseStrip.position.set(0, 0.112, 0.235)
        vitrine.add(baseStrip)

        // Gold pill on the pedestal
        const trophy = this.makeTrophyPill(0.44)
        trophy.position.y = 0.16
        trophy.rotation.y = -0.6
        vitrine.add(trophy)

        // Inner display light under the lid
        const innerLight = new THREE.PointLight('#ffe9b8', 0.45, 1.0)
        innerLight.position.set(px, surfaceY + 0.32, pz)
        this.scene.add(innerLight)
    }

    setLedStrips()
    {
        // Soft pink underglow along the desk front edge
        const deskStrip = new THREE.Mesh(
            new THREE.BoxGeometry(4.5, 0.025, 0.025),
            new THREE.MeshBasicMaterial({ color: this.palette.pink })
        )
        deskStrip.position.set(0.15, 1.86, -3.22)
        this.group.add(deskStrip)
    }

    setLights()
    {
        // Cinematic neon accents that catch the doll and the collectibles
        this.lights = {}

        this.lights.green = new THREE.PointLight(this.palette.green, 0.5, 8)
        this.lights.green.position.set(3.9, 4.5, 0.4)
        this.scene.add(this.lights.green)

        this.lights.pink = new THREE.PointLight(this.palette.pink, 0.4, 7)
        this.lights.pink.position.set(2.0, 4.4, -4.2)
        this.scene.add(this.lights.pink)

        this.lights.gallery = new THREE.PointLight('#cdb9ff', 0.55, 5)
        this.lights.gallery.position.set(-3.6, 6.1, -3.0)
        this.scene.add(this.lights.gallery)
    }

    update()
    {
        const elapsed = this.time.elapsed

        // Very subtle neon breathing
        const flicker = 0.94
            + Math.sin(elapsed * 0.0021) * 0.04
            + Math.sin(elapsed * 0.0007) * 0.02

        for(const material of this.flickerMaterials)
            material.opacity = flicker

        // Occasional glitchy blink bursts for the big sign
        if(!this.blink)
            this.blink = { nextAt: elapsed + 3000, burstEnd: 0 }

        if(elapsed > this.blink.nextAt)
        {
            this.blink.burstEnd = elapsed + 200 + Math.random() * 500
            this.blink.nextAt = elapsed + 3000 + Math.random() * 6000
        }

        const blinkOpacity = elapsed < this.blink.burstEnd
            ? (Math.random() < 0.45 ? 0.15 + Math.random() * 0.3 : 1)
            : 0.97

        for(const material of this.blinkMaterials)
            material.opacity = blinkOpacity
    }
}
