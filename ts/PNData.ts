import Vector from "./utils/Vector.js"

type PlaceType = "INT" | "BOOL"
type ArcType = "Input" | "Output" | "Test" | "Inhibitor"
type InputType = "INT" | "BOOL"
type PetriElementType = "place" | "trans" | "arc"

interface Input {
    name: string
    type: InputType
    initialValue: string
    description: string
}

interface GenericPEBasicData {
    id: string
    elementType: PetriElementType
}

interface PlaceBasicData extends GenericPEBasicData {
    name: string
    placeType: PlaceType
    initialMark: string
}

interface TransBasicData extends GenericPEBasicData {
    name: string
    delay: number
    guard: string
}

interface ArcBasicData extends GenericPEBasicData {
    arcType: ArcType
    weigth: string
}

interface PlaceTextsPosition {
    name: Vector
    placeType: Vector
}

interface TransTextsPosition {
    name: Vector
    delay: Vector
    guard: Vector
}

interface ArcTextPosition {
    weigth: Vector
}

interface PlaceData extends PlaceBasicData {
    position: Vector
    textsPosition: PlaceTextsPosition
}

interface TransData extends TransBasicData {
    position: Vector
    textsPosition: TransTextsPosition
}

interface ArcData extends ArcBasicData {
    position: Vector
    textsPosition: ArcTextPosition
}

interface PetriNetBasicData {
    name: string
    preScript: string

    places: PlaceBasicData[]
    transitions: TransBasicData[]
    arcs: ArcBasicData[]
    inputs: Input[]
}

interface PetriNetData extends PetriNetBasicData {
    places: PlaceData[]
    transitions: TransData[]
    arcs: ArcData[]

    grid: boolean
    nextPlaceNumber: number
    nextTransNumber: number
}
