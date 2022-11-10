type PEId = string
type PlaceType = "INT" | "BOOL"
type ArcType = "Input" | "Output" | "Test" | "Inhibitor"
type InputType = "INT" | "BOOL"
type PetriElementType = "place" | "trans" | "arc"
type SimMode = "Automation" | "Classic" | "VisObj"
type PriorityMode = "random" | "fixed"
type InputValues = { [inputName: string]: number}

interface SimConfig {
    simMode: SimMode
    arcDebug: boolean
    guardDebug: boolean
    priorityMode: PriorityMode
}

interface IVector {
    x: number,
    y: number
}

interface IViewBox {
    x: number, 
    y: number, 
    width: number, 
    heigth: number
}

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
    priority: string
}

interface ArcBasicData extends GenericPEBasicData {
    transId: string
    placeId: string
    arcType: ArcType
    weight: string
}

interface PlaceTextsPosition {
    name: IVector
    placeType: IVector
}

interface TransTextsPosition {
    name: IVector
    delay: IVector
    guard: IVector
}

interface ArcTextsPosition {
    weight: IVector
}

interface PlaceData extends PlaceBasicData {
    position: IVector
    textsPosition: PlaceTextsPosition
}

interface TransData extends TransBasicData {
    position: IVector
    textsPosition: TransTextsPosition
}

interface ArcData extends ArcBasicData {
    textsPosition: ArcTextsPosition
    corners: IVector[]
}

interface PetriNetBasicData {
    name: string
    preScript: string

    places: PlaceBasicData[]
    transitions: TransBasicData[]
    arcs: ArcBasicData[]
    inputs: Input[]
}

interface PetriNetData {
    name: string
    preScript: string

    places: PlaceData[]
    transitions: TransData[]
    arcs: ArcData[]
    inputs: Input[]

    grid: boolean
    viewBox: IViewBox
    nextPlaceNumber: number
    nextTransNumber: number
    simConfig: SimConfig
}

export { PEId, Input, InputValues, PlaceType, ArcType, PetriElementType, InputType,
    GenericPEBasicData, PlaceBasicData, TransBasicData,
    ArcBasicData, PlaceData, TransData, ArcData, PetriNetBasicData,
    PetriNetData, SimMode, PriorityMode, SimConfig }