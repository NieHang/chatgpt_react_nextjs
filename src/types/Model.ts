export interface IntelligenceType {
  name: string
  type?: string
}

export interface Model {
  name: string
  model: string
  alias: string
  intelligenceTypes?: IntelligenceType[]
}
