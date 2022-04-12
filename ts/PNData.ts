import Vector from "./utils/Vector.js"

type PEId = string
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
    id: PEId
    elementType: PetriElementType
}

interface PlaceBasicData extends GenericPEBasicData {
    name: string
    placeType: PlaceType
    initialMark: string
}

interface TransBasicData extends GenericPEBasicData {
    name: string
    delay: string
    guard: string
}

interface ArcBasicData extends GenericPEBasicData {
    transId: string
    placeId: string
    arcType: ArcType
    weight: string
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
    weight: Vector
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
    viewBox: {
        x: number, 
        y: number, 
        width: number, 
        heigth: number, 
    }
    nextPlaceNumber: number
    nextTransNumber: number
}

export { PEId, PlaceType,
    GenericPEBasicData, PlaceBasicData, TransBasicData,
    ArcBasicData, PlaceData, TransData, ArcData, PetriNetBasicData,
    PetriNetData }