import { createContext } from "react";
import { ThreeDObject } from "../WorldLogic/WorldState";

const defaultContext: [ThreeDObject[], React.Dispatch<React.SetStateAction<ThreeDObject[]>>] = [
    [],
    () => {
        return []
    }
]

export default createContext(defaultContext)