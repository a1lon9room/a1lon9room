import * as THREE from 'three'

import Experience from './Experience.js'

// Chair contact measurements (world space, taken from the chair geometry):
// seat cushion top y = 1.66, armrest pad tops y = 2.03 at z offset +-0.62,
// usable seat depth (doll local z) from -0.31 (backrest) to +0.89 (front edge)
const SEAT_TOP = 1.66
const ARMREST_TOP = 2.03
const ARMREST_OFFSET = 0.58

// Yaw of the generated GLB so it faces local +z (tune per generated model).
// TRELLIS export faces +z already, so no extra turn.
const GLB_YAW_OFFSET = 0

export default class Doll
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.world = this.experience.world
        this.time = this.experience.time
        this.resources = this.experience.resources

        // Spring physics state
        this.physics = {}
        this.physics.yaw = 0
        this.physics.yawVelocity = 0
        this.physics.roll = 0
        this.physics.rollVelocity = 0
        this.physics.headYaw = 0
        this.physics.headYawVelocity = 0
        this.physics.armSwing = 0
        this.physics.armSwingVelocity = 0

        this.setMaterials()
        this.setLights()
        this.setModel()
    }

    setMaterials()
    {
        this.materials = {}

        this.materials.skin = new THREE.MeshStandardMaterial({ color: '#e9b890', roughness: 0.6 })
        this.materials.hair = new THREE.MeshStandardMaterial({ color: '#7d7f83', roughness: 0.75 })
        this.materials.blush = new THREE.MeshStandardMaterial({ color: '#dd8a6a', roughness: 1 })
        this.materials.tank = new THREE.MeshStandardMaterial({ color: '#fafafa', roughness: 0.85 })
        this.materials.shorts = new THREE.MeshStandardMaterial({ color: '#4a5052', roughness: 0.95 })
        this.materials.goggleFrame = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 })
        this.materials.lens = new THREE.MeshStandardMaterial({ color: '#241813', roughness: 0.25 })
        this.materials.sock = new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.9 })
        this.materials.sneaker = new THREE.MeshStandardMaterial({ color: '#f0efea', roughness: 0.55 })
        this.materials.mouth = new THREE.MeshStandardMaterial({ color: '#4a3832', roughness: 0.8 })
        this.materials.brow = new THREE.MeshStandardMaterial({ color: '#6b5f53', roughness: 0.9 })

        this.materials.cap = new THREE.MeshStandardMaterial({
            map: this.createCapTexture(),
            roughness: 0.85
        })
        this.materials.capBlack = new THREE.MeshStandardMaterial({ color: '#0b0b0e', roughness: 0.9 })

        this.materials.shorts.map = this.createShortsTexture()
    }

    // Gadsden baseball cap: yellow front panel with the coiled snake and
    // "DON'T TREAD ON ME", black sides and back (front of the head is u=0.5)
    createCapTexture()
    {
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 512
        const context = canvas.getContext('2d')

        // Black base
        context.fillStyle = '#1a1a1e'
        context.fillRect(0, 0, canvas.width, canvas.height)

        // Yellow front panel
        context.fillStyle = '#e8c61f'
        context.beginPath()
        context.moveTo(canvas.width * 0.28, canvas.height)
        context.lineTo(canvas.width * 0.3, 90)
        context.quadraticCurveTo(canvas.width * 0.5, 30, canvas.width * 0.7, 90)
        context.lineTo(canvas.width * 0.72, canvas.height)
        context.closePath()
        context.fill()

        // Panel seams
        context.strokeStyle = 'rgba(0, 0, 0, 0.2)'
        context.lineWidth = 5
        for(const u of [0.28, 0.5, 0.72, 0.06, 0.94])
        {
            context.beginPath()
            context.moveTo(canvas.width * u, 70)
            context.lineTo(canvas.width * u, canvas.height)
            context.stroke()
        }

        // Coiled snake: dark body with golden pattern, sitting on grass
        const cx = canvas.width * 0.5
        const cy = 210

        const coil = (strokeStyle, lineWidth) =>
        {
            context.strokeStyle = strokeStyle
            context.lineWidth = lineWidth
            context.lineCap = 'round'
            context.beginPath()
            for(let a = 0; a < Math.PI * 4.4; a += 0.08)
            {
                const r = 5 + a * 6.2
                const x = cx + Math.cos(a + 2.2) * r * 1.1
                const y = cy + Math.sin(a + 2.2) * r * 0.42
                if(a === 0) context.moveTo(x, y)
                else context.lineTo(x, y)
            }
            context.stroke()
        }

        coil('#2c2417', 17)
        coil('#d9b81f', 8)

        // Raised snake head
        context.strokeStyle = '#2c2417'
        context.lineWidth = 12
        context.beginPath()
        context.moveTo(cx + 68, cy - 22)
        context.quadraticCurveTo(cx + 96, cy - 38, cx + 90, cy - 62)
        context.stroke()
        context.fillStyle = '#2c2417'
        context.beginPath()
        context.ellipse(cx + 92, cy - 68, 19, 11, -0.5, 0, Math.PI * 2)
        context.fill()

        // Grass: one soft mound under the coil
        context.strokeStyle = '#3f7a33'
        context.lineWidth = 6
        context.beginPath()
        context.moveTo(cx - 95, cy + 62)
        context.quadraticCurveTo(cx, cy + 78, cx + 95, cy + 62)
        context.stroke()

        // Motto, squeezed so it stays on the front panel
        context.fillStyle = '#16161a'
        context.font = '900 58px Arial, sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.save()
        context.translate(canvas.width * 0.5, 392)
        context.scale(0.52, 1)
        context.fillText("DON'T TREAD ON ME", 0, 0)
        context.restore()

        const texture = new THREE.CanvasTexture(canvas)
        texture.encoding = THREE.sRGBEncoding
        texture.anisotropy = 4

        return texture
    }

    // Worn dark denim with ripped patches and fray
    createShortsTexture()
    {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const context = canvas.getContext('2d')

        context.fillStyle = '#4d5156'
        context.fillRect(0, 0, canvas.width, canvas.height)

        // Fabric weave
        context.strokeStyle = 'rgba(0, 0, 0, 0.12)'
        context.lineWidth = 2
        for(let i = 0; i < 26; i++)
        {
            context.beginPath()
            context.moveTo(0, i * 10 + 4)
            context.lineTo(256, i * 10)
            context.stroke()
        }

        // Ripped holes with frayed threads
        for(const hole of [[70, 150, 36, 14], [180, 90, 28, 11]])
        {
            context.fillStyle = '#23262a'
            context.beginPath()
            context.ellipse(hole[0], hole[1], hole[2], hole[3], -0.15, 0, Math.PI * 2)
            context.fill()

            context.strokeStyle = '#9aa0a6'
            context.lineWidth = 2
            for(let i = 0; i < 6; i++)
            {
                const x = hole[0] - hole[2] + (i / 5) * hole[2] * 2
                context.beginPath()
                context.moveTo(x, hole[1] - hole[3] - 3)
                context.lineTo(x + 4, hole[1] + hole[3] + 3)
                context.stroke()
            }
        }

        const texture = new THREE.CanvasTexture(canvas)
        texture.encoding = THREE.sRGBEncoding

        return texture
    }

    createTankTexture()
    {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const context = canvas.getContext('2d')

        context.clearRect(0, 0, canvas.width, canvas.height)
        context.fillStyle = '#0d0d0d'
        context.font = '900 62px "Arial Black", Arial, sans-serif'
        context.textAlign = 'center'

        context.save()
        context.translate(128, 0)
        context.scale(0.92, 1)
        context.fillText('STOP', 0, 72)
        context.fillText('BEING', 0, 142)
        context.fillText('POOR', 0, 212)
        context.restore()

        const texture = new THREE.CanvasTexture(canvas)
        texture.encoding = THREE.sRGBEncoding

        return texture
    }

    createShadowTexture()
    {
        const canvas = document.createElement('canvas')
        canvas.width = 128
        canvas.height = 128
        const context = canvas.getContext('2d')

        const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64)
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.5)')
        gradient.addColorStop(0.65, 'rgba(0, 0, 0, 0.22)')
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

        context.fillStyle = gradient
        context.fillRect(0, 0, 128, 128)

        return new THREE.CanvasTexture(canvas)
    }

    setLights()
    {
        // Only the doll uses lit materials, the rest of the room is baked
        this.lights = {}

        this.lights.hemi = new THREE.HemisphereLight('#cdc1f5', '#5a4636', 0.6)
        this.scene.add(this.lights.hemi)

        this.lights.key = new THREE.DirectionalLight('#ffd9b0', 0.8)
        this.lights.key.position.set(-2, 4, 3)
        this.scene.add(this.lights.key)

        this.lights.rim = new THREE.DirectionalLight('#b388ff', 0.4)
        this.lights.rim.position.set(2, 3, -3)
        this.scene.add(this.lights.rim)
    }

    // Tapered limb segment between two points with rounded joints
    segment(_from, _to, _radiusFrom, _radiusTo, _material, _parent)
    {
        const direction = new THREE.Vector3().subVectors(_to, _from)
        const length = direction.length()

        const cylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(_radiusTo, _radiusFrom, length, 12),
            _material
        )
        cylinder.position.copy(_from).add(direction.clone().multiplyScalar(0.5))
        cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize())
        _parent.add(cylinder)

        const joint = new THREE.Mesh(new THREE.SphereGeometry(_radiusTo, 12, 10), _material)
        joint.position.copy(_to)
        _parent.add(joint)

        return cylinder
    }

    setModel()
    {
        // Doll is built facing local +z, hips at local origin.
        // Group sits at the chair swivel pivot so the sway rotates correctly.
        this.group = new THREE.Group()
        this.group.position.set(0.8117, SEAT_TOP + 0.19, -1.5329)
        this.scene.add(this.group)

        // Lean pivot (small roll/pitch reactions live here)
        this.root = new THREE.Group()
        this.root.position.z = -0.12
        this.group.add(this.root)

        this.setShadow()

        // Generated GLB hero (Hunyuan3D/TRELLIS, seated pose) when available,
        // procedural doll otherwise
        if(this.resources.items.heroModel)
        {
            this.setGlbModel()
        }
        else
        {
            this.setBody()
            this.setArms()
            this.setLegs()
            this.setHead()
        }
    }

    // Density-based ambient occlusion baked into a vertex-color attribute:
    // vertices surrounded by more geometry (crevices, under the cap brim,
    // between the legs) get darker, the way the baked room furniture does.
    bakeAmbientOcclusion(_model)
    {
        _model.traverse((_child) =>
        {
            if(!_child.isMesh)
                return

            const geometry = _child.geometry
            const position = geometry.attributes.position
            const count = position.count

            // Hash grid of occupied cells
            const cell = 0.022
            const grid = new Map()
            const key = (x, y, z) =>
                (Math.floor(x / cell)) + '_' + (Math.floor(y / cell)) + '_' + (Math.floor(z / cell))

            for(let i = 0; i < count; i++)
            {
                const k = key(position.getX(i), position.getY(i), position.getZ(i))
                grid.set(k, (grid.get(k) || 0) + 1)
            }

            // Count neighbours in a 5^3 block around each vertex
            const colors = new Float32Array(count * 3)
            let maxNeighbours = 1
            const counts = new Float32Array(count)

            for(let i = 0; i < count; i++)
            {
                const cx = Math.floor(position.getX(i) / cell)
                const cy = Math.floor(position.getY(i) / cell)
                const cz = Math.floor(position.getZ(i) / cell)

                let n = 0
                for(let dx = -2; dx <= 2; dx++)
                    for(let dy = -2; dy <= 2; dy++)
                        for(let dz = -2; dz <= 2; dz++)
                            n += grid.get((cx + dx) + '_' + (cy + dy) + '_' + (cz + dz)) || 0

                counts[i] = n
                if(n > maxNeighbours)
                    maxNeighbours = n
            }

            // Map density to a SUBTLE occlusion multiplier (0.82 deepest ..
            // 1.0 open). Light touch so the texture's printed text on the
            // shirt and cap stays crisp instead of being muddied.
            for(let i = 0; i < count; i++)
            {
                const density = counts[i] / maxNeighbours
                const ao = THREE.MathUtils.clamp(1.0 - Math.pow(density, 0.7) * 0.32, 0.82, 1.0)
                colors[i * 3] = ao
                colors[i * 3 + 1] = ao
                colors[i * 3 + 2] = ao
            }

            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
            _child.material.vertexColors = true
        })
    }

    setGlbModel()
    {
        this.glbMode = true

        const model = this.resources.items.heroModel.scene

        // Detect the Blender-baked export: its lighting + AO live in an
        // emissive texture, so we render it flat (unlit) exactly like the
        // baked room furniture — no dynamic lights, no AO re-bake.
        let baked = false
        model.traverse((_child) =>
        {
            if(_child.isMesh && _child.material && _child.material.emissiveMap)
                baked = true
        })

        if(baked)
        {
            model.traverse((_child) =>
            {
                if(!_child.isMesh)
                    return

                const tex = _child.material.emissiveMap || _child.material.map
                tex.encoding = THREE.sRGBEncoding
                tex.anisotropy = 8
                _child.material = new THREE.MeshBasicMaterial({ map: tex })
            })
        }
        else
        this.applyGeneratedMaterials(model)

        // Normalize: uniform scale to sitting height, centered, facing +z local
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())

        // Chair-sized like the reference render: head reaches the headrest
        const targetHeight = 2.7
        const scale = targetHeight / size.y

        const holder = new THREE.Group()
        model.position.set(- center.x, - box.min.y, - center.z)
        holder.add(model)
        holder.scale.setScalar(scale)

        // Sit on the cushion but high enough that the hands rest on the
        // armrests instead of sinking into them
        holder.position.y = SEAT_TOP - this.group.position.y - 0.4
        holder.position.z = 0.4
        holder.rotation.y = GLB_YAW_OFFSET

        this.root.add(holder)
        this.glbHolder = holder

        // (Text decals removed — the printed slogans stay as they are in the
        // generated texture)

        if(baked)
        {
            // Lighting is painted into the texture — leave the procedural
            // lamps off and add nothing; it already matches the room.
            if(this.lights)
            {
                if(this.lights.hemi) this.lights.hemi.intensity = 0
                if(this.lights.key) this.lights.key.intensity = 0
                if(this.lights.rim) this.lights.rim.intensity = 0
            }
            return
        }

        // Raw generated mesh fallback: bake AO + soft lighting at runtime
        this.bakeAmbientOcclusion(model)

        if(this.lights)
        {
            if(this.lights.hemi) this.lights.hemi.intensity = 0
            if(this.lights.key) this.lights.key.intensity = 0
            if(this.lights.rim) this.lights.rim.intensity = 0
        }

        // Bright, even, studio-style lighting so the texture (and its printed
        // text) reads clearly, like the clean turntable render
        const sky = new THREE.HemisphereLight('#fff4ea', '#6a5a70', 1.5)
        this.scene.add(sky)

        const key = new THREE.DirectionalLight('#fff2e2', 0.7)
        key.position.set(this.group.position.x - 1, this.group.position.y + 3, this.group.position.z + 2.5)
        this.scene.add(key)

        // Soft front fill to light the face and chest print evenly
        const fillFront = new THREE.DirectionalLight('#ffffff', 0.5)
        fillFront.position.set(this.group.position.x, this.group.position.y + 1.2, this.group.position.z + 3)
        this.scene.add(fillFront)
    }

    // Crisp text overlays: the AI texture blurs the printed slogans, so we
    // draw them sharply on small planes sitting just in front of the shirt
    // and the cap brim. Parented to the holder so they sway with the model.
    textDecalTexture(_lines, _fontScale)
    {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, 512, 512)

        ctx.fillStyle = '#111111'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const lineH = 512 * 0.26 * _fontScale
        ctx.font = '900 ' + Math.round(512 * 0.22 * _fontScale) + 'px "Arial Black", Arial, sans-serif'
        const startY = 256 - ((_lines.length - 1) * lineH) / 2
        _lines.forEach((line, i) =>
        {
            ctx.fillText(line, 256, startY + i * lineH)
        })

        const tex = new THREE.CanvasTexture(canvas)
        tex.encoding = THREE.sRGBEncoding
        tex.anisotropy = 8
        return tex
    }

    setGlbDecals(_model)
    {
        // Attach decals directly to the mesh, in its own bounding-box space,
        // so they ride with the body through every parent scale/rotation.
        let mesh = null
        _model.traverse((o) => { if(o.isMesh && !mesh) mesh = o })
        if(!mesh)
            return

        // Work entirely in world space, then attach to the body so the decal
        // rides along but keeps the placement we computed.
        mesh.updateWorldMatrix(true, true)
        mesh.geometry.computeBoundingBox()
        const bb = mesh.geometry.boundingBox

        const V = THREE.Vector3
        const worldBox = bb.clone().applyMatrix4(mesh.matrixWorld)
        const size = worldBox.getSize(new V())
        const center = worldBox.getCenter(new V())
        const bodyW = Math.max(size.x, size.z)

        // "Front" = the horizontal direction the doll faces, i.e. toward the
        // room/camera. Derive it from the camera so the push and the facing
        // are always correct regardless of the imported mesh's local axes.
        const camPos = this.experience.camera.instance.getWorldPosition(new V())
        const front = new V(camPos.x - center.x, 0, camPos.z - center.z).normalize()
        // Push only to the body's front surface (half the depth along front),
        // not past it toward the window
        const halfDepth = (Math.abs(front.x) * size.x + Math.abs(front.z) * size.z) * 0.5

        const makeDecal = (planeW, planeH, lines, fontScale, heightFrac, surfacePush, tilt) =>
        {
            const m = new THREE.Mesh(
                new THREE.PlaneGeometry(planeW, planeH),
                new THREE.MeshBasicMaterial({
                    map: this.textDecalTexture(lines, fontScale),
                    transparent: true,
                    depthWrite: false,
                    side: THREE.DoubleSide
                })
            )
            const pos = new V(
                center.x + front.x * surfacePush,
                worldBox.min.y + size.y * heightFrac,
                center.z + front.z * surfacePush
            )
            m.position.copy(pos)
            m.lookAt(pos.clone().add(front))
            if(tilt)
                m.rotateX(tilt)
            this.scene.add(m)
            this.glbHolder.attach(m)   // keep world transform, ride with body
            return m
        }

        // Chest "STOP BEING POOR" and cap "DON'T TREAD ON ME". Sit just on the
        // front surface (halfDepth + a sliver) so the text hugs the body.
        this.chestDecal = makeDecal(bodyW * 0.2, bodyW * 0.2,
            ['STOP', 'BEING', 'POOR'], 1.0, 0.44, halfDepth * 0.82, 0)
        this.capDecal = makeDecal(bodyW * 0.6, bodyW * 0.12,
            ["DON'T TREAD ON ME"], 0.5, 0.88, halfDepth * 0.52, -0.42)
    }

    // Material/colour treatment for a raw generated (un-baked) mesh
    applyGeneratedMaterials(model)
    {
        const hsl = {}
        model.traverse((_child) =>
        {
            if(!_child.isMesh)
                return

            const colorAttribute = _child.geometry.attributes.color
            if(colorAttribute)
            {
                // r130 BufferAttribute returns RAW values for normalized
                // uint8 colors — scale manually both ways. The generated
                // colors are real but very dark (yellow cap lum~0.19, etc),
                // so brighten hard and saturate so the hues actually read.
                const raw = colorAttribute.array
                const scale = (raw instanceof Uint8Array || raw instanceof Uint8ClampedArray) ? 255 : 1

                const color = new THREE.Color()
                for(let i = 0; i < colorAttribute.count; i++)
                {
                    color.setRGB(
                        colorAttribute.getX(i) / scale,
                        colorAttribute.getY(i) / scale,
                        colorAttribute.getZ(i) / scale
                    )
                    color.getHSL(hsl)
                    // Lift darks onto a usable range, then push saturation.
                    // Gentle floor keeps gray shorts/skin from washing white.
                    const lifted = Math.min(1, hsl.l * 1.55 + 0.08)
                    const sat = Math.min(1, hsl.s * 2.2 + 0.03)
                    color.setHSL(hsl.h, sat, lifted)
                    colorAttribute.setXYZ(i, color.r * scale, color.g * scale, color.b * scale)
                }
                colorAttribute.needsUpdate = true
            }

            if(_child.material)
            {
                // Fully matte like the baked room — no plastic specular.
                // Textured (TRELLIS) keeps its baseColorTexture untinted;
                // vertex-colored (TripoSR) keeps the boosted colors.
                _child.material.vertexColors = !!colorAttribute
                _child.material.color = new THREE.Color('#ffffff')
                _child.material.roughness = 1.0
                _child.material.metalness = 0
                if(_child.material.map)
                {
                    _child.material.map.encoding = THREE.sRGBEncoding
                    _child.material.map.anisotropy = 8
                }
                this.glbMaterial = _child.material
            }
        })
    }

    setShadow()
    {
        // Soft contact shadow on the seat cushion
        const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(0.72, 24),
            new THREE.MeshBasicMaterial({
                map: this.createShadowTexture(),
                transparent: true,
                depthWrite: false
            })
        )
        shadow.rotation.x = - Math.PI * 0.5
        shadow.position.set(0, SEAT_TOP - this.group.position.y + 0.012, 0.08)
        this.group.add(shadow)
    }

    setBody()
    {
        // Hips in shorts, slightly sunk into the cushion
        const hips = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), this.materials.shorts)
        hips.scale.set(1.0, 0.75, 0.9)
        this.root.add(hips)

        // Slim torso in a white tank top
        const torso = new THREE.Mesh(new THREE.SphereGeometry(0.37, 18, 16), this.materials.tank)
        torso.scale.set(0.95, 1.3, 0.78)
        torso.position.y = 0.4
        this.root.add(torso)
        this.torso = torso

        // Loose tank hem over the shorts
        const hem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.33, 0.37, 0.16, 18, 1, true),
            this.materials.tank
        )
        hem.position.y = 0.1
        this.root.add(hem)

        // "STOP BEING POOR" print on the chest
        const print = new THREE.Mesh(
            new THREE.PlaneGeometry(0.36, 0.36),
            new THREE.MeshStandardMaterial({
                map: this.createTankTexture(),
                transparent: true,
                roughness: 0.95,
                polygonOffset: true,
                polygonOffsetFactor: -1
            })
        )
        print.position.set(0, 0.44, 0.36)
        print.rotation.x = -0.1
        this.root.add(print)

        // Thin tank top straps close to the neck
        for(const side of [-1, 1])
        {
            const strap = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.2), this.materials.tank)
            strap.position.set(side * 0.14, 0.78, 0.02)
            this.root.add(strap)
        }

        // Neck
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.16, 12), this.materials.skin)
        neck.position.y = 0.82
        this.root.add(neck)
    }

    setArms()
    {
        // Arms reach out and rest on the armrest pads, like in the reference
        this.arms = {}

        const padY = ARMREST_TOP - this.group.position.y
        const padX = ARMREST_OFFSET

        for(const side of [-1, 1])
        {
            const arm = new THREE.Group()
            arm.position.set(side * 0.34, 0.6, 0.02)
            this.root.add(arm)

            // Joint positions in arm-local space
            const shoulder = new THREE.Vector3(0, 0, 0)
            const elbow = new THREE.Vector3(side * 0.14, -0.28, 0.04)
            const wrist = new THREE.Vector3(side * (padX - 0.4), padY + 0.05 - 0.6, 0.24)

            // Deltoid
            const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 12), this.materials.skin)
            arm.add(deltoid)

            // Upper arm and forearm, slim and tapered
            this.segment(shoulder, elbow, 0.072, 0.06, this.materials.skin, arm)
            this.segment(elbow, wrist, 0.058, 0.048, this.materials.skin, arm)

            // Hand resting flat on the pad
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 12), this.materials.skin)
            hand.scale.set(0.95, 0.5, 1.25)
            hand.position.copy(wrist).add(new THREE.Vector3(side * 0.02, -0.045, 0.09))
            arm.add(hand)

            // Thumb
            const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), this.materials.skin)
            thumb.scale.set(0.8, 0.7, 1.4)
            thumb.position.copy(wrist).add(new THREE.Vector3(- side * 0.08, -0.04, 0.1))
            arm.add(thumb)

            this.arms[side] = arm
        }
    }

    setLegs()
    {
        // Chibi sitting pose: knees up, feet planted on the seat near the front edge
        this.legs = {}

        const seatY = SEAT_TOP - this.group.position.y

        for(const side of [-1, 1])
        {
            const leg = new THREE.Group()
            leg.position.set(side * 0.18, -0.06, 0.14)
            this.root.add(leg)

            // Joint positions in leg-local space
            const hip = new THREE.Vector3(0, 0, 0)
            const knee = new THREE.Vector3(side * 0.03, 0.16, 0.3)
            const ankle = new THREE.Vector3(side * 0.02, seatY + 0.32, 0.52)

            // Thigh (skin under the shorts)
            this.segment(hip, knee, 0.085, 0.07, this.materials.skin, leg)

            // Baggy denim short leg covering the knee, flared at the frayed hem
            const shortLeg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.13, 0.15, 0.46, 14, 1, true),
                this.materials.shorts
            )
            shortLeg.position.copy(hip).add(knee).multiplyScalar(0.52)
            shortLeg.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3().subVectors(knee, hip).normalize()
            )
            leg.add(shortLeg)

            // Slim shin down to the seat
            this.segment(knee, ankle, 0.06, 0.05, this.materials.skin, leg)

            // White sock
            const sock = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), this.materials.sock)
            sock.position.copy(ankle).add(new THREE.Vector3(0, 0.02, 0.01))
            leg.add(sock)

            // Sneaker resting on the cushion, toes pointing slightly down
            const sneaker = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 12), this.materials.sneaker)
            sneaker.scale.set(0.85, 0.55, 1.35)
            sneaker.rotation.x = 0.22
            sneaker.position.copy(ankle).add(new THREE.Vector3(0, -0.045, 0.08))
            leg.add(sneaker)

            this.legs[side] = leg
        }
    }

    setHead()
    {
        this.headGroup = new THREE.Group()
        this.headGroup.position.y = 0.94
        this.root.add(this.headGroup)

        // Wide, slightly flattened chibi head — not a perfect ball
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 28, 22), this.materials.skin)
        head.scale.set(1.16, 0.94, 1.02)
        head.position.y = 0.34
        this.headGroup.add(head)

        // Soft jaw to round the lower face
        const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16), this.materials.skin)
        jaw.scale.set(1.18, 0.86, 1)
        jaw.position.set(0, 0.21, 0.04)
        this.headGroup.add(jaw)

        this.setHair()
        this.setCap()
        this.setGlasses()
        this.setEarsAndBlush()

        // Small nose bump
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), this.materials.skin)
        nose.scale.set(0.9, 0.7, 0.6)
        nose.position.set(0, 0.17, 0.47)
        this.headGroup.add(nose)

        // Small flat mouth centered on the face
        const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), this.materials.mouth)
        mouth.scale.set(1.1, 0.32, 0.3)
        mouth.position.set(0, 0.09, 0.45)
        this.headGroup.add(mouth)
    }

    setHair()
    {
        // Bob shell wrapping the back and sides, down to the nape
        const shell = new THREE.Mesh(
            new THREE.SphereGeometry(0.49, 26, 20, Math.PI * 0.82, Math.PI * 1.36, Math.PI * 0.12, Math.PI * 0.72),
            this.materials.hair
        )
        shell.scale.set(1.16, 1.04, 1.1)
        shell.position.set(0, 0.32, -0.02)
        this.headGroup.add(shell)

        // Layered strands framing the face (positions, scales, tilts)
        const strands = [
            // Side curtains down to the chin
            { p: [0.46, 0.16, 0.2], s: [0.5, 1.8, 0.75], r: 0.12 },
            { p: [-0.46, 0.16, 0.2], s: [0.5, 1.8, 0.75], r: -0.12 },
            // Strands closer to the jaw
            { p: [0.38, 0.1, 0.33], s: [0.4, 1.3, 0.55], r: 0.2 },
            { p: [-0.38, 0.1, 0.33], s: [0.4, 1.3, 0.55], r: -0.2 },
            // Back volume at the nape
            { p: [0.3, 0.05, -0.3], s: [0.6, 1.5, 0.8], r: 0.25 },
            { p: [-0.3, 0.05, -0.3], s: [0.6, 1.5, 0.8], r: -0.25 },
            { p: [0, 0.04, -0.4], s: [0.9, 1.4, 0.6], r: 0 }
        ]

        for(const strand of strands)
        {
            const lock = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), this.materials.hair)
            lock.position.set(strand.p[0], strand.p[1], strand.p[2])
            lock.scale.set(strand.s[0], strand.s[1], strand.s[2])
            lock.rotation.z = strand.r
            this.headGroup.add(lock)
        }

        // Ring of hair poking out under the cap edge, all around
        const capRing = new THREE.Mesh(
            new THREE.SphereGeometry(0.47, 26, 8, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.22),
            this.materials.hair
        )
        capRing.scale.set(1.09, 1.04, 1.06)
        capRing.position.set(0, 0.33, -0.01)
        this.headGroup.add(capRing)

        // Messy bangs poking out under the bandana brim
        const bangs = [
            { p: [0.0, 0.46, 0.42], s: [2.2, 0.55, 0.5] },
            { p: [0.24, 0.44, 0.4], s: [1.2, 0.5, 0.45] },
            { p: [-0.24, 0.44, 0.4], s: [1.2, 0.5, 0.45] },
            { p: [0.38, 0.42, 0.24], s: [0.7, 0.85, 0.45] },
            { p: [-0.38, 0.42, 0.24], s: [0.7, 0.85, 0.45] }
        ]

        for(const tuft of bangs)
        {
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), this.materials.hair)
            mesh.position.set(tuft.p[0], tuft.p[1], tuft.p[2])
            mesh.scale.set(tuft.s[0], tuft.s[1], tuft.s[2])
            this.headGroup.add(mesh)
        }

        // Pointed strand tips for a layered, slightly messy haircut —
        // individual strands all around, varied lengths and tilts
        const tips = [
            // Hanging below the side curtains
            { p: [0.47, 0.0, 0.2], rz: Math.PI, rx: 0, l: 0.2, r: 0.05 },
            { p: [-0.47, 0.0, 0.2], rz: Math.PI, rx: 0, l: 0.2, r: 0.05 },
            { p: [0.5, 0.04, 0.06], rz: Math.PI + 0.12, rx: -0.05, l: 0.24, r: 0.055 },
            { p: [-0.5, 0.04, 0.06], rz: Math.PI - 0.12, rx: -0.05, l: 0.24, r: 0.055 },
            { p: [0.38, -0.04, 0.33], rz: Math.PI, rx: 0.1, l: 0.16, r: 0.045 },
            { p: [-0.38, -0.04, 0.33], rz: Math.PI, rx: 0.1, l: 0.16, r: 0.045 },
            { p: [0.44, -0.02, -0.14], rz: Math.PI - 0.15, rx: -0.1, l: 0.21, r: 0.05 },
            { p: [-0.44, -0.02, -0.14], rz: Math.PI + 0.15, rx: -0.1, l: 0.21, r: 0.05 },
            // At the nape, uneven lengths
            { p: [0.3, -0.08, -0.3], rz: Math.PI - 0.1, rx: -0.15, l: 0.2, r: 0.05 },
            { p: [-0.3, -0.08, -0.3], rz: Math.PI + 0.1, rx: -0.15, l: 0.2, r: 0.05 },
            { p: [0.14, -0.12, -0.38], rz: Math.PI, rx: -0.22, l: 0.17, r: 0.045 },
            { p: [-0.14, -0.12, -0.38], rz: Math.PI, rx: -0.22, l: 0.17, r: 0.045 },
            { p: [0.0, -0.1, -0.42], rz: Math.PI + 0.08, rx: -0.25, l: 0.19, r: 0.05 },
            // Bangs tips over the forehead, alternating tilt, below the brim
            { p: [0.12, 0.41, 0.43], rz: Math.PI + 0.08, rx: 0.22, l: 0.14, r: 0.042 },
            { p: [-0.1, 0.42, 0.44], rz: Math.PI - 0.1, rx: 0.22, l: 0.13, r: 0.042 },
            { p: [0.01, 0.4, 0.45], rz: Math.PI, rx: 0.25, l: 0.15, r: 0.04 },
            { p: [0.3, 0.4, 0.36], rz: Math.PI + 0.14, rx: 0.18, l: 0.12, r: 0.04 },
            { p: [-0.3, 0.4, 0.36], rz: Math.PI - 0.14, rx: 0.18, l: 0.12, r: 0.04 },
            { p: [0.21, 0.41, 0.4], rz: Math.PI - 0.06, rx: 0.2, l: 0.11, r: 0.036 },
            { p: [-0.21, 0.41, 0.4], rz: Math.PI + 0.06, rx: 0.2, l: 0.11, r: 0.036 }
        ]

        for(const tip of tips)
        {
            const strand = new THREE.Mesh(new THREE.ConeGeometry(tip.r, tip.l, 8), this.materials.hair)
            strand.position.set(tip.p[0], tip.p[1], tip.p[2])
            strand.rotation.z = tip.rz
            strand.rotation.x = tip.rx
            this.headGroup.add(strand)
        }
    }

    setCap()
    {
        // Crown: dome with the Gadsden texture, sitting on the hair
        const crown = new THREE.Mesh(
            new THREE.SphereGeometry(0.49, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52),
            this.materials.cap
        )
        crown.scale.set(1.14, 0.7, 1.06)
        crown.position.y = 0.52
        crown.rotation.y = - Math.PI * 0.5
        this.headGroup.add(crown)

        // Button on top
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), this.materials.capBlack)
        button.position.y = 0.52 + 0.49 * 0.7
        this.headGroup.add(button)

        // Big curved black brim over the face — flat dark material so it
        // always reads black like in the reference
        const brim = new THREE.Mesh(
            new THREE.SphereGeometry(0.36, 24, 12),
            new THREE.MeshBasicMaterial({ color: '#17171c' })
        )
        brim.scale.set(1.42, 0.07, 1.25)
        brim.position.set(0, 0.51, 0.42)
        brim.rotation.x = 0.12
        this.headGroup.add(brim)
        this.capBrim = brim
    }

    setGlasses()
    {
        // Big round white sunglasses with dark brown lenses
        const glasses = new THREE.Group()
        glasses.position.set(0, 0.28, 0.43)

        for(const side of [-1, 1])
        {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.055, 16, 30), this.materials.goggleFrame)
            ring.position.x = side * 0.2
            glasses.add(ring)

            const lens = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), this.materials.lens)
            lens.scale.set(1, 1, 0.35)
            lens.position.set(side * 0.2, 0, 0.015)
            glasses.add(lens)

            // Tiny faint glare so the lens reads as glass, not as an eye
            const sheen = new THREE.Mesh(
                new THREE.SphereGeometry(0.014, 8, 8),
                new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 })
            )
            sheen.scale.set(1.4, 0.6, 0.4)
            sheen.position.set(side * 0.2 - side * 0.06, 0.08, 0.065)
            glasses.add(sheen)
        }

        // Bridge
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.045), this.materials.goggleFrame)
        bridge.position.y = 0.02
        glasses.add(bridge)

        // Temple arms going back over the ears
        for(const side of [-1, 1])
        {
            const temple = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.026), this.materials.goggleFrame)
            temple.position.set(side * 0.43, 0.02, -0.16)
            temple.rotation.y = side * 1.25
            glasses.add(temple)
        }

        this.headGroup.add(glasses)
    }

    setEarsAndBlush()
    {
        for(const side of [-1, 1])
        {
            const ear = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), this.materials.skin)
            ear.scale.set(0.4, 0.65, 0.5)
            ear.position.set(side * 0.53, 0.27, 0.02)
            this.headGroup.add(ear)
        }

        // Soft blush on the cheeks
        for(const side of [-1, 1])
        {
            const blush = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), this.materials.blush)
            blush.scale.set(1, 0.55, 0.35)
            blush.position.set(side * 0.27, 0.14, 0.39)
            this.headGroup.add(blush)
        }
    }

    update()
    {
        const chair = this.world.topChair
        if(!chair)
            return

        const dt = Math.min(this.time.delta, 50) / 1000
        const elapsed = this.time.elapsed

        // The chair faces -x when its rotation is 0
        const chairYaw = chair.model.group.rotation.y

        // Body follows the chair through a spring: lags and slightly overshoots
        const yawStiffness = 60
        const yawDamping = 7
        this.physics.yawVelocity += (chairYaw - this.physics.yaw) * yawStiffness * dt
        this.physics.yawVelocity *= Math.exp(- yawDamping * dt)
        this.physics.yaw += this.physics.yawVelocity * dt

        this.group.rotation.y = this.physics.yaw - Math.PI * 0.5

        // Centrifugal lean: roll away from the rotation speed.
        // Kept small so the palms stay on the armrest pads.
        const rollTarget = THREE.MathUtils.clamp(- this.physics.yawVelocity * 0.25, -0.12, 0.12)
        this.physics.rollVelocity += (rollTarget - this.physics.roll) * 30 * dt
        this.physics.rollVelocity *= Math.exp(- 6 * dt)
        this.physics.roll += this.physics.rollVelocity * dt

        this.root.rotation.z = this.physics.roll
        this.root.rotation.x = 0.05 + Math.sin(elapsed * 0.0011) * 0.012

        // Rigid generated model: sway physics only, plus a gentle breath bob
        if(this.glbMode)
        {
            const breath = Math.sin(elapsed * 0.0021)
            this.glbHolder.scale.y = this.glbHolder.scale.x * (1 + breath * 0.006)
            return
        }

        // Head lags behind the body and looks around a little
        const headTarget = THREE.MathUtils.clamp((chairYaw - this.physics.yaw) * 1.4, -0.5, 0.5)
            + Math.sin(elapsed * 0.00037) * 0.12
        this.physics.headYawVelocity += (headTarget - this.physics.headYaw) * 40 * dt
        this.physics.headYawVelocity *= Math.exp(- 5.5 * dt)
        this.physics.headYaw += this.physics.headYawVelocity * dt

        this.headGroup.rotation.y = this.physics.headYaw
        this.headGroup.rotation.z = - this.physics.roll * 0.7
        this.headGroup.rotation.x = Math.sin(elapsed * 0.0009) * 0.04

        // Arms stay planted on the pads: only subtle elbow give
        const armTarget = THREE.MathUtils.clamp(- this.physics.yawVelocity * 0.12, -0.08, 0.08)
        this.physics.armSwingVelocity += (armTarget - this.physics.armSwing) * 35 * dt
        this.physics.armSwingVelocity *= Math.exp(- 5 * dt)
        this.physics.armSwing += this.physics.armSwingVelocity * dt

        const breath = Math.sin(elapsed * 0.0021)
        this.arms[-1].rotation.x = this.physics.armSwing + breath * 0.012
        this.arms[1].rotation.x = - this.physics.armSwing + breath * 0.012

        // Knees bob gently, feet stay planted
        this.legs[-1].rotation.x = Math.sin(elapsed * 0.0016) * 0.025
        this.legs[1].rotation.x = Math.sin(elapsed * 0.0016 + 1.3) * 0.025

        // Breathing
        this.torso.scale.y = 1.3 + breath * 0.015
    }
}
