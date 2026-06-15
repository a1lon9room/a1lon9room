import * as THREE from 'three'
import Experience from './Experience.js'
import Baked from './Baked.js'
import GoogleLeds from './GoogleLeds.js'
import LoupedeckButtons from './LoupedeckButtons.js'
import CoffeeSteam from './CoffeeSteam.js'
import TopChair from './TopChair.js'
import Doll from './Doll.js'
import ElgatoLight from './ElgatoLight.js'
import PumpScreens from './PumpScreens.js'
import PumpDecor from './PumpDecor.js'
import BouncingLogo from './BouncingLogo.js'
import Voice from './Voice.js'

export default class World
{
    constructor(_options)
    {
        this.experience = new Experience()
        this.config = this.experience.config
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        
        this.resources.on('groupEnd', (_group) =>
        {
            if(_group.name === 'base')
            {
                this.setBaked()
                this.setGoogleLeds()
                this.setLoupedeckButtons()
                this.setCoffeeSteam()
                this.setTopChair()
                this.setDoll()
                this.setElgatoLight()
                this.setScreens()
                this.setPumpDecor()
                this.setBouncingLogo()
                this.setVoice()
            }
        })
    }

    setBaked()
    {
        this.baked = new Baked()
    }

    setGoogleLeds()
    {
        this.googleLeds = new GoogleLeds()
    }

    setLoupedeckButtons()
    {
        this.loupedeckButtons = new LoupedeckButtons()
    }

    setCoffeeSteam()
    {
        this.coffeeSteam = new CoffeeSteam()
    }

    setTopChair()
    {
        this.topChair = new TopChair()
    }

    setDoll()
    {
        this.doll = new Doll()
    }

    setElgatoLight()
    {
        this.elgatoLight = new ElgatoLight()
    }

    setScreens()
    {
        this.pumpScreens = new PumpScreens()
    }

    setPumpDecor()
    {
        this.pumpDecor = new PumpDecor()
    }

    setBouncingLogo()
    {
        this.bouncingLogo = new BouncingLogo()
    }

    setVoice()
    {
        this.voice = new Voice()
    }

    resize()
    {
    }

    update()
    {
        if(this.googleLeds)
            this.googleLeds.update()

        if(this.loupedeckButtons)
            this.loupedeckButtons.update()

        if(this.coffeeSteam)
            this.coffeeSteam.update()

        if(this.topChair)
            this.topChair.update()

        if(this.doll)
            this.doll.update()

        if(this.pumpScreens)
            this.pumpScreens.update()

        if(this.pumpDecor)
            this.pumpDecor.update()

        if(this.bouncingLogo)
            this.bouncingLogo.update()
    }

    destroy()
    {
    }
}