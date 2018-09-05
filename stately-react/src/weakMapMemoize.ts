export default function<T extends {}, U>(f: (param: T) => U) {
  const cache = new WeakMap<T, U>()
  return (param: T) => {
    if (!cache.has(param)) {
      cache.set(param, f(param))
    }
    return cache.get(param)!
  }
}
