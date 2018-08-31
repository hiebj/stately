type Omit<T, K> = Pick<T, Exclude<keyof T, K>>
type Subtract<T, K> = Omit<T, keyof K>
type Renderable = ReturnType<React.Component['render']>
type SFCRenderable = ReturnType<React.SFC>
