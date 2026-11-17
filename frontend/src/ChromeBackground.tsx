
import { useEffect, useState } from 'react'
import LiquidChrome from './components/LiquidChrome'

export default function ChromeBackground() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const app = document.querySelector('.applyflow-app-shell')

    if (!app) return

    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )

    function updateVisibility() {
      const loggedIn = Boolean(
        app?.querySelector('.dashboard-page')
      )

      setVisible(loggedIn && !motionPreference.matches)
    }

    const observer = new MutationObserver(updateVisibility)

    observer.observe(app, {
      childList: true,
      subtree: true,
    })

    motionPreference.addEventListener(
      'change',
      updateVisibility
    )

    updateVisibility()

    return () => {
      observer.disconnect()

      motionPreference.removeEventListener(
        'change',
        updateVisibility
      )
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="applyflow-chrome-backdrop"
      aria-hidden="true"
    >
      <LiquidChrome
        color="#ffffff"
        speed={0.12}
        amplitude={0.24}
        frequencyX={3}
        frequencyY={3}
        detail={3}
        thickness={1}
        depth={1}
        roughness={0.35}
        exposure={0.9}
        interactive={true}
        rippleStrength={0.65}
        rippleSize={1}
        tilt={0.5}
        intro={true}
        lightMode={false}
        maxDevicePixelRatio={1.25}
      />
    </div>
  )
}
