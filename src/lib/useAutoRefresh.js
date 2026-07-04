import { useEffect, useRef } from 'react'

// Тихое авто-обновление: по таймеру и при возврате на вкладку.
// Чтобы окошки и заявки всегда были свежими без ручного обновления страницы.
export function useAutoRefresh(fn, ms = 30000) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const run = () => {
      if (!document.hidden) ref.current()
    }
    const id = setInterval(run, ms)
    document.addEventListener('visibilitychange', run)
    window.addEventListener('focus', run)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', run)
      window.removeEventListener('focus', run)
    }
  }, [ms])
}
