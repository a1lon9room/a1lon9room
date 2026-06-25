import * as THREE from 'three'

import Experience from './Experience.js'

// DVD-style bouncing "twitter @fourmemese" on the TV. Clicking it opens the
// profile; hovering shows a pointer cursor.
const TWITTER_URL = 'https://x.com/fourmemese'

export default class BouncingLogo
{
    constructor()
    {
        this.experience = new Experience()
        this.resources = this.experience.resources
        this.scene = this.experience.scene
        this.world = this.experience.world
        this.time = this.experience.time
        this.camera = this.experience.camera
        this.targetElement = this.experience.targetElement

        this.setModel()
        this.setAnimation()
        this.setInteraction()
    }

    createTexture()
    {
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 256

        const context = canvas.getContext('2d')
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.textAlign = 'center'
        context.textBaseline = 'middle'

        // "twitter" + handle, neon green to match the room (no logo mark)
        const green = '#4ade80'

        context.font = '900 78px Arial, sans-serif'
        context.shadowColor = green
        context.shadowBlur = 26
        context.fillStyle = '#ffffff'
        context.fillText('twitter', canvas.width * 0.5, canvas.height * 0.32)

        context.font = '900 122px Arial, sans-serif'
        context.fillStyle = green
        context.shadowBlur = 30
        context.fillText('@fourmemese', canvas.width * 0.5, canvas.height * 0.7)

        const texture = new THREE.CanvasTexture(canvas)
        texture.encoding = THREE.sRGBEncoding
        texture.anisotropy = 4

        return texture
    }

    setModel()
    {
        this.model = {}

        this.model.group = new THREE.Group()
        this.model.group.position.x = 4.2
        this.model.group.position.y = 2.717
        this.model.group.position.z = 1.630
        this.scene.add(this.model.group)

        this.model.texture = this.createTexture()

        this.model.geometry = new THREE.PlaneGeometry(4, 1, 1, 1)
        this.model.geometry.rotateY(- Math.PI * 0.5)

        this.model.material = new THREE.MeshBasicMaterial({
            transparent: true,
            map: this.model.texture
        })

        this.model.mesh = new THREE.Mesh(this.model.geometry, this.model.material)
        this.model.mesh.scale.y = 0.359
        this.model.mesh.scale.z = 0.424
        this.model.group.add(this.model.mesh)
    }

    setAnimation()
    {
        this.animations = {}

        this.animations.z = 0
        this.animations.y = 0

        this.animations.limits = {}
        this.animations.limits.z = { min: -1.076, max: 1.454 }
        this.animations.limits.y = { min: -1.055, max: 0.947 }

        this.animations.speed = {}
        this.animations.speed.z = 0.00061
        this.animations.speed.y = 0.00037
    }

    setInteraction()
    {
        this.raycaster = new THREE.Raycaster()
        this.pointer = new THREE.Vector2()

        const element = this.targetElement
        if(!element)
            return

        // Cast from the pointer through the camera onto the bouncing plane
        const intersects = (event) =>
        {
            const rect = element.getBoundingClientRect()
            this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            this.pointer.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1
            this.raycaster.setFromCamera(this.pointer, this.camera.instance)
            return this.raycaster.intersectObject(this.model.mesh, false).length > 0
        }

        // Hover → pointer cursor
        element.addEventListener('mousemove', (event) =>
        {
            element.style.cursor = intersects(event) ? 'pointer' : ''
        })

        // Distinguish a click from a camera drag
        let downX = 0
        let downY = 0
        element.addEventListener('mousedown', (event) =>
        {
            downX = event.clientX
            downY = event.clientY
        })
        element.addEventListener('mouseup', (event) =>
        {
            const moved = Math.hypot(event.clientX - downX, event.clientY - downY)
            if(moved < 6 && intersects(event))
                window.open(TWITTER_URL, '_blank', 'noopener')
        })
    }

    update()
    {
        this.animations.z += this.animations.speed.z * this.time.delta
        this.animations.y += this.animations.speed.y * this.time.delta

        if(this.animations.z > this.animations.limits.z.max)
        {
            this.animations.z = this.animations.limits.z.max
            this.animations.speed.z *= -1
        }
        if(this.animations.z < this.animations.limits.z.min)
        {
            this.animations.z = this.animations.limits.z.min
            this.animations.speed.z *= -1
        }
        if(this.animations.y > this.animations.limits.y.max)
        {
            this.animations.y = this.animations.limits.y.max
            this.animations.speed.y *= -1
        }
        if(this.animations.y < this.animations.limits.y.min)
        {
            this.animations.y = this.animations.limits.y.min
            this.animations.speed.y *= -1
        }

        this.model.mesh.position.z = this.animations.z
        this.model.mesh.position.y = this.animations.y
    }
}
