import './style.css'
import * as THREE from 'three'
import Experience from './Experience/Experience.js'

window.THREE = THREE

window.experience = new Experience({
    targetElement: document.querySelector('.experience')
})

