import * as React from "react";
import { Monoid } from "fp-ts/lib/Monoid";

export const monoidJSX: Monoid<JSX.Element> = {
    empty: <></>,
    concat(a,b){
        return (<>{a}{b}</>)
    }
}