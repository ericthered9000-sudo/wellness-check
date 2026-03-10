import { useState, useEffect } from 'react'
import './AdBanner.css'

interface AdBannerProps {
  isPremium?: boolean
  onRemoveAds?: () => void
}

export function AdBanner({ isPremium = false, onRemoveAds }: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [countdown, setCountdown] = useState(3)

  // For demo: show a "dismiss after 3 seconds" option
  useEffect(() => {
    if (countdown > 0 && isVisible) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown, isVisible])

  // Don't show anything for premium users
  if (isPremium) {
    return null
  }

  if (!isVisible) {
    return null
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-b-2 border-slate-300 dark:border-slate-600 z-ad-banner overflow-hidden"
      role="complementary" 
      aria-label="Advertisement"
    >
      <div className="flex items-center justify-between px-3 py-2 min-h-[50px] max-w-app mx-auto w-full">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded flex-shrink-0">
            AD
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex-1 max-w-[250px] min-w-0 overflow-hidden">
            <span className="text-base flex-shrink-0" aria-hidden="true">📢</span>
            <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis">
              Your Ad Here - Google AdMob Banner
            </span>
          </div>
        </div>
        {countdown > 0 ? (
          <span className="text-sm text-slate-500 dark:text-slate-400 px-3 py-2 min-h-11 flex items-center" aria-live="polite">
            Dismiss in {countdown}s
          </span>
        ) : (
          <button 
            className="bg-transparent border-none text-slate-500 dark:text-slate-400 cursor-pointer p-2 rounded-xl text-lg min-h-11 min-w-11 flex items-center justify-center transition-all duration-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:outline-[3px] focus-visible:outline-primary focus-visible:outline-offset-2"
            onClick={() => setIsVisible(false)}
            aria-label="Dismiss advertisement"
            type="button"
          >
            ✕
          </button>
        )}
      </div>
      <div className="px-3 py-2 bg-blue-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
        <button 
          className="w-full py-2.5 px-4 bg-gradient-to-br from-indigo-600 to-indigo-500 text-white border-none rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 min-h-11 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(79,70,229,0.3)] focus-visible:outline-[3px] focus-visible:outline-indigo-500 focus-visible:outline-offset-2"
          onClick={onRemoveAds}
          type="button"
        >
          Remove Ads - $2.99/mo
        </button>
      </div>
    </div>
  )
}